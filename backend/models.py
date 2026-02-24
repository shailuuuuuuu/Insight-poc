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
    PARENT = "parent"


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

# Many-to-many: parent <-> student
parent_students = Table(
    "parent_students",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("student_id", Integer, ForeignKey("students.id"), primary_key=True),
)

# Many-to-many: workspace <-> user (members)
workspace_members = Table(
    "workspace_members",
    Base.metadata,
    Column("workspace_id", Integer, ForeignKey("workspaces.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
)

# Many-to-many: custom_test <-> test_item
custom_test_items = Table(
    "custom_test_items",
    Base.metadata,
    Column("custom_test_id", Integer, ForeignKey("custom_tests.id"), primary_key=True),
    Column("test_item_id", Integer, ForeignKey("test_items.id"), primary_key=True),
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


# ──────────────────────────────────────────────────────────────
# #2 Smart Notifications
# ──────────────────────────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # untested, risk_change, license, benchmark_deadline, completion, digest
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ──────────────────────────────────────────────────────────────
# #8 MTSS — Intervention Logging
# ──────────────────────────────────────────────────────────────
class InterventionLog(Base):
    __tablename__ = "intervention_logs"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False)
    duration_minutes = Column(Integer, default=0)
    intervention_type = Column(String, nullable=True)
    fidelity_score = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ──────────────────────────────────────────────────────────────
# #11 Intervention Library
# ──────────────────────────────────────────────────────────────
class Intervention(Base):
    __tablename__ = "interventions"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    skill_area = Column(String, nullable=False)  # phonemic_awareness, phonics, fluency, vocabulary, comprehension
    grade_min = Column(String, default="K")
    grade_max = Column(String, default="8")
    duration_minutes = Column(Integer, default=15)
    materials = Column(Text, nullable=True)
    evidence_level = Column(String, default="moderate")  # strong, moderate, emerging
    instructions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class InterventionAssignment(Base):
    __tablename__ = "intervention_assignments"
    id = Column(Integer, primary_key=True, index=True)
    intervention_id = Column(Integer, ForeignKey("interventions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="assigned")  # assigned, in_progress, completed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ──────────────────────────────────────────────────────────────
# #12 PD Hub
# ──────────────────────────────────────────────────────────────
class PDCourse(Base):
    __tablename__ = "pd_courses"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    duration_hours = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class PDModule(Base):
    __tablename__ = "pd_modules"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("pd_courses.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    quiz_json = Column(Text, nullable=True)  # JSON string of quiz questions
    order = Column(Integer, default=0)


class PDProgress(Base):
    __tablename__ = "pd_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("pd_modules.id"), nullable=False)
    completed = Column(Boolean, default=False)
    score = Column(Float, nullable=True)
    completed_at = Column(DateTime, nullable=True)


# ──────────────────────────────────────────────────────────────
# #14 Learning Pathways
# ──────────────────────────────────────────────────────────────
class StudentPathway(Base):
    __tablename__ = "student_pathways"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    status = Column(String, default="active")  # active, completed, paused
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class PathwayActivity(Base):
    __tablename__ = "pathway_activities"
    id = Column(Integer, primary_key=True, index=True)
    pathway_id = Column(Integer, ForeignKey("student_pathways.id"), nullable=False)
    intervention_id = Column(Integer, ForeignKey("interventions.id"), nullable=False)
    order = Column(Integer, default=0)
    status = Column(String, default="pending")  # pending, in_progress, completed, skipped
    completed_at = Column(DateTime, nullable=True)


# ──────────────────────────────────────────────────────────────
# #17 Custom Test Builder
# ──────────────────────────────────────────────────────────────
class TestItem(Base):
    __tablename__ = "test_items"
    id = Column(Integer, primary_key=True, index=True)
    stem = Column(Text, nullable=False)
    response_type = Column(String, default="selected")  # selected, constructed, oral
    answer_key = Column(String, nullable=True)
    skill_area = Column(String, nullable=True)
    grade = Column(String, nullable=True)
    difficulty = Column(String, default="medium")  # easy, medium, hard
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class CustomTest(Base):
    __tablename__ = "custom_tests"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    items = relationship("TestItem", secondary=custom_test_items)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ──────────────────────────────────────────────────────────────
# #18 Teacher Workspaces
# ──────────────────────────────────────────────────────────────
class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    ws_type = Column(String, default="plc")  # plc, grade_team, intervention, custom
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    members = relationship("User", secondary=workspace_members)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class WorkspaceNote(Base):
    __tablename__ = "workspace_notes"
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class WorkspaceActionItem(Base):
    __tablename__ = "workspace_action_items"
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    title = Column(String, nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    due_date = Column(String, nullable=True)
    is_complete = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ──────────────────────────────────────────────────────────────
# #20 Gamified Student UX
# ──────────────────────────────────────────────────────────────
class Badge(Base):
    __tablename__ = "badges"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    criteria = Column(String, nullable=True)
    icon = Column(String, default="star")  # lucide icon name


class StudentBadge(Base):
    __tablename__ = "student_badges"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    badge_id = Column(Integer, ForeignKey("badges.id"), nullable=False)
    earned_at = Column(DateTime, default=datetime.datetime.utcnow)


class ReadingStreak(Base):
    __tablename__ = "reading_streaks"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), unique=True, nullable=False)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_activity_date = Column(String, nullable=True)


# ──────────────────────────────────────────────────────────────
# #21 SEL Integration
# ──────────────────────────────────────────────────────────────
class SELScreening(Base):
    __tablename__ = "sel_screenings"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    screener_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False)
    self_awareness = Column(Float, default=0)
    self_management = Column(Float, default=0)
    social_awareness = Column(Float, default=0)
    relationship_skills = Column(Float, default=0)
    decision_making = Column(Float, default=0)
    total_score = Column(Float, default=0)
    risk_level = Column(String, default="low")  # low, moderate, high
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
