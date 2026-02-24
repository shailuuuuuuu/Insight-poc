import json
from pathlib import Path

_benchmarks = None

def _load_benchmarks():
    global _benchmarks
    if _benchmarks is None:
        path = Path(__file__).parent.parent / "data" / "benchmarks.json"
        with open(path) as f:
            _benchmarks = json.load(f)
    return _benchmarks


def classify_risk(subtest: str, grade: str, time_of_year: str, raw_score: float) -> str | None:
    """
    Classify a raw score into a risk level based on CUBED-3 benchmark cut points.
    Returns: 'advanced', 'benchmark', 'moderate', 'high', or None if no benchmark data exists.
    """
    benchmarks = _load_benchmarks()

    subtest_data = benchmarks.get(subtest)
    if not subtest_data or subtest == "_meta":
        return None

    grade_data = subtest_data.get(grade)
    if not grade_data:
        return None

    toy_data = grade_data.get(time_of_year)
    if not toy_data:
        return None

    advanced = toy_data.get("advanced")
    benchmark = toy_data.get("benchmark")
    moderate = toy_data.get("moderate")

    if advanced is not None and raw_score >= advanced:
        return "advanced"
    if benchmark is not None and raw_score >= benchmark:
        return "benchmark"
    if moderate is not None and raw_score >= moderate:
        return "moderate"
    return "high"


def get_recommendation(subtest: str, target: str, risk_level: str) -> str | None:
    """Return intervention recommendation text based on risk level and target."""
    recommendations = {
        "NLM_RETELL": {
            "EC1": "Provide 15-30 minutes of explicit instruction in large or small groups twice a week. Practice retelling simple stories that include a problem, an attempt, and a consequence/ending.",
            "SC": "Encourage and prompt complex language structures while retelling narratives. Targets: 'because', 'so that', 'when', 'after', and modifiers. Students should also use relative subordinate clauses with 'who', 'that', or 'which'.",
            "VC": "Teach more complex tier 2 words as well as adjectives and adverbs during narrative retelling activities.",
            "EC2": "Encourage students to include two sets of problems, attempts, and consequences in retells. Use Story Champs Level J stories and selected children's literature.",
        },
        "NLM_QUESTIONS": {
            "FACTUAL": "Provide repeated practice during retell intervention sessions to answer questions about story grammar elements: Who? What was the problem? How did they feel? What did they do? How did it end?",
            "INFERENTIAL_VOCABULARY": "Encourage use of clues in the story to infer meaning of words and provide definitions of target vocabulary words.",
            "INFERENTIAL_REASONING": "Encourage use of clues in the story to infer meaning. Provide practice making inferences using story context.",
            "EXPOSITORY": "Provide explicit instruction to identify important information and comprehend specific discourse structures. Pre-reading, during reading, and post-reading strategies with key words and graphic organizers.",
        },
        "DECODING_FLUENCY": {
            "default": "Students should receive 5-15 minutes of fluency practice multiple times a week. Focus on prosody and comprehension, not just speed. Use repeated reading of passages or short one-minute reading sprints.",
        },
        "DDM_PA": {
            "PHONEME_SEGMENTATION": "Practice segmenting and blending words orally, starting with simple CV, VC, and CVC patterns. Use visuals like finger counting or chip moving for each phoneme.",
            "PHONEME_BLENDING": "Practice blending words orally, starting with simple CV, VC, and CVC patterns.",
            "FIRST_SOUNDS": "Practice identifying first sounds with onset-rime segmentation. Integrate with letters so visuals help students understand each letter makes its own sound.",
            "CONTINUOUS_PHONEME_BLENDING": "Practice continuous phoneme blending with increasingly complex words.",
        },
        "DDM_PM": {
            "PHONEME_DELETION": "Phoneme manipulation tasks are the best measures of phonological awareness skills needed for reading. Practice adding, deleting, and substituting phonemes.",
            "PHONEME_ADDITION": "Practice phoneme addition tasks with increasingly complex words.",
            "PHONEME_SUBSTITUTION": "Practice phoneme substitution tasks with increasingly complex words.",
        },
        "DDM_OM": {
            "IRREGULAR_WORDS": "Provide explicit instruction for irregular words in small groups. Practice irregular words as they appear in books rather than in isolation. Use flash cards or drill-type instruction.",
            "LETTER_SOUNDS": "Practice saying sounds that correspond to each letter. Separate visually and auditorily similar letters. Start with useful continuous sounds (m, s, f, l, r, n) using lowercase letters.",
            "LETTER_NAMES": "Practice letter name identification alongside letter sounds.",
        },
        "DDM_DI": {
            "CLOSED_SYLLABLES": "Teach letter-by-letter sounding out strategy for CVC words before introducing more complex patterns.",
            "default": "Teach various word patterns beginning with most frequently occurring patterns. Use systematic instruction for consonant digraphs, vowel digraphs, diphthongs, and r/l-controlled vowels.",
        },
    }

    target_recs = recommendations.get(target, {})
    if not target_recs:
        target_recs = recommendations.get(subtest, {})
    rec = target_recs.get(target) or target_recs.get("default")
    if not rec:
        for v in target_recs.values():
            rec = v
            break

    if rec and risk_level in ("moderate", "high"):
        return rec
    return None


def get_available_subtests() -> list[dict]:
    """Return metadata about all CUBED-3 subtests."""
    return [
        {"id": "NLM_LISTENING", "name": "NLM Listening", "category": "NLM", "grades": ["PreK", "K", "1", "2", "3"],
         "targets": ["NLM_RETELL", "NLM_QUESTIONS"]},
        {"id": "NLM_READING", "name": "NLM Reading", "category": "NLM", "grades": ["1", "2", "3", "4", "5", "6", "7", "8"],
         "targets": ["NLM_RETELL", "NLM_QUESTIONS", "DECODING_FLUENCY"]},
        {"id": "DDM_PA", "name": "DDM Phonemic Awareness", "category": "DDM", "grades": ["PreK", "K", "1", "2"],
         "targets": ["PHONEME_SEGMENTATION", "PHONEME_BLENDING", "FIRST_SOUNDS", "CONTINUOUS_PHONEME_BLENDING"]},
        {"id": "DDM_PM", "name": "DDM Phoneme Manipulation", "category": "DDM", "grades": ["1", "2"],
         "targets": ["PHONEME_DELETION", "PHONEME_ADDITION", "PHONEME_SUBSTITUTION"]},
        {"id": "DDM_OM", "name": "DDM Orthographic Mapping", "category": "DDM", "grades": ["PreK", "K", "1", "2"],
         "targets": ["IRREGULAR_WORDS", "LETTER_SOUNDS", "LETTER_NAMES"]},
        {"id": "DDM_DI", "name": "DDM Decoding Inventory", "category": "DDM", "grades": ["K", "1", "2", "3", "4"],
         "targets": ["CLOSED_SYLLABLES", "VCE", "BASIC_AFFIXES", "VOWEL_TEAMS", "VOWEL_R_CONTROLLED",
                      "ADVANCED_AFFIXES", "COMPLEX_VOWELS", "ADVANCED_WORD_FORMS"]},
    ]
