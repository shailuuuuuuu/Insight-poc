from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, License
from schemas import LicenseOut
from auth import get_current_user

router = APIRouter(prefix="/api/licenses", tags=["licenses"])


@router.get("/", response_model=List[LicenseOut])
def list_licenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    licenses = (
        db.query(License)
        .filter(License.organization_id == current_user.organization_id)
        .order_by(License.academic_year.desc())
        .all()
    )
    return [LicenseOut.model_validate(lic) for lic in licenses]
