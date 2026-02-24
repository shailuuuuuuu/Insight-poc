import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ClipboardList, CheckCircle, AlertTriangle, Wand2, PenLine, BookOpen, Mic, FileText } from 'lucide-react';
import IntelliScore from '../components/IntelliScore';
import TimedReading from '../components/TimedReading';
import RetellScoring from '../components/RetellScoring';
import QuestionsScoring from '../components/QuestionsScoring';
import { DDMGridScoring, DDMWordListScoring, DDMPhonemeScoring } from '../components/DDMScoring';

const CURRENT_YEAR = '2025-2026';

const DEFAULT_PHONEME_ITEMS = Array.from({ length: 10 }, (_, i) => ({ prompt: `Item ${i + 1}`, answer: '' }));

const PA_ITEMS = {
  PHONEME_SEGMENTATION: [
    { prompt: 'mat', answer: '/m/ /a/ /t/' },
    { prompt: 'sun', answer: '/s/ /u/ /n/' },
    { prompt: 'fish', answer: '/f/ /i/ /sh/' },
    { prompt: 'red', answer: '/r/ /e/ /d/' },
    { prompt: 'block', answer: '/b/ /l/ /o/ /k/' },
    { prompt: 'stop', answer: '/s/ /t/ /o/ /p/' },
    { prompt: 'grape', answer: '/g/ /r/ /a/ /p/' },
    { prompt: 'smile', answer: '/s/ /m/ /i/ /l/' },
    { prompt: 'plant', answer: '/p/ /l/ /a/ /n/ /t/' },
    { prompt: 'brush', answer: '/b/ /r/ /u/ /sh/' },
  ],
  PHONEME_BLENDING: [
    { prompt: '/s/ /i/ /t/', answer: 'sit' },
    { prompt: '/m/ /a/ /p/', answer: 'map' },
    { prompt: '/r/ /u/ /n/', answer: 'run' },
    { prompt: '/f/ /l/ /a/ /g/', answer: 'flag' },
    { prompt: '/s/ /t/ /o/ /p/', answer: 'stop' },
    { prompt: '/g/ /r/ /a/ /b/', answer: 'grab' },
    { prompt: '/s/ /p/ /l/ /i/ /t/', answer: 'split' },
    { prompt: '/s/ /t/ /r/ /i/ /p/', answer: 'strip' },
    { prompt: '/sh/ /r/ /i/ /m/ /p/', answer: 'shrimp' },
    { prompt: '/s/ /k/ /u/ /n/ /k/', answer: 'skunk' },
  ],
  FIRST_SOUNDS: [
    { prompt: 'ball', answer: '/b/' },
    { prompt: 'dog', answer: '/d/' },
    { prompt: 'fun', answer: '/f/' },
    { prompt: 'goat', answer: '/g/' },
    { prompt: 'hat', answer: '/h/' },
    { prompt: 'kite', answer: '/k/' },
    { prompt: 'lamp', answer: '/l/' },
    { prompt: 'nose', answer: '/n/' },
    { prompt: 'rain', answer: '/r/' },
    { prompt: 'sun', answer: '/s/' },
  ],
  CONTINUOUS_PHONEME_BLENDING: [
    { prompt: '/mmm/ /aaa/ /t/', answer: 'mat' },
    { prompt: '/sss/ /aaa/ /d/', answer: 'sad' },
    { prompt: '/fff/ /iii/ /n/', answer: 'fin' },
    { prompt: '/rrr/ /uuu/ /g/', answer: 'rug' },
    { prompt: '/lll/ /aaa/ /p/', answer: 'lap' },
    { prompt: '/mmm/ /ooo/ /p/', answer: 'mop' },
    { prompt: '/nnn/ /eee/ /t/', answer: 'net' },
    { prompt: '/sss/ /uuu/ /n/', answer: 'sun' },
    { prompt: '/fff/ /aaa/ /n/', answer: 'fan' },
    { prompt: '/rrr/ /eee/ /d/', answer: 'red' },
  ],
};

const PM_ITEMS = {
  PHONEME_DELETION: [
    { prompt: 'Say "mat" without /m/', answer: 'at' },
    { prompt: 'Say "stop" without /s/', answer: 'top' },
    { prompt: 'Say "blend" without /b/', answer: 'lend' },
    { prompt: 'Say "slip" without /s/', answer: 'lip' },
    { prompt: 'Say "cart" without /k/', answer: 'art' },
    { prompt: 'Say "frog" without /f/', answer: 'rog' },
    { prompt: 'Say "spin" without /p/', answer: 'sin' },
    { prompt: 'Say "plank" without /l/', answer: 'pank' },
    { prompt: 'Say "stripe" without /r/', answer: 'stipe' },
    { prompt: 'Say "clam" without /l/', answer: 'cam' },
  ],
  PHONEME_ADDITION: [
    { prompt: 'Add /s/ to "top"', answer: 'stop' },
    { prompt: 'Add /b/ to "ring"', answer: 'bring' },
    { prompt: 'Add /s/ to "lip"', answer: 'slip' },
    { prompt: 'Add /t/ to "rail"', answer: 'trail' },
    { prompt: 'Add /k/ to "lap"', answer: 'clap' },
    { prompt: 'Add /p/ to "lay"', answer: 'play' },
    { prompt: 'Add /g/ to "row"', answer: 'grow' },
    { prompt: 'Add /s/ to "nail"', answer: 'snail' },
    { prompt: 'Add /f/ to "lock"', answer: 'flock' },
    { prompt: 'Add /s/ to "wing"', answer: 'swing' },
  ],
  PHONEME_SUBSTITUTION: [
    { prompt: 'Change /m/ in "mat" to /b/', answer: 'bat' },
    { prompt: 'Change /s/ in "sit" to /f/', answer: 'fit' },
    { prompt: 'Change /d/ in "dog" to /l/', answer: 'log' },
    { prompt: 'Change /k/ in "cap" to /m/', answer: 'map' },
    { prompt: 'Change /h/ in "hot" to /p/', answer: 'pot' },
    { prompt: 'Change /r/ in "run" to /s/', answer: 'sun' },
    { prompt: 'Change /b/ in "big" to /d/', answer: 'dig' },
    { prompt: 'Change /t/ in "tip" to /s/', answer: 'sip' },
    { prompt: 'Change /g/ in "game" to /n/', answer: 'name' },
    { prompt: 'Change /p/ in "pin" to /w/', answer: 'win' },
  ],
};

const TARGET_LABELS = {
  'NLM_RETELL': 'Retell',
  'NLM_QUESTIONS': 'Questions',
  'DECODING_FLUENCY': 'Decoding Fluency',
  'PHONEME_SEGMENTATION': 'Segmentation',
  'PHONEME_BLENDING': 'Blending',
  'FIRST_SOUNDS': 'First Sounds',
  'CONTINUOUS_PHONEME_BLENDING': 'Cont. Blending',
  'PHONEME_DELETION': 'Deletion',
  'PHONEME_ADDITION': 'Addition',
  'PHONEME_SUBSTITUTION': 'Substitution',
  'IRREGULAR_WORDS': 'Irregular Words',
  'LETTER_SOUNDS': 'Letter Sounds',
  'LETTER_NAMES': 'Letter Names',
  'CLOSED_SYLLABLES': 'Closed Syllables',
  'VCE': 'VCe',
  'BASIC_AFFIXES': 'Basic Affixes',
  'VOWEL_TEAMS': 'Vowel Teams',
  'VOWEL_R_CONTROLLED': 'R-Controlled',
  'ADVANCED_AFFIXES': 'Adv. Affixes',
  'COMPLEX_VOWELS': 'Complex Vowels',
  'ADVANCED_WORD_FORMS': 'Adv. Word Forms',
  'ACCURACY': 'Accuracy (%)',
  'WORDS_IN_CONTEXT': 'Words in Context',
  'PROSODY': 'Prosody Rating',
};

function formatTarget(key) {
  return TARGET_LABELS[key] || key.replace(/_/g, ' ');
}

export default function Assess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedStudent = searchParams.get('student');

  const [step, setStep] = useState('setup');
  const [students, setStudents] = useState([]);
  const [subtests, setSubtests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Setup form
  const [selectedStudent, setSelectedStudent] = useState(preselectedStudent || '');
  const [selectedSubtest, setSelectedSubtest] = useState('');
  const [timeOfYear, setTimeOfYear] = useState('BOY');
  const [assessmentType, setAssessmentType] = useState('benchmark');
  const [scoringMode, setScoringMode] = useState('manual');

  // Scoring
  const [session, setSession] = useState(null);
  const [scores, setScores] = useState({});
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    Promise.all([api.getMyStudents(), api.getSubtests()])
      .then(([s, st]) => { setStudents(s); setSubtests(st); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedStudentObj = students.find((s) => String(s.id) === String(selectedStudent));
  const selectedSubtestObj = subtests.find((s) => s.id === selectedSubtest);

  const handleStart = async () => {
    if (!selectedStudent || !selectedSubtest) return;
    const student = students.find((s) => String(s.id) === String(selectedStudent));

    const sess = await api.startTest({
      student_id: Number(selectedStudent),
      subtest: selectedSubtest,
      grade_at_test: student.grade,
      academic_year: CURRENT_YEAR,
      time_of_year: timeOfYear,
      assessment_type: assessmentType,
    });
    setSession(sess);

    const initialScores = {};
    for (const target of selectedSubtestObj.targets) {
      initialScores[target] = '';
    }
    setScores(initialScores);
    setStep('scoring');
  };

  const handleSubmitScores = async () => {
    const scoreEntries = Object.entries(scores)
      .filter(([, v]) => v !== '' && v !== null)
      .map(([target, value]) => ({
        target,
        raw_score: Number(value),
      }));

    if (scoreEntries.length === 0) return;

    await api.addManualScores(session.id, scoreEntries);
    await api.completeTest(session.id);

    const recs = await api.getRecommendations(session.id);
    setRecommendations(recs);
    const updatedSession = await api.getTestSession(session.id);
    setSession(updatedSession);
    setStep('results');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
    </div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Administer Assessment</h1>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {['Setup', 'Score', 'Results'].map((label, i) => {
          const stepNames = ['setup', 'scoring', 'results'];
          const isActive = stepNames.indexOf(step) >= i;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                isActive ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{i + 1}</div>
              <span className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
              {i < 2 && <div className={`w-12 h-0.5 ${isActive ? 'bg-primary-600' : 'bg-gray-200'}`} />}
            </div>
          );
        })}
      </div>

      {/* Setup Step */}
      {step === 'setup' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.last_name}, {s.first_name} (Grade {s.grade})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtest</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subtests
                .filter((st) => !selectedStudentObj || st.grades.includes(selectedStudentObj.grade))
                .map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedSubtest(st.id)}
                    className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                      selectedSubtest === st.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">{st.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {st.targets.length} targets | {st.category}
                    </p>
                  </button>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time of Year</label>
              <select
                value={timeOfYear}
                onChange={(e) => setTimeOfYear(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="BOY">Beginning of Year (BOY)</option>
                <option value="MOY">Middle of Year (MOY)</option>
                <option value="EOY">End of Year (EOY)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Type</label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="benchmark">Benchmark</option>
                <option value="progress_monitoring">Progress Monitoring</option>
              </select>
            </div>
          </div>

          {/* Scoring Mode — only show for NLM subtests which support IntelliScore */}
          {selectedSubtestObj?.category === 'NLM' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scoring Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setScoringMode('manual')}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    scoringMode === 'manual'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <PenLine className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-sm text-gray-900">Manual Scoring</span>
                  </div>
                  <p className="text-xs text-gray-500">Enter scores by hand after administering the test</p>
                </button>
                <button
                  onClick={() => setScoringMode('intelliscore')}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    scoringMode === 'intelliscore'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Wand2 className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-sm text-gray-900">IntelliScore</span>
                  </div>
                  <p className="text-xs text-gray-500">Record audio, auto-transcribe, and AI-analyze</p>
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={!selectedStudent || !selectedSubtest}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            Start Assessment
          </button>
        </div>
      )}

      {/* Scoring Step */}
      {step === 'scoring' && (
        <div className="space-y-5">
          <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Student:</span> {selectedStudentObj?.first_name} {selectedStudentObj?.last_name} |{' '}
              <span className="font-medium">Subtest:</span> {selectedSubtestObj?.name} |{' '}
              <span className="font-medium">Period:</span> {timeOfYear} {CURRENT_YEAR}
              {scoringMode === 'intelliscore' && (
                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">IntelliScore</span>
              )}
            </p>
            <button onClick={() => setStep('setup')} className="text-sm text-blue-600 hover:underline">Change</button>
          </div>

          {/* IntelliScore Panel */}
          {scoringMode === 'intelliscore' && session && (
            <IntelliScore
              sessionId={session.id}
              onScoresReady={(analysis) => {
                if (analysis.sub_scores) {
                  const newScores = { ...scores };
                  if ('NLM_RETELL' in newScores) {
                    newScores['NLM_RETELL'] = String(analysis.total_retell_score);
                  }
                  setScores(newScores);
                }
              }}
            />
          )}

          {/* NLM Reading — Stimulus + Timed Reading + Retell + Questions */}
          {selectedSubtest === 'NLM_READING' && scoringMode === 'manual' && (
            <NLMReadingFlow
              grade={selectedStudentObj?.grade}
              timeOfYear={timeOfYear}
              assessmentType={assessmentType}
              scores={scores}
              setScores={setScores}
            />
          )}

          {/* NLM Listening — Retell + Questions (no timed reading) */}
          {selectedSubtest === 'NLM_LISTENING' && scoringMode === 'manual' && (
            <NLMListeningFlow
              grade={selectedStudentObj?.grade}
              scores={scores}
              setScores={setScores}
            />
          )}

          {/* DDM subtests */}
          {selectedSubtest === 'DDM_OM' && (
            <DDMOMFlow scores={scores} setScores={setScores} />
          )}
          {selectedSubtest === 'DDM_DI' && (
            <DDMDIFlow scores={scores} setScores={setScores} />
          )}
          {selectedSubtest === 'DDM_PA' && (
            <DDMPAFlow scores={scores} setScores={setScores} />
          )}
          {selectedSubtest === 'DDM_PM' && (
            <DDMPMFlow scores={scores} setScores={setScores} />
          )}

          {/* Fallback manual entry for any targets not covered by specialized UIs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <h3 className="text-sm font-semibold text-gray-700">Score Summary / Manual Entry</h3>
            <div className="space-y-4">
              {Object.keys(scores).map((target) => (
                <div key={target} className="flex items-center gap-4">
                  <label className="w-48 text-sm font-medium text-gray-700">{formatTarget(target)}</label>
                  <input
                    type="number"
                    value={scores[target]}
                    onChange={(e) => setScores((prev) => ({ ...prev, [target]: e.target.value }))}
                    placeholder="Score"
                    min="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {scores[target] !== '' && <span className="text-green-600 text-xs font-medium">Set</span>}
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={() => setStep('setup')} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Back</button>
              <button onClick={handleSubmitScores} className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">Submit Scores</button>
            </div>
          </div>
        </div>
      )}

      {/* Results Step */}
      {step === 'results' && session && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h2 className="text-lg font-semibold text-gray-900">Assessment Complete</h2>
            </div>

            <div className="space-y-3">
              {session.scores.map((score) => (
                <div key={score.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <span className="font-medium text-gray-900">{formatTarget(score.target)}</span>
                    {score.sub_target && (
                      <span className="text-sm text-gray-500 ml-2">({score.sub_target})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">{score.raw_score ?? '—'}</span>
                    {score.risk_level && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        score.risk_level === 'benchmark' || score.risk_level === 'advanced'
                          ? 'bg-green-100 text-green-700'
                          : score.risk_level === 'moderate'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {score.risk_level.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
              <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5" /> Intervention Recommendations
              </h3>
              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 border border-amber-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {formatTarget(rec.target)}
                        {rec.sub_target && ` — ${rec.sub_target}`}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        rec.risk_level === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>{rec.risk_level}</span>
                    </div>
                    <p className="text-sm text-gray-600">{rec.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/students/${session.student_id}`)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View Student Profile
            </button>
            <button
              onClick={() => { setStep('setup'); setSession(null); setScores({}); setRecommendations([]); }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              New Assessment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   NLM Reading Flow — Timed reading → Retell → Questions
   ═══════════════════════════════════════════════════════════════ */
function NLMReadingFlow({ grade, timeOfYear, assessmentType, scores, setScores }) {
  const [phase, setPhase] = useState('reading');
  const [story, setStory] = useState(null);
  const [storyLoading, setStoryLoading] = useState(true);

  useEffect(() => {
    setStoryLoading(true);
    const toy = timeOfYear || 'BOY';
    api.getStories(grade || '1', toy, assessmentType || 'benchmark')
      .then((res) => {
        const stories = res?.stories || [];
        if (stories.length > 0) {
          setStory({ passage: stories[0].text, title: stories[0].title });
        } else {
          setStory(null);
        }
      })
      .catch(() => setStory(null))
      .finally(() => setStoryLoading(false));
  }, [grade, timeOfYear, assessmentType]);

  return (
    <div className="space-y-4">
      {/* Phase tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'reading', label: 'Reading Fluency', icon: BookOpen },
          { id: 'retell', label: 'Retell Scoring', icon: Mic },
          { id: 'questions', label: 'Questions', icon: FileText },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPhase(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
              phase === id ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Timed Reading Phase */}
      {phase === 'reading' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {storyLoading ? (
            <div className="text-center py-8 text-gray-400">Loading stimulus story...</div>
          ) : !story?.passage ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No stimulus story available for Grade {grade}, {timeOfYear}</p>
              <p className="text-xs text-gray-400">Enter CWPM and Accuracy scores manually below.</p>
            </div>
          ) : (
            <TimedReading
              passage={story.passage}
              title={story.title || `Grade ${grade} — ${timeOfYear}`}
              onComplete={(results) => {
                setScores(prev => ({
                  ...prev,
                  DECODING_FLUENCY: String(results.cwpm),
                  ACCURACY: String(results.accuracy),
                }));
                setPhase('retell');
              }}
            />
          )}
        </div>
      )}

      {/* Retell Scoring Phase */}
      {phase === 'retell' && (
        <RetellScoring
          gradeLevel={grade}
          onComplete={(retellScores) => {
            setScores(prev => ({ ...prev, NLM_RETELL: String(retellScores.total || 0) }));
            setPhase('questions');
          }}
        />
      )}

      {/* Questions Scoring Phase */}
      {phase === 'questions' && (
        <QuestionsScoring
          onComplete={(questionScores) => {
            setScores(prev => ({ ...prev, NLM_QUESTIONS: String(questionScores.total || 0) }));
          }}
        />
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   NLM Listening Flow — Retell → Questions (no timed reading)
   ═══════════════════════════════════════════════════════════════ */
function NLMListeningFlow({ grade, scores, setScores }) {
  const [phase, setPhase] = useState('retell');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'retell', label: 'Retell Scoring', icon: Mic },
          { id: 'questions', label: 'Questions', icon: FileText },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPhase(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
              phase === id ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {phase === 'retell' && (
        <RetellScoring
          gradeLevel={grade}
          onComplete={(retellScores) => {
            setScores(prev => ({ ...prev, NLM_RETELL: String(retellScores.total || 0) }));
            setPhase('questions');
          }}
        />
      )}

      {phase === 'questions' && (
        <QuestionsScoring
          onComplete={(questionScores) => {
            setScores(prev => ({ ...prev, NLM_QUESTIONS: String(questionScores.total || 0) }));
          }}
        />
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DDM Orthographic Mapping Flow
   ═══════════════════════════════════════════════════════════════ */
function DDMOMFlow({ scores, setScores }) {
  return (
    <div className="space-y-4">
      {Object.keys(scores).map((target) => {
        const isGrid = ['IRREGULAR_WORDS', 'LETTER_SOUNDS', 'LETTER_NAMES'].includes(target);
        if (!isGrid) return null;
        return (
          <DDMGridScoring
            key={target}
            target={target}
            onComplete={(result) => {
              setScores(prev => ({ ...prev, [target]: String(result.score) }));
            }}
          />
        );
      })}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DDM Decoding Inventory Flow
   ═══════════════════════════════════════════════════════════════ */
function DDMDIFlow({ scores, setScores }) {
  return (
    <div className="space-y-4">
      {Object.keys(scores).map((target) => (
        <DDMWordListScoring
          key={target}
          target={target}
          onComplete={(result) => {
            setScores(prev => ({ ...prev, [target]: String(result.score) }));
          }}
        />
      ))}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DDM Phonemic Awareness Flow
   ═══════════════════════════════════════════════════════════════ */
function DDMPAFlow({ scores, setScores }) {
  return (
    <div className="space-y-4">
      {Object.keys(scores).map((target) => (
        <DDMPhonemeScoring
          key={target}
          target={target}
          items={PA_ITEMS[target] || DEFAULT_PHONEME_ITEMS}
          onComplete={(result) => {
            setScores(prev => ({ ...prev, [target]: String(result.score) }));
          }}
        />
      ))}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DDM Phoneme Manipulation Flow
   ═══════════════════════════════════════════════════════════════ */
function DDMPMFlow({ scores, setScores }) {
  return (
    <div className="space-y-4">
      {Object.keys(scores).map((target) => (
        <DDMPhonemeScoring
          key={target}
          target={target}
          items={PM_ITEMS[target] || DEFAULT_PHONEME_ITEMS}
          onComplete={(result) => {
            setScores(prev => ({ ...prev, [target]: String(result.score) }));
          }}
        />
      ))}
    </div>
  );
}
