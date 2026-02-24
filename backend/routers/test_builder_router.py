from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import *
from auth import get_current_user

router = APIRouter(prefix="/api/test-builder", tags=["test-builder"])


class TestItemCreate(BaseModel):
    stem: str
    response_type: str = "selected"
    answer_key: Optional[str] = None
    skill_area: Optional[str] = None
    grade: Optional[str] = None
    difficulty: str = "medium"


class CustomTestCreate(BaseModel):
    name: str
    description: Optional[str] = None
    item_ids: List[int] = []


@router.get("/items")
def list_items(
    skill_area: Optional[str] = None,
    grade: Optional[str] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(TestItem)
    if skill_area:
        q = q.filter(TestItem.skill_area == skill_area)
    if grade:
        q = q.filter(TestItem.grade == grade)
    if difficulty:
        q = q.filter(TestItem.difficulty == difficulty)
    if search:
        q = q.filter(TestItem.stem.ilike(f"%{search}%"))

    items = q.order_by(TestItem.created_at.desc()).all()
    return [
        {
            "id": i.id,
            "stem": i.stem,
            "response_type": i.response_type,
            "answer_key": i.answer_key,
            "skill_area": i.skill_area,
            "grade": i.grade,
            "difficulty": i.difficulty,
            "created_by": i.created_by,
        }
        for i in items
    ]


@router.post("/items")
def create_item(
    payload: TestItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = TestItem(
        stem=payload.stem,
        response_type=payload.response_type,
        answer_key=payload.answer_key,
        skill_area=payload.skill_area,
        grade=payload.grade,
        difficulty=payload.difficulty,
        created_by=current_user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "stem": item.stem,
        "response_type": item.response_type,
        "answer_key": item.answer_key,
        "skill_area": item.skill_area,
        "grade": item.grade,
        "difficulty": item.difficulty,
    }


@router.get("/tests")
def list_tests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tests = (
        db.query(CustomTest)
        .filter(CustomTest.created_by == current_user.id)
        .order_by(CustomTest.created_at.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "item_count": len(t.items),
            "created_at": str(t.created_at),
        }
        for t in tests
    ]


@router.post("/tests")
def create_test(
    payload: CustomTestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    test = CustomTest(
        name=payload.name,
        description=payload.description,
        created_by=current_user.id,
    )
    db.add(test)
    db.flush()

    if payload.item_ids:
        items = db.query(TestItem).filter(TestItem.id.in_(payload.item_ids)).all()
        test.items = items

    db.commit()
    db.refresh(test)
    return {
        "id": test.id,
        "name": test.name,
        "description": test.description,
        "item_count": len(test.items),
        "created_at": str(test.created_at),
    }


@router.get("/tests/{test_id}")
def get_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    test = (
        db.query(CustomTest)
        .filter(CustomTest.id == test_id, CustomTest.created_by == current_user.id)
        .first()
    )
    if not test:
        raise HTTPException(404, "Test not found")

    return {
        "id": test.id,
        "name": test.name,
        "description": test.description,
        "created_at": str(test.created_at),
        "items": [
            {
                "id": i.id,
                "stem": i.stem,
                "response_type": i.response_type,
                "answer_key": i.answer_key,
                "skill_area": i.skill_area,
                "grade": i.grade,
                "difficulty": i.difficulty,
            }
            for i in test.items
        ],
    }


@router.delete("/tests/{test_id}")
def delete_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    test = (
        db.query(CustomTest)
        .filter(CustomTest.id == test_id, CustomTest.created_by == current_user.id)
        .first()
    )
    if not test:
        raise HTTPException(404, "Test not found")

    test.items = []
    db.delete(test)
    db.commit()
    return {"deleted": True}
