from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import *
from auth import get_current_user

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

_watchlist: set[int] = set()

TOY_ORDER = {"BOY": 0, "MOY": 1, "EOY": 2}


def _get_trajectory(sessions: list) -> dict:
    """Return score trajectory across BOY→MOY→EOY for the latest academic year.
    Only considers main target scores (not sub_targets)."""
    if not sessions:
        return {}

    latest_year = max(s.academic_year for s in sessions)
    year_sessions = [s for s in sessions if s.academic_year == latest_year]
    year_sessions.sort(key=lambda s: TOY_ORDER.get(s.time_of_year, 99))

    trajectory = {}
    for session in year_sessions:
        for score in session.scores:
            if score.sub_target is not None:
                continue
            key = f"{session.subtest}_{score.target}"
            if key not in trajectory:
                trajectory[key] = []
            trajectory[key].append({
                "time_of_year": session.time_of_year,
                "raw_score": score.raw_score,
                "risk_level": score.risk_level,
            })
    return trajectory


def _overall_risk(sessions: list) -> str:
    """Determine current overall risk using majority rule from most recent session."""
    if not sessions:
        return "unknown"
    latest = max(sessions, key=lambda s: s.created_at)
    risks = [sc.risk_level for sc in latest.scores if sc.risk_level and sc.sub_target is None]
    if not risks:
        return "unknown"
    from collections import Counter
    counts = Counter(risks)
    if counts.get("high", 0) >= len(risks) * 0.5:
        return "high"
    if counts.get("high", 0) + counts.get("moderate", 0) >= len(risks) * 0.5:
        return "moderate"
    return "benchmark"


def _is_declining(trajectory: dict) -> tuple[bool, list[str]]:
    """Check if scores are declining significantly (>=20% drop or risk escalation)."""
    declining = False
    factors = []
    for key, points in trajectory.items():
        if len(points) < 2:
            if points and points[-1]["risk_level"] == "high":
                factors.append(f"High risk on {key.replace('_', ' ')}")
            continue
        recent = points[-1]["raw_score"]
        previous = points[-2]["raw_score"]
        if recent is not None and previous is not None and previous > 0:
            drop_pct = (previous - recent) / previous
            if drop_pct >= 0.20:
                declining = True
                factors.append(f"Declining {key.replace('_', ' ')} scores")
        risk_escalation = (
            points[-2]["risk_level"] in ("benchmark", "moderate")
            and points[-1]["risk_level"] == "high"
        )
        if risk_escalation:
            declining = True
            factors.append(f"Risk escalated to high on {key.replace('_', ' ')}")
    return declining, factors


def _latest_scores_dict(sessions: list) -> dict:
    if not sessions:
        return {}
    latest = max(sessions, key=lambda s: s.created_at)
    return {
        f"{latest.subtest}_{sc.target}": {
            "raw_score": sc.raw_score,
            "risk_level": sc.risk_level,
        }
        for sc in latest.scores
        if sc.sub_target is None
    }


@router.get("/at-risk")
def get_at_risk_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_students = current_user.my_students
    if not my_students:
        return []

    results = []
    for student in my_students:
        sessions = (
            db.query(TestSession)
            .filter(TestSession.student_id == student.id, TestSession.is_complete == True)
            .all()
        )

        if not sessions:
            results.append({
                "student_id": student.id,
                "student_name": f"{student.last_name}, {student.first_name}",
                "grade": student.grade,
                "school": student.school,
                "probability": "medium",
                "contributing_factors": ["No recent assessment"],
                "current_risk": "unknown",
                "latest_scores": {},
            })
            continue

        trajectory = _get_trajectory(sessions)
        current_risk = _overall_risk(sessions)
        declining, factors = _is_declining(trajectory)

        if not declining:
            continue

        if current_risk in ("moderate", "high"):
            probability = "high"
        elif current_risk == "benchmark":
            probability = "medium"
        else:
            probability = "low"

        results.append({
            "student_id": student.id,
            "student_name": f"{student.last_name}, {student.first_name}",
            "grade": student.grade,
            "school": student.school,
            "probability": probability,
            "contributing_factors": factors,
            "current_risk": current_risk,
            "latest_scores": _latest_scores_dict(sessions),
        })

    results.sort(key=lambda r: {"high": 0, "medium": 1, "low": 2}.get(r["probability"], 3))
    return results


@router.post("/{student_id}/watchlist")
def toggle_watchlist(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    if student_id in _watchlist:
        _watchlist.discard(student_id)
        return {"student_id": student_id, "on_watchlist": False}

    _watchlist.add(student_id)
    return {"student_id": student_id, "on_watchlist": True}
