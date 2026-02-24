import csv
import io
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserOut, UserCreate, UserUpdate
from auth import get_current_user, hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


def _require_admin(user: User):
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")


@router.get("/", response_model=List[UserOut])
def list_users(
    status: Optional[str] = "active",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    q = db.query(User).filter(User.organization_id == current_user.organization_id)
    if status == "active":
        q = q.filter(User.is_active == True)
    elif status == "deleted":
        q = q.filter(User.is_active == False)
    return [UserOut.model_validate(u) for u in q.order_by(User.last_name).all()]


@router.post("/", response_model=UserOut)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(400, "Email already in use")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=payload.role,
        organization_id=current_user.organization_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    user = db.query(User).filter(
        User.id == user_id, User.organization_id == current_user.organization_id
    ).first()
    if not user:
        raise HTTPException(404, "User not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot delete yourself")
    user = db.query(User).filter(
        User.id == user_id, User.organization_id == current_user.organization_id
    ).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = False
    db.commit()
    return {"deleted": True}


@router.post("/{user_id}/restore")
def restore_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    user = db.query(User).filter(
        User.id == user_id, User.organization_id == current_user.organization_id
    ).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = True
    db.commit()
    return {"restored": True}


@router.post("/bulk-import")
def bulk_import_users(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    created = 0
    errors = []
    for i, row in enumerate(reader, start=2):
        try:
            email = (row.get("email") or row.get("Email") or "").strip()
            first = (row.get("first_name") or row.get("First Name") or "").strip()
            last = (row.get("last_name") or row.get("Last Name") or "").strip()
            role = (row.get("role") or row.get("Role") or "examiner").strip()
            password = (row.get("password") or row.get("Password") or "Insight2024!").strip()

            if not email or not first or not last:
                errors.append(f"Row {i}: missing required fields (email, first_name, last_name)")
                continue

            if db.query(User).filter(User.email == email).first():
                errors.append(f"Row {i}: email {email} already exists")
                continue

            user = User(
                email=email,
                hashed_password=hash_password(password),
                first_name=first,
                last_name=last,
                role=role if role in ("admin", "examiner") else "examiner",
                organization_id=current_user.organization_id,
            )
            db.add(user)
            db.flush()
            created += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    db.commit()
    return {"created": created, "errors": errors}
