"""
IntelliScore service — AI-powered audio transcription and narrative scoring.

In the real CUBED-3 tool, IntelliScore uses a proprietary AI engine to:
  1. Transcribe a student's oral retell from audio
  2. Analyze the transcript for narrative language measures (NDC, EC, SC, VC)
  3. Produce scored rubric values automatically

This POC provides:
  - Audio file storage
  - Transcription via OpenAI Whisper API (if key provided) or manual entry
  - A placeholder auto-scoring function that parses transcripts for narrative complexity markers
"""
import os
import re
from pathlib import Path

UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "audio"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def save_audio(session_id: int, audio_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix or ".webm"
    dest = UPLOAD_DIR / f"session_{session_id}{ext}"
    dest.write_bytes(audio_bytes)
    return str(dest)


async def transcribe_audio(file_path: str) -> str:
    """
    Transcribe audio file to text.
    Uses OpenAI Whisper API if OPENAI_API_KEY is set, otherwise returns a placeholder.
    """
    if OPENAI_API_KEY:
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                with open(file_path, "rb") as f:
                    resp = await client.post(
                        "https://api.openai.com/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                        files={"file": (Path(file_path).name, f, "audio/webm")},
                        data={"model": "whisper-1"},
                        timeout=120,
                    )
                resp.raise_for_status()
                return resp.json()["text"]
        except Exception as e:
            return f"[Transcription error: {e}]"

    return (
        "[IntelliScore placeholder] Audio recorded successfully. "
        "Set the OPENAI_API_KEY environment variable to enable automatic transcription via Whisper. "
        "You can also type or paste a transcript manually below."
    )


def analyze_transcript(transcript: str) -> dict:
    """
    Analyze a narrative retell transcript for complexity markers.
    Returns estimated sub-scores for narrative language dimensions.

    In the real IntelliScore engine, this would use NLP models trained on
    the CUBED-3 rubric. This POC uses heuristic keyword detection.
    """
    if not transcript or transcript.startswith("["):
        return {}

    sentences = re.split(r'[.!?]+', transcript)
    sentences = [s.strip() for s in sentences if s.strip()]
    words = transcript.split()
    word_count = len(words)

    subordinating = len(re.findall(
        r'\b(because|so that|when|after|before|although|while|since|if|unless|until)\b',
        transcript, re.IGNORECASE
    ))
    relative_clauses = len(re.findall(
        r'\b(who|which|that)\b', transcript, re.IGNORECASE
    ))
    causal = len(re.findall(
        r'\b(because|so|therefore|caused|made)\b', transcript, re.IGNORECASE
    ))

    problem_words = len(re.findall(
        r'\b(problem|trouble|wrong|broke|lost|fell|hurt|scared|worried|upset|sad|angry|stuck)\b',
        transcript, re.IGNORECASE
    ))
    attempt_words = len(re.findall(
        r'\b(tried|decided|went|looked|asked|helped|made|used|thought|wanted)\b',
        transcript, re.IGNORECASE
    ))
    consequence_words = len(re.findall(
        r'\b(finally|then|happy|better|fixed|found|learned|end|resolved|glad|relieved)\b',
        transcript, re.IGNORECASE
    ))

    unique_words = len(set(w.lower().strip('.,!?;:') for w in words))
    type_token_ratio = unique_words / max(word_count, 1)

    has_problem = problem_words > 0
    has_attempt = attempt_words > 0
    has_consequence = consequence_words > 0
    episode_complete = has_problem and has_attempt and has_consequence

    ec_score = 0
    if has_problem:
        ec_score += 1
    if has_attempt:
        ec_score += 1
    if has_consequence:
        ec_score += 1

    sc_score = min(3, subordinating + relative_clauses)

    vc_score = 0
    if type_token_ratio > 0.7:
        vc_score = 3
    elif type_token_ratio > 0.5:
        vc_score = 2
    elif type_token_ratio > 0.3:
        vc_score = 1

    ndc_score = 0
    if episode_complete and subordinating >= 2 and type_token_ratio > 0.5:
        ndc_score = 3
    elif episode_complete and subordinating >= 1:
        ndc_score = 2
    elif has_problem or has_attempt:
        ndc_score = 1

    return {
        "word_count": word_count,
        "sentence_count": len(sentences),
        "unique_words": unique_words,
        "type_token_ratio": round(type_token_ratio, 3),
        "sub_scores": {
            "EC": {"score": ec_score, "max": 3, "label": "Episode Complexity",
                   "detail": f"Problem: {'yes' if has_problem else 'no'}, Attempt: {'yes' if has_attempt else 'no'}, Consequence: {'yes' if has_consequence else 'no'}"},
            "SC": {"score": sc_score, "max": 3, "label": "Sentence Complexity",
                   "detail": f"{subordinating} subordinating conjunctions, {relative_clauses} relative clauses"},
            "VC": {"score": vc_score, "max": 3, "label": "Vocabulary Complexity",
                   "detail": f"Type-token ratio: {round(type_token_ratio, 3)} ({unique_words}/{word_count})"},
            "NDC": {"score": ndc_score, "max": 3, "label": "Narrative Discourse Complexity",
                    "detail": f"Episode complete: {'yes' if episode_complete else 'no'}, causal connectors: {causal}"},
        },
        "total_retell_score": ec_score + sc_score + vc_score + ndc_score,
        "max_retell_score": 12,
    }
