import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import User, Student, TestSession, Score, License
from schemas import TestSessionCreate, TestSessionOut, ScoreCreate, ScoreUpdate, ScoreOut
from auth import get_current_user
from services.scoring import classify_risk, get_recommendation, get_available_subtests, get_next_subtest_recommendation
from services.intelliscore import save_audio, transcribe_audio, analyze_transcript

router = APIRouter(prefix="/api/assessments", tags=["assessments"])


@router.get("/subtests")
def list_subtests():
    return get_available_subtests()


@router.get("/benchmarks")
def get_benchmarks():
    from services.scoring import _load_benchmarks
    return _load_benchmarks()


@router.post("/start", response_model=TestSessionOut)
def start_test(
    payload: TestSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    license_rec = (
        db.query(License)
        .filter(License.organization_id == current_user.organization_id, License.academic_year == payload.academic_year)
        .first()
    )

    existing_session = (
        db.query(TestSession)
        .filter(TestSession.student_id == student.id, TestSession.academic_year == payload.academic_year)
        .first()
    )
    if not existing_session and license_rec:
        license_rec.used += 1
        db.commit()

    session = TestSession(
        student_id=payload.student_id,
        examiner_id=current_user.id,
        subtest=payload.subtest,
        form_id=payload.form_id,
        grade_at_test=payload.grade_at_test,
        academic_year=payload.academic_year,
        time_of_year=payload.time_of_year,
        assessment_type=payload.assessment_type,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return TestSessionOut.model_validate(session)


@router.post("/{session_id}/scores", response_model=ScoreOut)
def add_score(
    session_id: int,
    payload: ScoreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(TestSession).filter(TestSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Test session not found")

    risk = None
    if payload.raw_score is not None:
        subtest_key = _map_target_to_benchmark_key(session.subtest, payload.target)
        if subtest_key:
            risk = classify_risk(subtest_key, session.grade_at_test, session.time_of_year, payload.raw_score)

    score = Score(
        test_session_id=session_id,
        target=payload.target,
        sub_target=payload.sub_target,
        raw_score=payload.raw_score,
        max_score=payload.max_score,
        risk_level=risk,
        notes=payload.notes,
    )
    db.add(score)
    db.commit()
    db.refresh(score)
    return ScoreOut.model_validate(score)


@router.put("/{session_id}/scores/{score_id}", response_model=ScoreOut)
def update_score(
    session_id: int,
    score_id: int,
    payload: ScoreUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    score = db.query(Score).filter(Score.id == score_id, Score.test_session_id == session_id).first()
    if not score:
        raise HTTPException(404, "Score not found")

    if payload.raw_score is not None:
        score.raw_score = payload.raw_score
        session = db.query(TestSession).filter(TestSession.id == session_id).first()
        subtest_key = _map_target_to_benchmark_key(session.subtest, score.target)
        if subtest_key:
            score.risk_level = classify_risk(subtest_key, session.grade_at_test, session.time_of_year, payload.raw_score)

    if payload.notes is not None:
        score.notes = payload.notes

    db.commit()
    db.refresh(score)
    return ScoreOut.model_validate(score)


@router.post("/{session_id}/complete", response_model=TestSessionOut)
def complete_test(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(TestSession).filter(TestSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Test session not found")
    session.is_complete = True
    session.completed_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(session)
    return TestSessionOut.model_validate(session)


@router.get("/{session_id}", response_model=TestSessionOut)
def get_test_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(TestSession).filter(TestSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Test session not found")
    return TestSessionOut.model_validate(session)


@router.get("/{session_id}/recommendations")
def get_recommendations(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(TestSession).filter(TestSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Test session not found")

    recs = []
    for score in session.scores:
        if score.risk_level in ("moderate", "high"):
            rec = get_recommendation(session.subtest, score.target, score.risk_level)
            if rec:
                recs.append({
                    "target": score.target,
                    "sub_target": score.sub_target,
                    "risk_level": score.risk_level,
                    "raw_score": score.raw_score,
                    "recommendation": rec,
                })
    return recs


@router.get("/student/{student_id}/next-subtest")
def next_subtest(
    student_id: int,
    academic_year: str = "2025-2026",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    completed = (
        db.query(TestSession)
        .filter(TestSession.student_id == student_id, TestSession.is_complete == True, TestSession.academic_year == academic_year)
        .all()
    )
    completed_subtests = list(set(s.subtest for s in completed))
    risk_results = {}
    for s in completed:
        for score in s.scores:
            if score.risk_level:
                risk_results[score.target] = score.risk_level
    return get_next_subtest_recommendation(student.grade, completed_subtests, risk_results)


@router.get("/student/{student_id}/history")
def get_student_test_history(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = (
        db.query(TestSession)
        .filter(TestSession.student_id == student_id, TestSession.is_complete == True)
        .order_by(TestSession.created_at.desc())
        .all()
    )
    return [TestSessionOut.model_validate(s) for s in sessions]


@router.post("/{session_id}/manual-scores")
def add_manual_scores(
    session_id: int,
    scores: List[ScoreCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(TestSession).filter(TestSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Test session not found")

    created = []
    for sc in scores:
        risk = None
        if sc.raw_score is not None:
            subtest_key = _map_target_to_benchmark_key(session.subtest, sc.target)
            if subtest_key:
                risk = classify_risk(subtest_key, session.grade_at_test, session.time_of_year, sc.raw_score)
        score = Score(
            test_session_id=session_id,
            target=sc.target,
            sub_target=sc.sub_target,
            raw_score=sc.raw_score,
            max_score=sc.max_score,
            risk_level=risk,
            notes=sc.notes,
        )
        db.add(score)
        created.append(score)
    db.commit()
    return [ScoreOut.model_validate(s) for s in created]


@router.post("/{session_id}/upload-audio")
async def upload_audio(
    session_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(TestSession).filter(TestSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Test session not found")

    audio_bytes = await file.read()
    file_path = save_audio(session_id, audio_bytes, file.filename)
    session.audio_file_path = file_path
    session.audio_expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=14)
    db.commit()

    return {"file_path": file_path, "message": "Audio uploaded successfully"}


@router.get("/{session_id}/audio")
def get_audio(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi.responses import FileResponse
    import os
    session = db.query(TestSession).filter(TestSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Test session not found")
    if not session.audio_file_path or not os.path.exists(session.audio_file_path):
        raise HTTPException(404, "No audio file available")
    if session.audio_expires_at and session.audio_expires_at < datetime.datetime.utcnow():
        raise HTTPException(410, "Audio file has expired")
    return FileResponse(session.audio_file_path, media_type="audio/webm")


@router.post("/{session_id}/transcribe")
async def transcribe_session_audio(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(TestSession).filter(TestSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Test session not found")
    if not session.audio_file_path:
        raise HTTPException(400, "No audio file uploaded for this session")

    transcript = await transcribe_audio(session.audio_file_path)
    session.transcript = transcript
    session.intelliscore_used = True
    db.commit()

    return {"transcript": transcript}


@router.post("/{session_id}/set-transcript")
def set_transcript(
    session_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(TestSession).filter(TestSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Test session not found")

    session.transcript = payload.get("transcript", "")
    db.commit()

    return {"transcript": session.transcript}


@router.post("/{session_id}/analyze-transcript")
def analyze_session_transcript(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(TestSession).filter(TestSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Test session not found")
    if not session.transcript:
        raise HTTPException(400, "No transcript available for analysis")

    analysis = analyze_transcript(session.transcript)
    session.intelliscore_used = True
    db.commit()

    return analysis


def _map_target_to_benchmark_key(subtest: str, target: str) -> str | None:
    """Map a subtest + target to the benchmark JSON key."""
    mapping = {
        ("NLM_LISTENING", "NLM_RETELL"): "NLM_RETELL_LISTENING",
        ("NLM_LISTENING", "NLM_QUESTIONS"): "NLM_QUESTIONS_LISTENING",
        ("NLM_READING", "NLM_RETELL"): "NLM_RETELL_READING",
        ("NLM_READING", "NLM_QUESTIONS"): "NLM_QUESTIONS_READING",
        ("NLM_READING", "DECODING_FLUENCY"): "DECODING_FLUENCY",
        ("NLM_READING", "ACCURACY"): "ACCURACY",
        ("DDM_PA", "PHONEME_SEGMENTATION"): "DDM_PA_PHONEME_SEGMENTATION",
        ("DDM_PA", "PHONEME_BLENDING"): "DDM_PA_PHONEME_BLENDING",
        ("DDM_PA", "FIRST_SOUNDS"): "DDM_PA_FIRST_SOUNDS",
        ("DDM_PA", "CONTINUOUS_PHONEME_BLENDING"): "DDM_PA_CONTINUOUS_BLENDING",
        ("DDM_PM", "PHONEME_DELETION"): "DDM_PM_DELETION",
        ("DDM_PM", "PHONEME_ADDITION"): "DDM_PM_ADDITION",
        ("DDM_PM", "PHONEME_SUBSTITUTION"): "DDM_PM_SUBSTITUTION",
        ("DDM_OM", "IRREGULAR_WORDS"): "DDM_OM_IRREGULAR_WORDS",
        ("DDM_OM", "LETTER_SOUNDS"): "DDM_OM_LETTER_SOUNDS",
        ("DDM_DI", "CLOSED_SYLLABLES"): "DDM_DI_CLOSED_SYLLABLES",
        ("DDM_DI", "VCE"): "DDM_DI_VCE",
        ("DDM_DI", "BASIC_AFFIXES"): "DDM_DI_BASIC_AFFIXES",
        ("DDM_DI", "VOWEL_TEAMS"): "DDM_DI_VOWEL_TEAMS",
        ("DDM_DI", "VOWEL_R_CONTROLLED"): "DDM_DI_VOWEL_R",
        ("DDM_DI", "ADVANCED_AFFIXES"): "DDM_DI_ADVANCED_AFFIXES",
        ("DDM_DI", "COMPLEX_VOWELS"): "DDM_DI_COMPLEX_VOWELS",
        ("DDM_DI", "ADVANCED_WORD_FORMS"): "DDM_DI_ADVANCED_WORD_FORMS",
        ("DDM_DI", "WORDS_IN_CONTEXT"): "DDM_DI_WORDS_IN_CONTEXT",
    }
    return mapping.get((subtest, target))
