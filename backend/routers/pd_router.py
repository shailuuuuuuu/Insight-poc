import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import *

router = APIRouter(prefix="/api/pd", tags=["pd"])


def _course_to_dict(course, module_count: int, progress_pct: float):
    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "duration_hours": course.duration_hours,
        "module_count": module_count,
        "progress_pct": progress_pct,
    }


@router.get("/courses")
def list_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    courses = db.query(PDCourse).order_by(PDCourse.title).all()

    results = []
    for course in courses:
        modules = db.query(PDModule).filter(PDModule.course_id == course.id).all()
        module_ids = [m.id for m in modules]
        completed = (
            db.query(PDProgress)
            .filter(
                PDProgress.user_id == current_user.id,
                PDProgress.module_id.in_(module_ids),
                PDProgress.completed == True,
            )
            .count()
            if module_ids
            else 0
        )
        pct = round(completed / len(modules) * 100, 1) if modules else 0
        results.append(_course_to_dict(course, len(modules), pct))
    return results


@router.get("/my-progress")
def my_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    all_courses = db.query(PDCourse).all()
    total_modules = db.query(PDModule).count()
    completed_modules = (
        db.query(PDProgress)
        .filter(PDProgress.user_id == current_user.id, PDProgress.completed == True)
        .count()
    )

    courses_completed = 0
    for course in all_courses:
        modules = db.query(PDModule).filter(PDModule.course_id == course.id).all()
        if not modules:
            continue
        module_ids = [m.id for m in modules]
        done = (
            db.query(PDProgress)
            .filter(
                PDProgress.user_id == current_user.id,
                PDProgress.module_id.in_(module_ids),
                PDProgress.completed == True,
            )
            .count()
        )
        if done == len(modules):
            courses_completed += 1

    return {
        "courses_completed": courses_completed,
        "total_courses": len(all_courses),
        "modules_completed": completed_modules,
        "total_modules": total_modules,
        "completion_pct": round(completed_modules / total_modules * 100, 1) if total_modules else 0,
    }


@router.get("/certificate/{course_id}")
def get_certificate(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(PDCourse).filter(PDCourse.id == course_id).first()
    if not course:
        raise HTTPException(404, "Course not found")

    modules = db.query(PDModule).filter(PDModule.course_id == course_id).all()
    if not modules:
        raise HTTPException(400, "Course has no modules")

    module_ids = [m.id for m in modules]
    completed = (
        db.query(PDProgress)
        .filter(
            PDProgress.user_id == current_user.id,
            PDProgress.module_id.in_(module_ids),
            PDProgress.completed == True,
        )
        .count()
    )

    if completed < len(modules):
        raise HTTPException(400, "Course not yet completed — finish all modules first")

    progress_records = (
        db.query(PDProgress)
        .filter(
            PDProgress.user_id == current_user.id,
            PDProgress.module_id.in_(module_ids),
            PDProgress.completed == True,
        )
        .all()
    )
    scores = [p.score for p in progress_records if p.score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else None
    latest_completion = max(
        (p.completed_at for p in progress_records if p.completed_at), default=None
    )

    return {
        "course_id": course.id,
        "course_title": course.title,
        "user_name": f"{current_user.first_name} {current_user.last_name}",
        "completed_at": latest_completion.isoformat() if latest_completion else None,
        "average_score": avg_score,
        "modules_completed": len(modules),
    }


@router.get("/courses/{id}")
def get_course(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(PDCourse).filter(PDCourse.id == id).first()
    if not course:
        raise HTTPException(404, "Course not found")

    modules = (
        db.query(PDModule)
        .filter(PDModule.course_id == id)
        .order_by(PDModule.order)
        .all()
    )

    module_list = []
    for m in modules:
        progress = (
            db.query(PDProgress)
            .filter(PDProgress.user_id == current_user.id, PDProgress.module_id == m.id)
            .first()
        )
        module_list.append({
            "id": m.id,
            "title": m.title,
            "content": m.content,
            "quiz_json": m.quiz_json,
            "order": m.order,
            "completed": progress.completed if progress else False,
            "score": progress.score if progress else None,
            "completed_at": progress.completed_at.isoformat() if progress and progress.completed_at else None,
        })

    completed_count = sum(1 for m in module_list if m["completed"])
    pct = round(completed_count / len(modules) * 100, 1) if modules else 0

    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "duration_hours": course.duration_hours,
        "modules": module_list,
        "progress_pct": pct,
    }


@router.post("/modules/{id}/complete")
def complete_module(
    id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    module = db.query(PDModule).filter(PDModule.id == id).first()
    if not module:
        raise HTTPException(404, "Module not found")

    progress = (
        db.query(PDProgress)
        .filter(PDProgress.user_id == current_user.id, PDProgress.module_id == id)
        .first()
    )

    if progress:
        progress.completed = True
        progress.score = payload.get("score")
        progress.completed_at = datetime.datetime.utcnow()
    else:
        progress = PDProgress(
            user_id=current_user.id,
            module_id=id,
            completed=True,
            score=payload.get("score"),
            completed_at=datetime.datetime.utcnow(),
        )
        db.add(progress)

    db.commit()
    db.refresh(progress)
    return {
        "id": progress.id,
        "module_id": progress.module_id,
        "completed": progress.completed,
        "score": progress.score,
        "completed_at": progress.completed_at.isoformat() if progress.completed_at else None,
    }
