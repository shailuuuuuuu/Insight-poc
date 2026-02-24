from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# --- Auth ---
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# --- Organization ---
class OrgCreate(BaseModel):
    name: str
    org_type: str = "school"
    district: Optional[str] = None
    state: Optional[str] = None

class OrgOut(BaseModel):
    id: int
    name: str
    org_type: str
    district: Optional[str]
    state: Optional[str]
    intelliscore_enabled: bool
    model_config = {"from_attributes": True}


# --- User ---
class UserCreate(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    role: str = "examiner"

class UserOut(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    organization_id: Optional[int]
    model_config = {"from_attributes": True}

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


# --- Student ---
class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    grade: str
    student_id_external: Optional[str] = None
    school: Optional[str] = None
    district: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    teacher_email: Optional[str] = None

class StudentOut(BaseModel):
    id: int
    student_id_external: Optional[str]
    first_name: str
    last_name: str
    grade: str
    school: Optional[str]
    district: Optional[str]
    gender: Optional[str]
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}

class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    grade: Optional[str] = None
    school: Optional[str] = None
    district: Optional[str] = None
    gender: Optional[str] = None
    status: Optional[str] = None


# --- Group ---
class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None

class GroupOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    student_count: int = 0
    model_config = {"from_attributes": True}


# --- Test Session ---
class TestSessionCreate(BaseModel):
    student_id: int
    subtest: str
    form_id: Optional[str] = None
    grade_at_test: str
    academic_year: str
    time_of_year: str
    assessment_type: str = "benchmark"

class TestSessionOut(BaseModel):
    id: int
    student_id: int
    examiner_id: int
    subtest: str
    form_id: Optional[str]
    grade_at_test: str
    academic_year: str
    time_of_year: str
    assessment_type: str
    is_complete: bool
    intelliscore_used: bool
    created_at: datetime
    completed_at: Optional[datetime]
    scores: List["ScoreOut"] = []
    model_config = {"from_attributes": True}


# --- Score ---
class ScoreCreate(BaseModel):
    target: str
    sub_target: Optional[str] = None
    raw_score: Optional[float] = None
    max_score: Optional[float] = None
    notes: Optional[str] = None

class ScoreUpdate(BaseModel):
    raw_score: Optional[float] = None
    notes: Optional[str] = None

class ScoreOut(BaseModel):
    id: int
    target: str
    sub_target: Optional[str]
    raw_score: Optional[float]
    max_score: Optional[float]
    risk_level: Optional[str]
    model_config = {"from_attributes": True}


# --- License ---
class LicenseOut(BaseModel):
    id: int
    total: int
    used: int
    academic_year: str
    model_config = {"from_attributes": True}


# --- Reports ---
class RiskSummary(BaseModel):
    subtest: str
    total_students: int
    low_risk: int
    moderate_risk: int
    high_risk: int
    low_risk_pct: float
    moderate_risk_pct: float
    high_risk_pct: float

class StudentRiskRow(BaseModel):
    student_id: int
    student_name: str
    grade: str
    nlm_retell_risk: Optional[str] = None
    nlm_questions_risk: Optional[str] = None
    decoding_fluency_risk: Optional[str] = None
    nlm_retell_reading_risk: Optional[str] = None
    nlm_questions_reading_risk: Optional[str] = None
