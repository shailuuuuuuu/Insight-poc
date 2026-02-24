import csv
import io
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User, Student, Group, user_students, group_students
from schemas import StudentCreate, StudentOut, StudentUpdate, GroupCreate, GroupOut
from auth import get_current_user

router = APIRouter(prefix="/api/students", tags=["students"])


@router.get("/all", response_model=List[StudentOut])
def get_all_students(
    grade: Optional[str] = None,
    school: Optional[str] = None,
    status: Optional[str] = "active",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Student).filter(Student.organization_id == current_user.organization_id)
    if status:
        q = q.filter(Student.status == status)
    if grade:
        q = q.filter(Student.grade == grade)
    if school:
        q = q.filter(Student.school == school)
    if search:
        q = q.filter(
            (Student.first_name.ilike(f"%{search}%"))
            | (Student.last_name.ilike(f"%{search}%"))
            | (Student.student_id_external.ilike(f"%{search}%"))
        )
    return [StudentOut.model_validate(s) for s in q.order_by(Student.last_name).all()]


@router.get("/my", response_model=List[StudentOut])
def get_my_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return [StudentOut.model_validate(s) for s in current_user.my_students]


@router.post("/", response_model=StudentOut)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = Student(
        first_name=payload.first_name,
        last_name=payload.last_name,
        grade=payload.grade,
        student_id_external=payload.student_id_external,
        school=payload.school,
        district=payload.district,
        gender=payload.gender,
        date_of_birth=payload.date_of_birth,
        organization_id=current_user.organization_id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    if payload.teacher_email:
        teacher = db.query(User).filter(User.email == payload.teacher_email).first()
        if teacher:
            teacher.my_students.append(student)
            db.commit()

    return StudentOut.model_validate(student)


@router.post("/bulk-import")
def bulk_import_students(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    created = 0
    errors = []
    for i, row in enumerate(reader, start=2):
        try:
            first = row.get("first_name") or row.get("First Name") or ""
            last = row.get("last_name") or row.get("Last Name") or ""
            grade = row.get("grade") or row.get("Grade") or ""
            if not first or not last or not grade:
                errors.append(f"Row {i}: missing required fields")
                continue

            student = Student(
                first_name=first.strip(),
                last_name=last.strip(),
                grade=grade.strip(),
                student_id_external=(row.get("student_id") or row.get("Student ID") or "").strip() or None,
                school=(row.get("school") or row.get("School") or "").strip() or None,
                district=(row.get("district") or row.get("District") or "").strip() or None,
                gender=(row.get("gender") or row.get("Gender") or "").strip() or None,
                organization_id=current_user.organization_id,
            )
            db.add(student)
            db.flush()

            teacher_email = (row.get("teacher_email") or row.get("Teacher Email") or "").strip()
            if teacher_email:
                teacher = db.query(User).filter(User.email == teacher_email).first()
                if teacher:
                    teacher.my_students.append(student)

            created += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    db.commit()
    return {"created": created, "errors": errors}


@router.post("/add-to-my-students")
def add_to_my_students(
    student_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    students = db.query(Student).filter(Student.id.in_(student_ids)).all()
    for s in students:
        if s not in current_user.my_students:
            current_user.my_students.append(s)
    db.commit()
    return {"added": len(students)}


@router.delete("/remove-from-my-students/{student_id}")
def remove_from_my_students(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if student and student in current_user.my_students:
        current_user.my_students.remove(student)
        db.commit()
    return {"removed": True}


@router.get("/{student_id}", response_model=StudentOut)
def get_student(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    return StudentOut.model_validate(student)


@router.put("/{student_id}", response_model=StudentOut)
def update_student(student_id: int, payload: StudentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return StudentOut.model_validate(student)


@router.post("/{student_id}/set-inactive")
def set_inactive(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    student.status = "inactive"
    db.commit()
    return {"status": "inactive"}


@router.post("/{student_id}/set-active")
def set_active(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    student.status = "active"
    db.commit()
    return {"status": "active"}


# --- Groups ---
@router.get("/groups/list", response_model=List[GroupOut])
def list_groups(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    groups = db.query(Group).filter(Group.owner_id == current_user.id).all()
    result = []
    for g in groups:
        out = GroupOut.model_validate(g)
        out.student_count = len(g.students)
        result.append(out)
    return result


@router.post("/groups", response_model=GroupOut)
def create_group(payload: GroupCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    group = Group(name=payload.name, description=payload.description, owner_id=current_user.id)
    db.add(group)
    db.commit()
    db.refresh(group)
    out = GroupOut.model_validate(group)
    out.student_count = 0
    return out


@router.post("/groups/{group_id}/add-students")
def add_students_to_group(group_id: int, student_ids: List[int], db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    group = db.query(Group).filter(Group.id == group_id, Group.owner_id == current_user.id).first()
    if not group:
        raise HTTPException(404, "Group not found")
    students = db.query(Student).filter(Student.id.in_(student_ids)).all()
    for s in students:
        if s not in group.students:
            group.students.append(s)
    db.commit()
    return {"added": len(students)}
