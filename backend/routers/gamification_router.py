import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session
from database import get_db
from models import *
from auth import get_current_user

router = APIRouter(prefix="/api/gamification", tags=["gamification"])


@router.get("/badges")
def list_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    badges = db.query(Badge).all()
    return [
        {
            "id": b.id,
            "name": b.name,
            "description": b.description,
            "criteria": b.criteria,
            "icon": b.icon,
        }
        for b in badges
    ]


@router.get("/student/{student_id}/badges")
def get_student_badges(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    earned = (
        db.query(StudentBadge, Badge)
        .join(Badge, StudentBadge.badge_id == Badge.id)
        .filter(StudentBadge.student_id == student_id)
        .order_by(StudentBadge.earned_at.desc())
        .all()
    )
    return [
        {
            "id": sb.id,
            "badge": {
                "id": badge.id,
                "name": badge.name,
                "description": badge.description,
                "icon": badge.icon,
            },
            "earned_at": str(sb.earned_at),
        }
        for sb, badge in earned
    ]


@router.get("/student/{student_id}/streak")
def get_student_streak(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    streak = db.query(ReadingStreak).filter(ReadingStreak.student_id == student_id).first()
    if not streak:
        return {
            "student_id": student_id,
            "current_streak": 0,
            "longest_streak": 0,
            "last_activity_date": None,
        }

    return {
        "student_id": student_id,
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "last_activity_date": streak.last_activity_date,
    }


@router.get("/student/{student_id}/profile")
def get_student_profile(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    earned = (
        db.query(StudentBadge, Badge)
        .join(Badge, StudentBadge.badge_id == Badge.id)
        .filter(StudentBadge.student_id == student_id)
        .order_by(StudentBadge.earned_at.desc())
        .all()
    )
    badges = [
        {
            "id": badge.id,
            "name": badge.name,
            "description": badge.description,
            "icon": badge.icon,
            "earned_at": str(sb.earned_at),
        }
        for sb, badge in earned
    ]

    streak = db.query(ReadingStreak).filter(ReadingStreak.student_id == student_id).first()
    streak_data = {
        "current_streak": streak.current_streak if streak else 0,
        "longest_streak": streak.longest_streak if streak else 0,
        "last_activity_date": streak.last_activity_date if streak else None,
    }

    total_assessments = (
        db.query(func.count(TestSession.id))
        .filter(TestSession.student_id == student_id, TestSession.is_complete == True)
        .scalar()
    )

    latest_session = (
        db.query(TestSession)
        .filter(TestSession.student_id == student_id, TestSession.is_complete == True)
        .order_by(TestSession.completed_at.desc())
        .first()
    )

    latest_scores = []
    if latest_session:
        scores = db.query(Score).filter(Score.test_session_id == latest_session.id).all()
        latest_scores = [
            {
                "target": s.target,
                "sub_target": s.sub_target,
                "raw_score": s.raw_score,
                "risk_level": s.risk_level,
            }
            for s in scores
        ]

    return {
        "student_id": student_id,
        "name": f"{student.first_name} {student.last_name}",
        "grade": student.grade,
        "badges": badges,
        "streak": streak_data,
        "assessment_stats": {
            "total_assessments": total_assessments,
            "latest_scores": latest_scores,
        },
    }


BADGE_CRITERIA = {
    "first_assessment": lambda db, sid: (
        db.query(func.count(TestSession.id))
        .filter(TestSession.student_id == sid, TestSession.is_complete == True)
        .scalar()
        >= 1
    ),
    "five_assessments": lambda db, sid: (
        db.query(func.count(TestSession.id))
        .filter(TestSession.student_id == sid, TestSession.is_complete == True)
        .scalar()
        >= 5
    ),
    "risk_reducer": lambda db, sid: _check_risk_reducer(db, sid),
    "perfect_score": lambda db, sid: (
        db.query(Score)
        .join(TestSession, Score.test_session_id == TestSession.id)
        .filter(
            TestSession.student_id == sid,
            Score.raw_score == Score.max_score,
            Score.max_score.isnot(None),
            Score.max_score > 0,
        )
        .first()
        is not None
    ),
    "streak_7": lambda db, sid: (
        (db.query(ReadingStreak).filter(ReadingStreak.student_id == sid).first() or ReadingStreak(current_streak=0)).current_streak >= 7
    ),
}


def _check_risk_reducer(db: Session, student_id: int) -> bool:
    sessions = (
        db.query(TestSession)
        .filter(TestSession.student_id == student_id, TestSession.is_complete == True)
        .order_by(TestSession.completed_at.asc())
        .all()
    )
    if len(sessions) < 2:
        return False

    first_scores = db.query(Score).filter(Score.test_session_id == sessions[0].id).all()
    last_scores = db.query(Score).filter(Score.test_session_id == sessions[-1].id).all()

    first_had_high = any(s.risk_level == "high" for s in first_scores)
    last_at_benchmark = any(s.risk_level in ("benchmark", "advanced") for s in last_scores)

    return first_had_high and last_at_benchmark


@router.post("/student/{student_id}/check-badges")
def check_and_award_badges(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    all_badges = db.query(Badge).all()
    already_earned = {
        sb.badge_id
        for sb in db.query(StudentBadge).filter(StudentBadge.student_id == student_id).all()
    }

    newly_awarded = []
    for badge in all_badges:
        if badge.id in already_earned:
            continue

        checker = BADGE_CRITERIA.get(badge.criteria)
        if checker and checker(db, student_id):
            sb = StudentBadge(
                student_id=student_id,
                badge_id=badge.id,
                earned_at=datetime.datetime.utcnow(),
            )
            db.add(sb)
            newly_awarded.append({
                "badge_id": badge.id,
                "name": badge.name,
                "description": badge.description,
                "icon": badge.icon,
            })

    db.commit()
    return {"newly_awarded": newly_awarded, "total_new": len(newly_awarded)}
