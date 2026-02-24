import csv
import io
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import User, Student, TestSession, Score
from schemas import RiskSummary, StudentRiskRow
from auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/risk-summary")
def risk_summary(
    academic_year: Optional[str] = None,
    time_of_year: Optional[str] = None,
    grade: Optional[str] = None,
    school: Optional[str] = None,
    group_id: Optional[int] = None,
    examiner_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from models import Group

    my_student_ids = [s.id for s in current_user.my_students]
    if not my_student_ids:
        return []

    if group_id:
        group = db.query(Group).filter(Group.id == group_id, Group.owner_id == current_user.id).first()
        if group:
            group_student_ids = set(s.id for s in group.students)
            my_student_ids = [sid for sid in my_student_ids if sid in group_student_ids]

    if school:
        school_students = db.query(Student).filter(Student.id.in_(my_student_ids), Student.school == school).all()
        my_student_ids = [s.id for s in school_students]
        if not my_student_ids:
            return []

    q = (
        db.query(Score, TestSession)
        .join(TestSession, Score.test_session_id == TestSession.id)
        .filter(
            TestSession.student_id.in_(my_student_ids),
            TestSession.is_complete == True,
        )
    )
    if academic_year:
        q = q.filter(TestSession.academic_year == academic_year)
    if time_of_year:
        q = q.filter(TestSession.time_of_year == time_of_year)
    if grade:
        q = q.filter(TestSession.grade_at_test == grade)
    if examiner_id:
        q = q.filter(TestSession.examiner_id == examiner_id)

    # Build per-student, per-subtest risk: keep the latest score per student
    # so counts match unique students (consistent with student_risk_table)
    student_risks = {}  # { student_id: { subtest_key: risk_level } }
    for score, session in q.all():
        key = f"{session.subtest}_{score.target}"
        student_id = session.student_id
        if student_id not in student_risks:
            student_risks[student_id] = {}
        student_risks[student_id][key] = score.risk_level

    # Aggregate unique students per subtest per risk level
    subtests = {}
    for student_id, risks in student_risks.items():
        for key, risk_level in risks.items():
            if key not in subtests:
                subtests[key] = {"total": 0, "benchmark": 0, "moderate": 0, "high": 0}
            subtests[key]["total"] += 1
            if risk_level in ("benchmark", "advanced"):
                subtests[key]["benchmark"] += 1
            elif risk_level == "moderate":
                subtests[key]["moderate"] += 1
            elif risk_level == "high":
                subtests[key]["high"] += 1

    results = []
    for subtest, counts in subtests.items():
        total = counts["total"]
        if total == 0:
            continue
        results.append(RiskSummary(
            subtest=subtest,
            total_students=total,
            low_risk=counts["benchmark"],
            moderate_risk=counts["moderate"],
            high_risk=counts["high"],
            low_risk_pct=round(counts["benchmark"] / total * 100, 1),
            moderate_risk_pct=round(counts["moderate"] / total * 100, 1),
            high_risk_pct=round(counts["high"] / total * 100, 1),
        ))
    return results


@router.get("/student-risk-table")
def student_risk_table(
    academic_year: Optional[str] = None,
    time_of_year: Optional[str] = None,
    grade: Optional[str] = None,
    school: Optional[str] = None,
    group_id: Optional[int] = None,
    risk_filter: Optional[str] = None,
    examiner_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from models import Group

    my_student_ids = [s.id for s in current_user.my_students]
    if not my_student_ids:
        return []

    if group_id:
        group = db.query(Group).filter(Group.id == group_id, Group.owner_id == current_user.id).first()
        if group:
            group_student_ids = set(s.id for s in group.students)
            my_student_ids = [sid for sid in my_student_ids if sid in group_student_ids]

    students = db.query(Student).filter(Student.id.in_(my_student_ids))
    if grade:
        students = students.filter(Student.grade == grade)
    if school:
        students = students.filter(Student.school == school)
    students = students.order_by(Student.last_name).all()

    rows = []
    for student in students:
        q = (
            db.query(Score, TestSession)
            .join(TestSession, Score.test_session_id == TestSession.id)
            .filter(TestSession.student_id == student.id, TestSession.is_complete == True)
        )
        if academic_year:
            q = q.filter(TestSession.academic_year == academic_year)
        if time_of_year:
            q = q.filter(TestSession.time_of_year == time_of_year)
        if examiner_id:
            q = q.filter(TestSession.examiner_id == examiner_id)

        risk_data = {}
        for score, session in q.all():
            key = f"{session.subtest}_{score.target}"
            risk_data[key] = score.risk_level

        row = {
            "student_id": student.id,
            "student_name": f"{student.last_name}, {student.first_name}",
            "grade": student.grade,
            "risks": risk_data,
        }

        if risk_filter:
            parts = risk_filter.split(":")
            if len(parts) == 2:
                filter_subtest, filter_level = parts
                if risk_data.get(filter_subtest) != filter_level:
                    continue

        rows.append(row)

    return rows


@router.get("/export/{report_type}")
def export_report(
    report_type: str,
    academic_year: Optional[str] = None,
    time_of_year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_student_ids = [s.id for s in current_user.my_students]
    if not my_student_ids:
        return StreamingResponse(io.StringIO("No data"), media_type="text/csv")

    output = io.StringIO()
    writer = csv.writer(output)

    sessions_q = (
        db.query(TestSession)
        .filter(TestSession.student_id.in_(my_student_ids), TestSession.is_complete == True)
    )
    if academic_year:
        sessions_q = sessions_q.filter(TestSession.academic_year == academic_year)
    if time_of_year:
        sessions_q = sessions_q.filter(TestSession.time_of_year == time_of_year)
    sessions = sessions_q.all()

    if report_type == "benchmark":
        writer.writerow(["Student Name", "Grade", "Subtest", "Target", "Score", "Risk Level"])
        for session in sessions:
            student = session.student
            for score in session.scores:
                if score.risk_level:
                    writer.writerow([
                        f"{student.last_name}, {student.first_name}",
                        session.grade_at_test, session.subtest, score.target,
                        score.raw_score, score.risk_level,
                    ])
    elif report_type == "detailed":
        writer.writerow(["Student Name", "Grade", "Subtest", "Target", "Sub-Target", "Score", "Max Score", "Risk Level"])
        for session in sessions:
            student = session.student
            for score in session.scores:
                writer.writerow([
                    f"{student.last_name}, {student.first_name}",
                    session.grade_at_test, session.subtest, score.target,
                    score.sub_target, score.raw_score, score.max_score, score.risk_level,
                ])
    elif report_type == "summary":
        writer.writerow(["Student Name", "Grade", "Subtest", "Target", "Score", "Max Score"])
        for session in sessions:
            student = session.student
            for score in session.scores:
                writer.writerow([
                    f"{student.last_name}, {student.first_name}",
                    session.grade_at_test, session.subtest, score.target,
                    score.raw_score, score.max_score,
                ])
    elif report_type == "risk_by_grade":
        writer.writerow(["Grade", "School", "Subtest_Target", "Total", "Benchmark", "Moderate", "High Risk",
                          "Benchmark %", "Moderate %", "High Risk %"])
        # Build per-student latest risk, then aggregate by grade/school
        student_latest = {}  # { (student_id, grade, school, subtest_target): risk_level }
        for session in sessions:
            student = session.student
            for score in session.scores:
                sk = (student.id, session.grade_at_test, student.school or "Unknown", f"{session.subtest}_{score.target}")
                student_latest[sk] = score.risk_level
        agg = {}
        for (_, grade, school_name, subtest_target), risk_level in student_latest.items():
            key = (grade, school_name, subtest_target)
            if key not in agg:
                agg[key] = {"total": 0, "bm": 0, "mod": 0, "high": 0}
            agg[key]["total"] += 1
            if risk_level in ("benchmark", "advanced"):
                agg[key]["bm"] += 1
            elif risk_level == "moderate":
                agg[key]["mod"] += 1
            elif risk_level == "high":
                agg[key]["high"] += 1
        for (grade, school_name, subtest_target), counts in sorted(agg.items()):
            t = counts["total"]
            if t == 0:
                continue
            writer.writerow([
                grade, school_name, subtest_target, t,
                counts["bm"], counts["mod"], counts["high"],
                round(counts["bm"] / t * 100, 1),
                round(counts["mod"] / t * 100, 1),
                round(counts["high"] / t * 100, 1),
            ])
    else:
        writer.writerow(["Error"])
        writer.writerow(["Unknown report type"])

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=cubed3_{report_type}_report.csv"},
    )


@router.get("/student/{student_id}/progress")
def student_progress(
    student_id: int,
    subtest: Optional[str] = None,
    target: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(TestSession)
        .filter(TestSession.student_id == student_id, TestSession.is_complete == True)
        .order_by(TestSession.created_at.asc())
    )
    if subtest:
        q = q.filter(TestSession.subtest == subtest)

    sessions = q.all()
    data_points = []
    for session in sessions:
        for score in session.scores:
            if target and score.target != target:
                continue
            data_points.append({
                "date": session.created_at.isoformat(),
                "academic_year": session.academic_year,
                "time_of_year": session.time_of_year,
                "subtest": session.subtest,
                "target": score.target,
                "sub_target": score.sub_target,
                "raw_score": score.raw_score,
                "risk_level": score.risk_level,
            })
    return data_points
