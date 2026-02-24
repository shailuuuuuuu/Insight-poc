import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from auth import get_current_user
from models import *

router = APIRouter(prefix="/api/mtss", tags=["mtss"])

TIER_MAP = {
    "benchmark": 1,
    "advanced": 1,
    "moderate": 2,
    "high": 3,
}


def _latest_scores_for_org(db: Session, org_id: int):
    """Return a dict mapping student_id -> list of (subtest, target, risk_level)
    from the most recent completed test session per student+subtest."""
    from sqlalchemy import and_

    latest_session_subq = (
        db.query(
            TestSession.student_id,
            TestSession.subtest,
            func.max(TestSession.completed_at).label("max_completed"),
        )
        .join(Student, Student.id == TestSession.student_id)
        .filter(
            Student.organization_id == org_id,
            TestSession.is_complete == True,
        )
        .group_by(TestSession.student_id, TestSession.subtest)
        .subquery()
    )

    rows = (
        db.query(
            TestSession.student_id,
            TestSession.subtest,
            Score.target,
            Score.risk_level,
        )
        .join(Score, Score.test_session_id == TestSession.id)
        .join(
            latest_session_subq,
            and_(
                TestSession.student_id == latest_session_subq.c.student_id,
                TestSession.subtest == latest_session_subq.c.subtest,
                TestSession.completed_at == latest_session_subq.c.max_completed,
            ),
        )
        .filter(Score.risk_level.isnot(None))
        .all()
    )

    student_scores: dict = {}
    for student_id, subtest, target, risk_level in rows:
        student_scores.setdefault(student_id, []).append(
            {"subtest": subtest, "target": target, "risk_level": risk_level}
        )
    return student_scores


def _compute_tier(risk_levels: list[str]) -> int:
    """Worst-case tier across all subtests for a student."""
    worst = 1
    for rl in risk_levels:
        tier = TIER_MAP.get(rl, 1)
        if tier > worst:
            worst = tier
    return worst


@router.get("/tier-summary")
def tier_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student_scores = _latest_scores_for_org(db, current_user.organization_id)

    counts = {1: 0, 2: 0, 3: 0}
    for sid, scores in student_scores.items():
        tier = _compute_tier([s["risk_level"] for s in scores])
        counts[tier] += 1

    total = sum(counts.values())
    def pct(n): return round(n / total * 100, 1) if total else 0

    return {
        "tier1": {"count": counts[1], "pct": pct(counts[1])},
        "tier2": {"count": counts[2], "pct": pct(counts[2])},
        "tier3": {"count": counts[3], "pct": pct(counts[3])},
        "total": total,
    }


@router.get("/tier-students")
def tier_students(
    tier: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student_scores = _latest_scores_for_org(db, current_user.organization_id)
    student_ids = list(student_scores.keys())
    students = db.query(Student).filter(Student.id.in_(student_ids)).all() if student_ids else []
    student_map = {s.id: s for s in students}

    results = []
    for sid, scores in student_scores.items():
        s = student_map.get(sid)
        if not s:
            continue
        risk_levels = [sc["risk_level"] for sc in scores]
        student_tier = _compute_tier(risk_levels)
        if tier is not None and student_tier != tier:
            continue
        results.append({
            "student_id": s.id,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "grade": s.grade,
            "school": s.school,
            "tier": student_tier,
            "risk_levels": scores,
        })
    return results


@router.get("/tier-history/{student_id}")
def tier_history(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    sessions = (
        db.query(TestSession)
        .filter(TestSession.student_id == student_id, TestSession.is_complete == True)
        .order_by(TestSession.academic_year, TestSession.time_of_year)
        .all()
    )

    # Group by assessment window (academic_year + time_of_year)
    windows: dict = {}
    for sess in sessions:
        key = f"{sess.academic_year} {sess.time_of_year}"
        risk_levels = windows.setdefault(key, [])
        for score in sess.scores:
            if score.risk_level:
                risk_levels.append(score.risk_level)

    toy_order = {"BOY": 0, "MOY": 1, "EOY": 2}
    history = []
    for period, risk_levels in sorted(
        windows.items(), key=lambda x: (x[0].split()[0], toy_order.get(x[0].split()[-1], 9))
    ):
        history.append({"period": period, "tier": _compute_tier(risk_levels)})

    return history


@router.post("/intervention-log")
def create_intervention_log(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    required = ["student_id", "date", "duration_minutes", "intervention_type"]
    for field in required:
        if field not in payload:
            raise HTTPException(422, f"Missing required field: {field}")

    student = db.query(Student).filter(Student.id == payload["student_id"]).first()
    if not student:
        raise HTTPException(404, "Student not found")

    log = InterventionLog(
        student_id=payload["student_id"],
        user_id=current_user.id,
        date=payload["date"],
        duration_minutes=payload["duration_minutes"],
        intervention_type=payload["intervention_type"],
        fidelity_score=payload.get("fidelity_score"),
        notes=payload.get("notes"),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {
        "id": log.id,
        "student_id": log.student_id,
        "date": log.date,
        "duration_minutes": log.duration_minutes,
        "intervention_type": log.intervention_type,
        "fidelity_score": log.fidelity_score,
        "notes": log.notes,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


@router.get("/intervention-logs/{student_id}")
def list_intervention_logs(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    logs = (
        db.query(InterventionLog)
        .filter(InterventionLog.student_id == student_id)
        .order_by(InterventionLog.date.desc())
        .all()
    )
    return [
        {
            "id": log.id,
            "student_id": log.student_id,
            "user_id": log.user_id,
            "date": log.date,
            "duration_minutes": log.duration_minutes,
            "intervention_type": log.intervention_type,
            "fidelity_score": log.fidelity_score,
            "notes": log.notes,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
