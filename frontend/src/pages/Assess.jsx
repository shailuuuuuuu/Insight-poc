import { useState, useEffect, useRef } from 'react';
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

  const [nextSubtestSuggestions, setNextSubtestSuggestions] = useState([]);

  const selectedStudentObj = students.find((s) => String(s.id) === String(selectedStudent));
  const selectedSubtestObj = subtests.find((s) => s.id === selectedSubtest);

  useEffect(() => {
    if (selectedStudent) {
      api.getNextSubtest(Number(selectedStudent)).then(setNextSubtestSuggestions).catch(() => setNextSubtestSuggestions([]));
    } else {
      setNextSubtestSuggestions([]);
    }
  }, [selectedStudent]);

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

          {nextSubtestSuggestions.length > 0 && nextSubtestSuggestions[0].subtest && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700 uppercase">Recommended Next Subtest</p>
              {nextSubtestSuggestions.filter(s => s.subtest).map((s, i) => (
                <button key={i} onClick={() => setSelectedSubtest(s.subtest)}
                  className="w-full text-left p-2 rounded bg-white border border-blue-200 hover:bg-blue-50 text-sm">
                  <span className="font-medium text-blue-800">{s.subtest.replace(/_/g, ' ')}</span>
                  <span className="text-blue-600 text-xs ml-2">— {s.reason}</span>
                </button>
              ))}
            </div>
          )}

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
                  setScores(prev => {
                    const updated = { ...prev };
                    if ('NLM_RETELL' in updated) {
                      updated['NLM_RETELL'] = String(analysis.total_retell_score);
                    }
                    return updated;
                  });
                }
              }}
            />
          )}

          {/* Manual score entry for targets IntelliScore can't fill */}
          {scoringMode === 'intelliscore' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Additional Scores (Manual Entry)</h3>
              <p className="text-xs text-gray-500">
                IntelliScore fills the Retell score automatically. Enter scores for other targets below.
              </p>
              <div className="space-y-3">
                {Object.keys(scores).filter(t => t !== 'NLM_RETELL').map((target) => (
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
            </div>
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

          {/* Personal Generation */}
          {selectedSubtest === 'PERSONAL_GENERATION' && scoringMode === 'manual' && (
            <PersonalGenerationFlow scores={scores} setScores={setScores} />
          )}

          {/* Dynamic Assessment */}
          {(selectedSubtest === 'NLM_LISTENING' || selectedSubtest === 'NLM_READING') && scoringMode === 'manual' && (
            <DynamicAssessmentPanel />
          )}

          {/* Score Summary / Manual Entry */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <h3 className="text-sm font-semibold text-gray-700">Score Summary</h3>
            <div className="space-y-3">
              {Object.keys(scores).map((target) => {
                const hasValue = scores[target] !== '' && scores[target] !== null && scores[target] !== undefined;
                return (
                  <div key={target} className={`flex items-center gap-4 p-3 rounded-lg ${hasValue ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <label className="w-48 text-sm font-medium text-gray-700">{formatTarget(target)}</label>
                    <input
                      type="number"
                      value={scores[target]}
                      onChange={(e) => setScores((prev) => ({ ...prev, [target]: e.target.value }))}
                      placeholder="—"
                      min="0"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                    {hasValue ? (
                      <span className="text-green-600 text-xs font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> {scores[target]}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Not set</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Count of filled vs total */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {Object.values(scores).filter(v => v !== '' && v !== null && v !== undefined).length} of {Object.keys(scores).length} scores entered
              </span>
              {Object.values(scores).some(v => v === '' || v === null || v === undefined) && (
                <span className="text-xs text-amber-600">Some scores are missing</span>
              )}
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

      {/* Student View & PDF buttons */}
      {story?.passage && (
        <div className="flex gap-2">
          <button onClick={() => window.open(`/student-reading?grade=${grade}&toy=${timeOfYear}`, '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100">
            <BookOpen className="w-3.5 h-3.5" /> Open Student Reading View
          </button>
          <button onClick={() => {
            const win = window.open('', '_blank');
            win.document.write(`<html><head><title>${story.title || 'Story'}</title><style>body{font-family:serif;font-size:20px;max-width:700px;margin:40px auto;line-height:1.8;padding:20px}h1{text-align:center;font-size:24px;margin-bottom:30px}</style></head><body><h1>${story.title || ''}</h1><p>${story.passage}</p></body></html>`);
            win.document.close();
            setTimeout(() => win.print(), 500);
          }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100">
            <FileText className="w-3.5 h-3.5" /> Download Stimulus PDF
          </button>
        </div>
      )}

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
  const timeLimits = { IRREGULAR_WORDS: 60, LETTER_SOUNDS: 60, LETTER_NAMES: 120 };
  return (
    <div className="space-y-4">
      {Object.keys(scores).map((target) => {
        const isGrid = ['IRREGULAR_WORDS', 'LETTER_SOUNDS', 'LETTER_NAMES'].includes(target);
        if (!isGrid) return null;
        return (
          <DDMGridScoring
            key={target}
            target={target}
            timeLimit={timeLimits[target] || 60}
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


/* ═══════════════════════════════════════════════════════════════
   Personal Generation Flow — Oral story + Written story
   ═══════════════════════════════════════════════════════════════ */
function PersonalGenerationFlow({ scores, setScores }) {
  const [oralText, setOralText] = useState('');
  const [writtenText, setWrittenText] = useState('');
  const [oralRecording, setOralRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        setOralRecording(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch { /* mic access denied */ }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Mic className="w-4 h-4" /> Oral Story</h3>
        <p className="text-sm text-gray-500">Ask the student to tell a personal story about something that happened to them. Record or transcribe below.</p>
        <div className="flex gap-2">
          {!isRecording ? (
            <button onClick={startRecording} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1.5">
              <Mic className="w-4 h-4" /> Record
            </button>
          ) : (
            <button onClick={stopRecording} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 flex items-center gap-1.5 animate-pulse">
              Stop Recording
            </button>
          )}
        </div>
        {oralRecording && <audio src={oralRecording} controls className="w-full mt-2" />}
        <textarea value={oralText} onChange={(e) => setOralText(e.target.value)} placeholder="Transcribe the oral story here..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-32 outline-none focus:ring-2 focus:ring-primary-500" />
        <button onClick={() => setScores(prev => ({ ...prev, ORAL_STORY: oralText ? '1' : '0' }))}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Save Oral Story
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4" /> Written Story</h3>
        <p className="text-sm text-gray-500">Have the student write their personal story. Enter the text below or note a score.</p>
        <textarea value={writtenText} onChange={(e) => setWrittenText(e.target.value)} placeholder="Enter the student's written story..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-32 outline-none focus:ring-2 focus:ring-primary-500" />
        <button onClick={() => setScores(prev => ({ ...prev, WRITTEN_STORY: writtenText ? '1' : '0' }))}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Save Written Story
        </button>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   Dynamic Assessment Panel — Teaching scripts + Responsiveness Scale
   ═══════════════════════════════════════════════════════════════ */
function DynamicAssessmentPanel() {
  const [show, setShow] = useState(false);
  const [responsiveness, setResponsiveness] = useState(null);
  const [notes, setNotes] = useState('');

  if (!show) {
    return (
      <button onClick={() => setShow(true)}
        className="w-full text-left bg-purple-50 border border-purple-200 rounded-xl p-4 hover:bg-purple-100 transition-colors">
        <p className="text-sm font-medium text-purple-800">Dynamic Assessment (Optional)</p>
        <p className="text-xs text-purple-600 mt-1">Use teaching scripts and rate language responsiveness after intervention questions.</p>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-purple-900">Dynamic Assessment</h3>
        <button onClick={() => setShow(false)} className="text-sm text-gray-500 hover:text-gray-700">Collapse</button>
      </div>

      <div className="bg-purple-50 rounded-lg p-4 text-sm text-purple-800 space-y-2">
        <p className="font-semibold">Teaching Script:</p>
        <ol className="list-decimal ml-4 space-y-1">
          <li>Ask the inferential question (e.g., "Why did the character feel that way?")</li>
          <li>If incorrect: Provide a teaching prompt — "Let's look at what happened in the story..."</li>
          <li>Re-read the relevant section and ask the question again.</li>
          <li>Rate the student's responsiveness to teaching on the scale below.</li>
        </ol>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Language Responsiveness Scale</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4].map(val => (
            <button key={val} onClick={() => setResponsiveness(val)}
              className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                responsiveness === val ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}>
              {val}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
          <span>0 = No response</span>
          <span>4 = Full transfer</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations about student's response to teaching..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-20 outline-none focus:ring-2 focus:ring-purple-500" />
      </div>

      {responsiveness !== null && (
        <div className="bg-purple-100 rounded-lg p-3 text-sm text-purple-800">
          Responsiveness Score: <strong>{responsiveness}</strong>/4
        </div>
      )}
    </div>
  );
}
