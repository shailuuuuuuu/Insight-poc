import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import *
from auth import get_current_user

router = APIRouter(prefix="/api/pathways", tags=["pathways"])

TARGET_SKILL_MAP = {
    "NLM_RETELL": "comprehension",
    "NLM_QUESTIONS": "comprehension",
    "NLM_RETELL_READING": "comprehension",
    "NLM_QUESTIONS_READING": "comprehension",
    "DECODING_FLUENCY": "fluency",
    "PHONEME_SEGMENTING": "phonemic_awareness",
    "PHONEME_BLENDING": "phonemic_awareness",
    "PHONEME_DELETION": "phonemic_awareness",
    "LETTER_NAMES": "phonics",
    "LETTER_SOUNDS": "phonics",
    "LETTER_WORD_ID": "phonics",
    "SIGHT_WORDS": "fluency",
    "VOCABULARY": "vocabulary",
}

GRADE_ORDER = ["K", "1", "2", "3", "4", "5", "6", "7", "8"]


def _grade_in_range(grade: str, grade_min: str, grade_max: str) -> bool:
    try:
        idx = GRADE_ORDER.index(grade)
        return GRADE_ORDER.index(grade_min) <= idx <= GRADE_ORDER.index(grade_max)
    except ValueError:
        return True


@router.post("/generate/{student_id}")
def generate_pathway(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    latest_session = (
        db.query(TestSession)
        .filter(TestSession.student_id == student_id, TestSession.is_complete == True)
        .order_by(TestSession.completed_at.desc())
        .first()
    )
    if not latest_session:
        raise HTTPException(404, "No completed assessments found for this student")

    scores = (
        db.query(Score)
        .filter(
            Score.test_session_id == latest_session.id,
            Score.risk_level.in_(["moderate", "high"]),
        )
        .all()
    )

    if not scores:
        raise HTTPException(400, "Student has no moderate/high risk scores — no pathway needed")

    needed_skills = set()
    for s in scores:
        skill = TARGET_SKILL_MAP.get(s.target)
        if skill:
            needed_skills.add(skill)

    if not needed_skills:
        raise HTTPException(400, "No mappable skill areas found for at-risk targets")

    matched_interventions = (
        db.query(Intervention)
        .filter(Intervention.skill_area.in_(needed_skills))
        .all()
    )
    matched_interventions = [
        i for i in matched_interventions if _grade_in_range(student.grade, i.grade_min, i.grade_max)
    ]

    if not matched_interventions:
        raise HTTPException(404, "No matching interventions found in the library")

    pathway = StudentPathway(student_id=student_id, status="active")
    db.add(pathway)
    db.flush()

    activities = []
    for idx, intervention in enumerate(matched_interventions):
        activity = PathwayActivity(
            pathway_id=pathway.id,
            intervention_id=intervention.id,
            order=idx,
            status="pending",
        )
        db.add(activity)
        activities.append(activity)

    db.commit()
    db.refresh(pathway)

    return {
        "id": pathway.id,
        "student_id": pathway.student_id,
        "status": pathway.status,
        "created_at": str(pathway.created_at),
        "activities": [
            {
                "id": a.id,
                "intervention_id": a.intervention_id,
                "order": a.order,
                "status": a.status,
            }
            for a in activities
        ],
    }


@router.get("/student/{student_id}")
def get_student_pathway(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pathway = (
        db.query(StudentPathway)
        .filter(StudentPathway.student_id == student_id, StudentPathway.status == "active")
        .order_by(StudentPathway.created_at.desc())
        .first()
    )
    if not pathway:
        raise HTTPException(404, "No active pathway found for this student")

    activities = (
        db.query(PathwayActivity, Intervention)
        .join(Intervention, PathwayActivity.intervention_id == Intervention.id)
        .filter(PathwayActivity.pathway_id == pathway.id)
        .order_by(PathwayActivity.order)
        .all()
    )

    return {
        "id": pathway.id,
        "student_id": pathway.student_id,
        "status": pathway.status,
        "created_at": str(pathway.created_at),
        "activities": [
            {
                "id": act.id,
                "order": act.order,
                "status": act.status,
                "completed_at": str(act.completed_at) if act.completed_at else None,
                "intervention": {
                    "id": interv.id,
                    "title": interv.title,
                    "description": interv.description,
                    "skill_area": interv.skill_area,
                    "duration_minutes": interv.duration_minutes,
                    "evidence_level": interv.evidence_level,
                },
            }
            for act, interv in activities
        ],
    }


@router.put("/activities/{activity_id}/complete")
def complete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = db.query(PathwayActivity).filter(PathwayActivity.id == activity_id).first()
    if not activity:
        raise HTTPException(404, "Activity not found")

    activity.status = "completed"
    activity.completed_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(activity)

    return {
        "id": activity.id,
        "status": activity.status,
        "completed_at": str(activity.completed_at),
    }


@router.delete("/{pathway_id}")
def delete_pathway(
    pathway_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pathway = db.query(StudentPathway).filter(StudentPathway.id == pathway_id).first()
    if not pathway:
        raise HTTPException(404, "Pathway not found")

    db.query(PathwayActivity).filter(PathwayActivity.pathway_id == pathway_id).delete()
    db.delete(pathway)
    db.commit()
    return {"deleted": True}
