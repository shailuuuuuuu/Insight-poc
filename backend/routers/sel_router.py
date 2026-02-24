from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import *
from auth import get_current_user

router = APIRouter(prefix="/api/sel", tags=["sel"])


class SELScreeningCreate(BaseModel):
    student_id: int
    date: str
    self_awareness: float
    self_management: float
    social_awareness: float
    relationship_skills: float
    decision_making: float


def _compute_risk(total_score: float) -> str:
    if total_score >= 4:
        return "low"
    if total_score >= 2.5:
        return "moderate"
    return "high"


@router.post("/screenings")
def create_sel_screening(
    payload: SELScreeningCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    total_score = round(
        (payload.self_awareness + payload.self_management + payload.social_awareness
         + payload.relationship_skills + payload.decision_making) / 5, 2
    )

    screening = SELScreening(
        student_id=payload.student_id,
        screener_id=current_user.id,
        date=payload.date,
        self_awareness=payload.self_awareness,
        self_management=payload.self_management,
        social_awareness=payload.social_awareness,
        relationship_skills=payload.relationship_skills,
        decision_making=payload.decision_making,
        total_score=total_score,
        risk_level=_compute_risk(total_score),
    )
    db.add(screening)
    db.commit()
    db.refresh(screening)

    return {
        "id": screening.id,
        "student_id": screening.student_id,
        "date": screening.date,
        "self_awareness": screening.self_awareness,
        "self_management": screening.self_management,
        "social_awareness": screening.social_awareness,
        "relationship_skills": screening.relationship_skills,
        "decision_making": screening.decision_making,
        "total_score": screening.total_score,
        "risk_level": screening.risk_level,
    }


@router.get("/student/{student_id}")
def get_student_sel_screenings(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    screenings = (
        db.query(SELScreening)
        .filter(SELScreening.student_id == student_id)
        .order_by(SELScreening.date.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "student_id": s.student_id,
            "date": s.date,
            "self_awareness": s.self_awareness,
            "self_management": s.self_management,
            "social_awareness": s.social_awareness,
            "relationship_skills": s.relationship_skills,
            "decision_making": s.decision_making,
            "total_score": s.total_score,
            "risk_level": s.risk_level,
        }
        for s in screenings
    ]


@router.get("/class-summary")
def class_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_student_ids = [s.id for s in current_user.my_students]
    if not my_student_ids:
        return {"averages": {}, "risk_distribution": {}, "students": []}

    latest_per_student = {}
    screenings = (
        db.query(SELScreening)
        .filter(SELScreening.student_id.in_(my_student_ids))
        .order_by(SELScreening.date.desc())
        .all()
    )
    for s in screenings:
        if s.student_id not in latest_per_student:
            latest_per_student[s.student_id] = s

    if not latest_per_student:
        return {"averages": {}, "risk_distribution": {}, "students": []}

    competencies = [
        "self_awareness", "self_management", "social_awareness",
        "relationship_skills", "decision_making",
    ]
    totals = {c: 0.0 for c in competencies}
    risk_counts = {"low": 0, "moderate": 0, "high": 0}
    student_data = []
    count = len(latest_per_student)

    for student_id, screening in latest_per_student.items():
        for c in competencies:
            totals[c] += getattr(screening, c)
        risk_counts[screening.risk_level] = risk_counts.get(screening.risk_level, 0) + 1

        student = db.query(Student).filter(Student.id == student_id).first()
        student_data.append({
            "student_id": student_id,
            "student_name": f"{student.last_name}, {student.first_name}" if student else str(student_id),
            "total_score": screening.total_score,
            "risk_level": screening.risk_level,
            "date": screening.date,
        })

    averages = {c: round(totals[c] / count, 2) for c in competencies}

    return {
        "averages": averages,
        "risk_distribution": risk_counts,
        "students": student_data,
    }


@router.get("/correlation")
def sel_literacy_correlation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_student_ids = [s.id for s in current_user.my_students]
    if not my_student_ids:
        return []

    results = []
    for student_id in my_student_ids:
        sel = (
            db.query(SELScreening)
            .filter(SELScreening.student_id == student_id)
            .order_by(SELScreening.date.desc())
            .first()
        )
        if not sel:
            continue

        latest_session = (
            db.query(TestSession)
            .filter(TestSession.student_id == student_id, TestSession.is_complete == True)
            .order_by(TestSession.created_at.desc())
            .first()
        )

        literacy_risk = "none"
        latest_score = None
        if latest_session:
            scores = latest_session.scores
            high_count = sum(1 for sc in scores if sc.risk_level == "high")
            mod_count = sum(1 for sc in scores if sc.risk_level == "moderate")
            if high_count > 0:
                literacy_risk = "high"
            elif mod_count > 0:
                literacy_risk = "moderate"
            else:
                literacy_risk = "benchmark"
            first_score = scores[0] if scores else None
            latest_score = first_score.raw_score if first_score else None

        results.append({
            "student_id": student_id,
            "literacy_risk": literacy_risk,
            "sel_risk": sel.risk_level,
            "sel_total": sel.total_score,
            "latest_score": latest_score,
        })

    return results
