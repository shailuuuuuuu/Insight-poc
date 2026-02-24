from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import *
from auth import get_current_user

router = APIRouter(prefix="/api/parent", tags=["parent"])

TOY_ORDER = {"BOY": 0, "MOY": 1, "EOY": 2}

ACTIVITIES_BY_GRADE = {
    "K": [
        {"title": "Alphabet Treasure Hunt", "description": "Find objects around the house that start with each letter of the alphabet.", "duration": "15 min"},
        {"title": "Rhyme Time", "description": "Take turns saying words that rhyme. Start with simple words like 'cat' or 'dog'.", "duration": "10 min"},
        {"title": "Story Retell", "description": "Read a short picture book together, then ask your child to retell the story in their own words.", "duration": "20 min"},
        {"title": "Name Writing Practice", "description": "Practice writing first name using different materials — crayons, finger paint, sand.", "duration": "10 min"},
        {"title": "Sound Sorting", "description": "Collect small objects and sort them by their beginning sounds.", "duration": "15 min"},
    ],
    "1": [
        {"title": "Sight Word Bingo", "description": "Create bingo cards with common sight words and play together.", "duration": "20 min"},
        {"title": "Read Aloud & Discuss", "description": "Read a chapter book together (a few pages each night) and discuss what happened.", "duration": "15 min"},
        {"title": "Word Family Flip Book", "description": "Make a flip book with word families (-at, -an, -ig) and practice reading them.", "duration": "15 min"},
        {"title": "Journal Writing", "description": "Have your child write 2-3 sentences about their day using inventive spelling.", "duration": "10 min"},
        {"title": "Grocery List Reading", "description": "Let your child help read the grocery list while shopping.", "duration": "15 min"},
    ],
    "2": [
        {"title": "Partner Reading", "description": "Take turns reading pages aloud from a grade-level book.", "duration": "20 min"},
        {"title": "Vocabulary Notebook", "description": "When encountering new words, write them in a notebook with a definition and drawing.", "duration": "10 min"},
        {"title": "Story Sequencing", "description": "After reading, have your child draw or write the beginning, middle, and end.", "duration": "15 min"},
        {"title": "Read the Recipe", "description": "Cook a simple recipe together and have your child read the steps aloud.", "duration": "30 min"},
        {"title": "Library Visit", "description": "Visit the library weekly and let your child choose books at their level.", "duration": "30 min"},
    ],
    "3": [
        {"title": "Chapter Book Club", "description": "Read the same book and discuss characters, plot, and predictions.", "duration": "20 min"},
        {"title": "Summarize the Article", "description": "Read a kid-friendly news article and write a 3-sentence summary.", "duration": "15 min"},
        {"title": "Fluency Timing", "description": "Practice reading a passage aloud for 1 minute. Re-read to improve speed and expression.", "duration": "10 min"},
        {"title": "Dictionary Detective", "description": "Look up 3 new words per week and use them in sentences.", "duration": "10 min"},
        {"title": "Write a Letter", "description": "Write a letter to a family member or friend about something they learned.", "duration": "20 min"},
    ],
}

DEFAULT_ACTIVITIES = [
    {"title": "Daily Reading", "description": "Read together for at least 20 minutes every day.", "duration": "20 min"},
    {"title": "Word of the Day", "description": "Learn a new vocabulary word each day and use it in conversation.", "duration": "5 min"},
    {"title": "Reading Log", "description": "Keep a log of books read and write a one-sentence review for each.", "duration": "10 min"},
    {"title": "Discussion Time", "description": "After reading, ask: Who? What? Where? When? Why? How?", "duration": "10 min"},
    {"title": "Write a Story", "description": "Write a short creative story using this week's vocabulary words.", "duration": "20 min"},
]


def _verify_parent_access(current_user: User, student_id: int, db: Session) -> Student:
    if current_user.role != "parent":
        raise HTTPException(403, "Parent access required")

    linked = (
        db.execute(
            parent_students.select().where(
                parent_students.c.user_id == current_user.id,
                parent_students.c.student_id == student_id,
            )
        ).first()
    )
    if not linked:
        raise HTTPException(403, "You are not linked to this student")

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    return student


@router.get("/my-children")
def get_my_children(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "parent":
        raise HTTPException(403, "Parent access required")

    rows = db.execute(
        parent_students.select().where(parent_students.c.user_id == current_user.id)
    ).fetchall()

    child_ids = [r.student_id for r in rows]
    if not child_ids:
        return []

    students = db.query(Student).filter(Student.id.in_(child_ids)).all()
    return [
        {
            "id": s.id,
            "student_id": s.id,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "grade": s.grade,
            "school": s.school,
        }
        for s in students
    ]


@router.get("/child/{student_id}/progress")
def get_child_progress(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = _verify_parent_access(current_user, student_id, db)

    sessions = (
        db.query(TestSession)
        .filter(TestSession.student_id == student_id, TestSession.is_complete == True)
        .order_by(TestSession.created_at.desc())
        .all()
    )

    current_risks = {}
    recent_scores = []
    if sessions:
        latest = sessions[0]
        for sc in latest.scores:
            current_risks[sc.target] = sc.risk_level
            recent_scores.append({
                "target": sc.target,
                "raw_score": sc.raw_score,
                "risk_level": sc.risk_level,
            })

    trend = "stable"
    if len(sessions) >= 2:
        latest_scores = {sc.target: sc.raw_score for sc in sessions[0].scores}
        previous_scores = {sc.target: sc.raw_score for sc in sessions[1].scores}
        common = set(latest_scores) & set(previous_scores)
        if common:
            improving = sum(
                1 for t in common
                if latest_scores[t] is not None and previous_scores[t] is not None
                and latest_scores[t] > previous_scores[t]
            )
            declining = sum(
                1 for t in common
                if latest_scores[t] is not None and previous_scores[t] is not None
                and latest_scores[t] < previous_scores[t]
            )
            if improving > declining:
                trend = "improving"
            elif declining > improving:
                trend = "declining"

    celebrations = []
    if trend == "improving":
        celebrations.append(f"{student.first_name} is making great progress! Keep up the good work!")
    if current_risks and all(r in ("benchmark", "advanced") for r in current_risks.values()):
        celebrations.append(f"{student.first_name} is meeting all benchmarks — fantastic!")
    if not celebrations:
        celebrations.append(f"Every step counts! {student.first_name} is on their learning journey.")

    return {
        "student_id": student.id,
        "student_name": f"{student.first_name} {student.last_name}",
        "grade": student.grade,
        "current_risks": current_risks,
        "trend": trend,
        "recent_scores": recent_scores,
        "celebrations": celebrations,
    }


@router.get("/child/{student_id}/activities")
def get_child_activities(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = _verify_parent_access(current_user, student_id, db)
    activities = ACTIVITIES_BY_GRADE.get(student.grade, DEFAULT_ACTIVITIES)

    return {
        "student_id": student.id,
        "student_name": f"{student.first_name} {student.last_name}",
        "grade": student.grade,
        "activities": activities,
    }
