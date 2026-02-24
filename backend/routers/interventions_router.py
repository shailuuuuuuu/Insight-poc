from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from auth import get_current_user
from models import *

router = APIRouter(prefix="/api/interventions", tags=["interventions"])


@router.get("/")
def list_interventions(
    skill_area: Optional[str] = Query(None),
    grade: Optional[str] = Query(None),
    evidence_level: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Intervention)
    if skill_area:
        q = q.filter(Intervention.skill_area == skill_area)
    if evidence_level:
        q = q.filter(Intervention.evidence_level == evidence_level)
    if grade:
        q = q.filter(Intervention.grade_min <= grade, Intervention.grade_max >= grade)
    if search:
        q = q.filter(Intervention.title.ilike(f"%{search}%"))

    interventions = q.order_by(Intervention.title).all()
    return [
        {
            "id": i.id,
            "title": i.title,
            "description": i.description,
            "skill_area": i.skill_area,
            "grade_min": i.grade_min,
            "grade_max": i.grade_max,
            "duration_minutes": i.duration_minutes,
            "materials": i.materials,
            "evidence_level": i.evidence_level,
            "instructions": i.instructions,
        }
        for i in interventions
    ]


@router.get("/{id}")
def get_intervention(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    intervention = db.query(Intervention).filter(Intervention.id == id).first()
    if not intervention:
        raise HTTPException(404, "Intervention not found")
    return {
        "id": intervention.id,
        "title": intervention.title,
        "description": intervention.description,
        "skill_area": intervention.skill_area,
        "grade_min": intervention.grade_min,
        "grade_max": intervention.grade_max,
        "duration_minutes": intervention.duration_minutes,
        "materials": intervention.materials,
        "evidence_level": intervention.evidence_level,
        "instructions": intervention.instructions,
    }


@router.post("/assign")
def assign_intervention(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    intervention_id = payload.get("intervention_id")
    student_id = payload.get("student_id")
    if not intervention_id or not student_id:
        raise HTTPException(422, "intervention_id and student_id are required")

    intervention = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not intervention:
        raise HTTPException(404, "Intervention not found")

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    assignment = InterventionAssignment(
        intervention_id=intervention_id,
        student_id=student_id,
        assigned_by=current_user.id,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {
        "id": assignment.id,
        "intervention_id": assignment.intervention_id,
        "student_id": assignment.student_id,
        "assigned_by": assignment.assigned_by,
        "status": assignment.status,
        "created_at": assignment.created_at.isoformat() if assignment.created_at else None,
    }


@router.get("/assignments/{student_id}")
def list_assignments(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    assignments = (
        db.query(InterventionAssignment)
        .filter(InterventionAssignment.student_id == student_id)
        .order_by(InterventionAssignment.created_at.desc())
        .all()
    )

    results = []
    for a in assignments:
        intervention = db.query(Intervention).filter(Intervention.id == a.intervention_id).first()
        results.append({
            "id": a.id,
            "intervention_id": a.intervention_id,
            "intervention_title": intervention.title if intervention else None,
            "student_id": a.student_id,
            "assigned_by": a.assigned_by,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })
    return results


@router.put("/assignments/{id}/status")
def update_assignment_status(
    id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    status = payload.get("status")
    valid_statuses = ("assigned", "in_progress", "completed")
    if status not in valid_statuses:
        raise HTTPException(422, f"status must be one of: {', '.join(valid_statuses)}")

    assignment = db.query(InterventionAssignment).filter(InterventionAssignment.id == id).first()
    if not assignment:
        raise HTTPException(404, "Assignment not found")

    assignment.status = status
    db.commit()
    db.refresh(assignment)
    return {
        "id": assignment.id,
        "intervention_id": assignment.intervention_id,
        "student_id": assignment.student_id,
        "status": assignment.status,
    }
