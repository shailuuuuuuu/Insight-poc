import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum, Table
)
from sqlalchemy.orm import relationship
import enum
from database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    EXAMINER = "examiner"


class RiskLevel(str, enum.Enum):
    ADVANCED = "advanced"
    BENCHMARK = "benchmark"
    MODERATE = "moderate"
    HIGH = "high"


class TimeOfYear(str, enum.Enum):
    BOY = "BOY"
    MOY = "MOY"
    EOY = "EOY"


class StudentStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


# Many-to-many: user <-> student ("My Students")
user_students = Table(
    "user_students",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("student_id", Integer, ForeignKey("students.id"), primary_key=True),
)

# Many-to-many: group <-> student
group_students = Table(
    "group_students",
    Base.metadata,
    Column("group_id", Integer, ForeignKey("groups.id"), primary_key=True),
    Column("student_id", Integer, ForeignKey("students.id"), primary_key=True),
)


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    org_type = Column(String, default="school")  # school, district, individual
    district = Column(String, nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, default="US")
    intelliscore_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    users = relationship("User", back_populates="organization")
    students = relationship("Student", back_populates="organization")
    licenses = relationship("License", back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    role = Column(String, default=UserRole.EXAMINER)
    is_active = Column(Boolean, default=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="users")
    my_students = relationship("Student", secondary=user_students, back_populates="assigned_users")
    groups = relationship("Group", back_populates="owner")
    administered_tests = relationship("TestSession", back_populates="examiner")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id_external = Column(String, nullable=True)  # School-assigned ID
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    grade = Column(String, nullable=False)
    school = Column(String, nullable=True)
    district = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)
    status = Column(String, default=StudentStatus.ACTIVE)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="students")
    assigned_users = relationship("User", secondary=user_students, back_populates="my_students")
    groups = relationship("Group", secondary=group_students, back_populates="students")
    test_sessions = relationship("TestSession", back_populates="student")


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="groups")
    students = relationship("Student", secondary=group_students, back_populates="groups")


class License(Base):
    __tablename__ = "licenses"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    total = Column(Integer, default=0)
    used = Column(Integer, default=0)
    academic_year = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="licenses")


class TestSession(Base):
    """One administration of a CUBED-3 subtest for a student."""
    __tablename__ = "test_sessions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    examiner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subtest = Column(String, nullable=False)  # e.g. "NLM_READING", "NLM_LISTENING", "DDM_PA", etc.
    form_id = Column(String, nullable=True)  # specific form/passage used
    grade_at_test = Column(String, nullable=False)
    academic_year = Column(String, nullable=False)
    time_of_year = Column(String, nullable=False)  # BOY, MOY, EOY
    assessment_type = Column(String, default="benchmark")  # benchmark or progress_monitoring
    is_complete = Column(Boolean, default=False)
    audio_file_path = Column(String, nullable=True)
    audio_expires_at = Column(DateTime, nullable=True)
    transcript = Column(Text, nullable=True)
    intelliscore_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    student = relationship("Student", back_populates="test_sessions")
    examiner = relationship("User", back_populates="administered_tests")
    scores = relationship("Score", back_populates="test_session", cascade="all, delete-orphan")


class Score(Base):
    """Individual target scores within a test session."""
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    test_session_id = Column(Integer, ForeignKey("test_sessions.id"), nullable=False)
    target = Column(String, nullable=False)  # e.g. "NLM_RETELL", "NLM_QUESTIONS", "DECODING_FLUENCY"
    sub_target = Column(String, nullable=True)  # e.g. "NDC", "SC", "VC", "EC1", "EC2", "FACTUAL", etc.
    raw_score = Column(Float, nullable=True)
    max_score = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)  # computed from benchmarks
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    test_session = relationship("TestSession", back_populates="scores")
