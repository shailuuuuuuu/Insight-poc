from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import *
from auth import get_current_user

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class AskRequest(BaseModel):
    query: str


AVAILABLE_QUERIES = (
    "I can help you with:\n"
    "• \"Which students need help with [skill]?\" — find students at high risk on a skill area\n"
    "• \"Group students by [risk/grade/school]\" — view students grouped by category\n"
    "• \"Progress for [student name]\" — see a student's test history and risk levels\n"
    "• \"What to focus on\" — see your top 5 highest-risk students\n"
)

SKILL_TARGET_MAP = {
    "fluency": ["DECODING_FLUENCY", "FLUENCY"],
    "decoding": ["DECODING_FLUENCY", "DDM_DECODING"],
    "phonics": ["DDM_PHONICS", "DDM_PA"],
    "phonemic awareness": ["DDM_PA"],
    "comprehension": ["NLM_QUESTIONS", "NLM_QUESTIONS_READING"],
    "retell": ["NLM_RETELL", "NLM_RETELL_READING"],
    "vocabulary": ["VOCABULARY"],
    "reading": ["NLM_RETELL_READING", "NLM_QUESTIONS_READING"],
    "listening": ["NLM_RETELL", "NLM_QUESTIONS"],
}


def _parse_intent(query: str) -> tuple[str, str | None]:
    q = query.lower().strip()

    if "which students need" in q or "who needs" in q:
        for skill in SKILL_TARGET_MAP:
            if skill in q:
                return "students_need_skill", skill
        return "students_need_skill", None

    if "group" in q and "by" in q:
        if "risk" in q:
            return "group_by", "risk"
        if "grade" in q:
            return "group_by", "grade"
        if "school" in q:
            return "group_by", "school"
        return "group_by", None

    if "progress for" in q or "progress of" in q:
        for prefix in ("progress for ", "progress of "):
            if prefix in q:
                name = q.split(prefix, 1)[1].strip().rstrip("?. ")
                return "student_progress", name
        return "student_progress", None

    if "focus" in q or "priority" in q or "top" in q:
        return "focus", None

    return "default", None


def _handle_students_need_skill(skill: str | None, my_student_ids: list[int], db: Session) -> dict:
    if not skill or skill not in SKILL_TARGET_MAP:
        return {
            "intent": "students_need_skill",
            "response_type": "text",
            "data": [],
            "message": f"I couldn't identify the skill. Try: {', '.join(SKILL_TARGET_MAP.keys())}",
        }

    targets = SKILL_TARGET_MAP[skill]

    high_risk_students = {}
    sessions = (
        db.query(TestSession)
        .filter(TestSession.student_id.in_(my_student_ids), TestSession.is_complete == True)
        .all()
    )
    for session in sessions:
        for score in session.scores:
            if score.target in targets and score.risk_level == "high":
                student = session.student
                if student.id not in high_risk_students:
                    high_risk_students[student.id] = {
                        "student_id": student.id,
                        "student_name": f"{student.last_name}, {student.first_name}",
                        "grade": student.grade,
                        "school": student.school,
                        "risk_areas": [],
                    }
                high_risk_students[student.id]["risk_areas"].append(
                    f"{score.target} ({score.raw_score})"
                )

    data = list(high_risk_students.values())
    return {
        "intent": "students_need_skill",
        "response_type": "table",
        "data": data,
        "message": f"Found {len(data)} student(s) needing help with {skill}.",
    }


def _handle_group_by(group_key: str | None, my_student_ids: list[int], db: Session) -> dict:
    students = db.query(Student).filter(Student.id.in_(my_student_ids)).all()

    if group_key == "grade":
        groups: dict[str, list] = {}
        for s in students:
            groups.setdefault(s.grade, []).append({
                "student_id": s.id,
                "student_name": f"{s.last_name}, {s.first_name}",
            })
        return {
            "intent": "group_by",
            "response_type": "cards",
            "data": [{"group": k, "students": v, "count": len(v)} for k, v in sorted(groups.items())],
            "message": f"Students grouped by grade ({len(groups)} groups).",
        }

    if group_key == "school":
        groups = {}
        for s in students:
            school = s.school or "Unassigned"
            groups.setdefault(school, []).append({
                "student_id": s.id,
                "student_name": f"{s.last_name}, {s.first_name}",
                "grade": s.grade,
            })
        return {
            "intent": "group_by",
            "response_type": "cards",
            "data": [{"group": k, "students": v, "count": len(v)} for k, v in sorted(groups.items())],
            "message": f"Students grouped by school ({len(groups)} groups).",
        }

    if group_key == "risk":
        risk_groups: dict[str, list] = {"high": [], "moderate": [], "benchmark": []}
        for s in students:
            latest = (
                db.query(TestSession)
                .filter(TestSession.student_id == s.id, TestSession.is_complete == True)
                .order_by(TestSession.created_at.desc())
                .first()
            )
            if not latest:
                continue
            risks = [sc.risk_level for sc in latest.scores if sc.risk_level]
            if "high" in risks:
                level = "high"
            elif "moderate" in risks:
                level = "moderate"
            else:
                level = "benchmark"
            risk_groups[level].append({
                "student_id": s.id,
                "student_name": f"{s.last_name}, {s.first_name}",
                "grade": s.grade,
            })
        return {
            "intent": "group_by",
            "response_type": "cards",
            "data": [
                {"group": level, "students": members, "count": len(members)}
                for level, members in risk_groups.items()
            ],
            "message": "Students grouped by risk level.",
        }

    return {
        "intent": "group_by",
        "response_type": "text",
        "data": [],
        "message": "Please specify a grouping: risk, grade, or school.",
    }


def _handle_student_progress(name_query: str | None, my_student_ids: list[int], db: Session) -> dict:
    if not name_query:
        return {
            "intent": "student_progress",
            "response_type": "text",
            "data": [],
            "message": "Please specify a student name, e.g. 'progress for Maria Garcia'.",
        }

    parts = name_query.lower().split()
    q = db.query(Student).filter(Student.id.in_(my_student_ids))
    candidates = []
    for student in q.all():
        full = f"{student.first_name} {student.last_name}".lower()
        if all(p in full for p in parts):
            candidates.append(student)

    if not candidates:
        return {
            "intent": "student_progress",
            "response_type": "text",
            "data": [],
            "message": f"No student found matching '{name_query}'.",
        }

    student = candidates[0]
    sessions = (
        db.query(TestSession)
        .filter(TestSession.student_id == student.id, TestSession.is_complete == True)
        .order_by(TestSession.created_at.asc())
        .all()
    )

    history = []
    for session in sessions:
        for score in session.scores:
            history.append({
                "academic_year": session.academic_year,
                "time_of_year": session.time_of_year,
                "subtest": session.subtest,
                "target": score.target,
                "raw_score": score.raw_score,
                "risk_level": score.risk_level,
            })

    return {
        "intent": "student_progress",
        "response_type": "table",
        "data": history,
        "message": f"Progress for {student.first_name} {student.last_name} ({len(sessions)} sessions).",
    }


def _handle_focus(my_student_ids: list[int], db: Session) -> dict:
    student_risk: list[tuple] = []
    students = db.query(Student).filter(Student.id.in_(my_student_ids)).all()

    for s in students:
        latest = (
            db.query(TestSession)
            .filter(TestSession.student_id == s.id, TestSession.is_complete == True)
            .order_by(TestSession.created_at.desc())
            .first()
        )
        if not latest:
            continue
        risk_areas = [
            sc.target for sc in latest.scores if sc.risk_level == "high"
        ]
        if risk_areas:
            student_risk.append((s, risk_areas))

    student_risk.sort(key=lambda x: -len(x[1]))
    top_5 = student_risk[:5]

    data = [
        {
            "student_id": s.id,
            "student_name": f"{s.last_name}, {s.first_name}",
            "grade": s.grade,
            "school": s.school,
            "high_risk_areas": areas,
        }
        for s, areas in top_5
    ]
    return {
        "intent": "focus",
        "response_type": "cards",
        "data": data,
        "message": f"Top {len(data)} students that need the most attention.",
    }


@router.post("/ask")
def ask_assistant(
    payload: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_student_ids = [s.id for s in current_user.my_students]

    if not my_student_ids:
        return {
            "intent": "default",
            "response_type": "text",
            "data": [],
            "message": "You don't have any students assigned yet. Add students first.",
        }

    intent, param = _parse_intent(payload.query)

    if intent == "students_need_skill":
        return _handle_students_need_skill(param, my_student_ids, db)
    if intent == "group_by":
        return _handle_group_by(param, my_student_ids, db)
    if intent == "student_progress":
        return _handle_student_progress(param, my_student_ids, db)
    if intent == "focus":
        return _handle_focus(my_student_ids, db)

    return {
        "intent": "default",
        "response_type": "text",
        "data": [],
        "message": AVAILABLE_QUERIES,
    }
