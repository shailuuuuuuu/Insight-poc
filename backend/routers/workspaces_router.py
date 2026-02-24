from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import *
from auth import get_current_user

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


class WorkspaceCreate(BaseModel):
    name: str
    ws_type: str = "plc"
    member_ids: List[int] = []


class NoteCreate(BaseModel):
    student_id: Optional[int] = None
    content: str


class ActionItemCreate(BaseModel):
    title: str
    assigned_to: Optional[int] = None
    due_date: Optional[str] = None


@router.get("/")
def list_workspaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owned = db.query(Workspace).filter(Workspace.owner_id == current_user.id).all()

    member_of = (
        db.query(Workspace)
        .filter(Workspace.members.any(User.id == current_user.id))
        .all()
    )

    seen_ids = set()
    results = []
    for ws in owned + member_of:
        if ws.id not in seen_ids:
            seen_ids.add(ws.id)
            results.append({
                "id": ws.id,
                "name": ws.name,
                "ws_type": ws.ws_type,
                "owner_id": ws.owner_id,
                "member_count": len(ws.members),
                "created_at": str(ws.created_at),
            })
    return results


@router.post("/")
def create_workspace(
    payload: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = Workspace(
        name=payload.name,
        ws_type=payload.ws_type,
        owner_id=current_user.id,
    )
    db.add(ws)
    db.flush()

    if payload.member_ids:
        members = db.query(User).filter(User.id.in_(payload.member_ids)).all()
        ws.members = members

    db.commit()
    db.refresh(ws)
    return {
        "id": ws.id,
        "name": ws.name,
        "ws_type": ws.ws_type,
        "owner_id": ws.owner_id,
        "member_count": len(ws.members),
        "created_at": str(ws.created_at),
    }


@router.get("/{workspace_id}")
def get_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(404, "Workspace not found")

    is_member = ws.owner_id == current_user.id or any(m.id == current_user.id for m in ws.members)
    if not is_member:
        raise HTTPException(403, "Not a member of this workspace")

    recent_notes = (
        db.query(WorkspaceNote)
        .filter(WorkspaceNote.workspace_id == workspace_id)
        .order_by(WorkspaceNote.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "id": ws.id,
        "name": ws.name,
        "ws_type": ws.ws_type,
        "owner_id": ws.owner_id,
        "created_at": str(ws.created_at),
        "members": [
            {"id": m.id, "email": m.email, "first_name": m.first_name, "last_name": m.last_name}
            for m in ws.members
        ],
        "recent_notes": [
            {
                "id": n.id,
                "user_id": n.user_id,
                "student_id": n.student_id,
                "content": n.content,
                "created_at": str(n.created_at),
            }
            for n in recent_notes
        ],
    }


@router.post("/{workspace_id}/notes")
def add_note(
    workspace_id: int,
    payload: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(404, "Workspace not found")

    note = WorkspaceNote(
        workspace_id=workspace_id,
        user_id=current_user.id,
        student_id=payload.student_id,
        content=payload.content,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return {
        "id": note.id,
        "workspace_id": note.workspace_id,
        "user_id": note.user_id,
        "student_id": note.student_id,
        "content": note.content,
        "created_at": str(note.created_at),
    }


@router.get("/{workspace_id}/notes")
def list_notes(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notes = (
        db.query(WorkspaceNote)
        .filter(WorkspaceNote.workspace_id == workspace_id)
        .order_by(WorkspaceNote.created_at.desc())
        .all()
    )
    return [
        {
            "id": n.id,
            "user_id": n.user_id,
            "student_id": n.student_id,
            "content": n.content,
            "created_at": str(n.created_at),
        }
        for n in notes
    ]


@router.post("/{workspace_id}/action-items")
def create_action_item(
    workspace_id: int,
    payload: ActionItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(404, "Workspace not found")

    item = WorkspaceActionItem(
        workspace_id=workspace_id,
        title=payload.title,
        assigned_to=payload.assigned_to,
        due_date=payload.due_date,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "workspace_id": item.workspace_id,
        "title": item.title,
        "assigned_to": item.assigned_to,
        "due_date": item.due_date,
        "is_complete": item.is_complete,
        "created_at": str(item.created_at),
    }


@router.get("/{workspace_id}/action-items")
def list_action_items(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = (
        db.query(WorkspaceActionItem)
        .filter(WorkspaceActionItem.workspace_id == workspace_id)
        .order_by(WorkspaceActionItem.created_at.desc())
        .all()
    )
    return [
        {
            "id": i.id,
            "title": i.title,
            "assigned_to": i.assigned_to,
            "due_date": i.due_date,
            "is_complete": i.is_complete,
            "created_at": str(i.created_at),
        }
        for i in items
    ]


@router.put("/action-items/{item_id}/toggle")
def toggle_action_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(WorkspaceActionItem).filter(WorkspaceActionItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Action item not found")

    item.is_complete = not item.is_complete
    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "title": item.title,
        "is_complete": item.is_complete,
    }
