import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, distinct, case
from sqlalchemy.orm import Session
from database import get_db
from models import *
from auth import get_current_user

router = APIRouter(prefix="/api/executive", tags=["executive"])


@router.get("/scorecard")
def get_scorecard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(400, "User has no organization")

    total_students = (
        db.query(func.count(Student.id))
        .filter(Student.organization_id == org_id, Student.status == "active")
        .scalar()
    )

    current_year = str(datetime.datetime.utcnow().year)
    academic_year = f"{int(current_year) - 1}-{current_year}"

    tested_subq = (
        db.query(distinct(TestSession.student_id))
        .join(Student, TestSession.student_id == Student.id)
        .filter(
            Student.organization_id == org_id,
            TestSession.is_complete == True,
            TestSession.academic_year == academic_year,
        )
        .subquery()
    )
    tested_count = db.query(func.count()).select_from(tested_subq).scalar()

    risk_scores = (
        db.query(Score.risk_level, func.count(distinct(TestSession.student_id)))
        .join(TestSession, Score.test_session_id == TestSession.id)
        .join(Student, TestSession.student_id == Student.id)
        .filter(
            Student.organization_id == org_id,
            TestSession.is_complete == True,
            TestSession.academic_year == academic_year,
            Score.risk_level.isnot(None),
        )
        .group_by(Score.risk_level)
        .all()
    )

    risk_map = {level: count for level, count in risk_scores}
    benchmark_plus = risk_map.get("benchmark", 0) + risk_map.get("advanced", 0)
    scored_total = sum(risk_map.values()) or 1
    proficiency_rate = round(benchmark_plus / scored_total * 100, 1)

    improved_count = (
        db.query(func.count(distinct(TestSession.student_id)))
        .join(Student, TestSession.student_id == Student.id)
        .filter(
            Student.organization_id == org_id,
            TestSession.is_complete == True,
            TestSession.academic_year == academic_year,
        )
        .scalar()
    )

    completion_rate = round(tested_count / max(total_students, 1) * 100, 1)

    tier1 = risk_map.get("benchmark", 0) + risk_map.get("advanced", 0)
    tier2 = risk_map.get("moderate", 0)
    tier3 = risk_map.get("high", 0)

    return {
        "total_students": total_students,
        "tested_count": tested_count,
        "proficiency_rate": proficiency_rate,
        "avg_growth": improved_count,
        "completion_rate": completion_rate,
        "tier_distribution": {
            "tier1": tier1,
            "tier2": tier2,
            "tier3": tier3,
        },
    }


@router.get("/school-comparison")
def get_school_comparison(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(400, "User has no organization")

    current_year = str(datetime.datetime.utcnow().year)
    academic_year = f"{int(current_year) - 1}-{current_year}"

    schools = (
        db.query(Student.school)
        .filter(Student.organization_id == org_id, Student.status == "active", Student.school.isnot(None))
        .distinct()
        .all()
    )

    results = []
    for (school_name,) in schools:
        student_count = (
            db.query(func.count(Student.id))
            .filter(Student.organization_id == org_id, Student.school == school_name, Student.status == "active")
            .scalar()
        )

        school_student_ids = (
            db.query(Student.id)
            .filter(Student.organization_id == org_id, Student.school == school_name, Student.status == "active")
            .subquery()
        )

        risk_scores = (
            db.query(Score.risk_level, func.count(distinct(TestSession.student_id)))
            .join(TestSession, Score.test_session_id == TestSession.id)
            .filter(
                TestSession.student_id.in_(db.query(school_student_ids)),
                TestSession.is_complete == True,
                TestSession.academic_year == academic_year,
                Score.risk_level.isnot(None),
            )
            .group_by(Score.risk_level)
            .all()
        )

        risk_map = {level: count for level, count in risk_scores}
        scored_total = sum(risk_map.values()) or 1
        benchmark_plus = risk_map.get("benchmark", 0) + risk_map.get("advanced", 0)
        at_risk = risk_map.get("moderate", 0) + risk_map.get("high", 0)

        proficiency_rate = round(benchmark_plus / scored_total * 100, 1)
        avg_risk_pct = round(at_risk / scored_total * 100, 1)

        tested = (
            db.query(func.count(distinct(TestSession.student_id)))
            .filter(
                TestSession.student_id.in_(db.query(school_student_ids)),
                TestSession.is_complete == True,
                TestSession.academic_year == academic_year,
            )
            .scalar()
        )
        completion_rate = round(tested / max(student_count, 1) * 100, 1)

        results.append({
            "school": school_name,
            "student_count": student_count,
            "proficiency_rate": proficiency_rate,
            "avg_risk_pct": avg_risk_pct,
            "completion_rate": completion_rate,
        })

    results.sort(key=lambda x: x["proficiency_rate"], reverse=True)
    return results
