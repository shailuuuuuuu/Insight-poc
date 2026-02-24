import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, ClipboardList, TrendingUp, AlertTriangle, Edit3, Archive, RotateCcw, Plus, X, Save, Pencil, Play, Clock } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const RISK_BADGE = {
  advanced: 'bg-blue-100 text-blue-700',
  benchmark: 'bg-green-100 text-green-700',
  moderate: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const SUBTEST_LABELS = {
  'NLM_LISTENING': 'NLM Listening',
  'NLM_READING': 'NLM Reading',
  'DDM_PA': 'DDM Phonemic Awareness',
  'DDM_PM': 'DDM Phoneme Manipulation',
  'DDM_OM': 'DDM Orthographic Mapping',
  'DDM_DI': 'DDM Decoding Inventory',
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
};

const COMBO_LABELS = {
  'NLM_LISTENING_NLM_RETELL': 'NLM Listening — Retell',
  'NLM_LISTENING_NLM_QUESTIONS': 'NLM Listening — Questions',
  'NLM_READING_NLM_RETELL': 'NLM Reading — Retell',
  'NLM_READING_NLM_QUESTIONS': 'NLM Reading — Questions',
  'NLM_READING_DECODING_FLUENCY': 'Decoding Fluency',
  'DDM_PA_PHONEME_SEGMENTATION': 'PA — Segmentation',
  'DDM_PA_PHONEME_BLENDING': 'PA — Blending',
  'DDM_PA_FIRST_SOUNDS': 'PA — First Sounds',
  'DDM_PA_CONTINUOUS_PHONEME_BLENDING': 'PA — Cont. Blending',
  'DDM_PM_PHONEME_DELETION': 'PM — Deletion',
  'DDM_PM_PHONEME_ADDITION': 'PM — Addition',
  'DDM_PM_PHONEME_SUBSTITUTION': 'PM — Substitution',
  'DDM_OM_IRREGULAR_WORDS': 'OM — Irregular Words',
  'DDM_OM_LETTER_SOUNDS': 'OM — Letter Sounds',
  'DDM_OM_LETTER_NAMES': 'OM — Letter Names',
  'DDM_DI_CLOSED_SYLLABLES': 'DI — Closed Syllables',
  'DDM_DI_VCE': 'DI — VCe',
  'DDM_DI_BASIC_AFFIXES': 'DI — Basic Affixes',
  'DDM_DI_VOWEL_TEAMS': 'DI — Vowel Teams',
  'DDM_DI_VOWEL_R_CONTROLLED': 'DI — R-Controlled',
  'DDM_DI_ADVANCED_AFFIXES': 'DI — Adv. Affixes',
  'DDM_DI_COMPLEX_VOWELS': 'DI — Complex Vowels',
  'DDM_DI_ADVANCED_WORD_FORMS': 'DI — Adv. Word Forms',
};

function formatComboLabel(key) {
  return COMBO_LABELS[key] || key.replace(/_/g, ' ');
}

function formatSubtest(key) {
  return SUBTEST_LABELS[key] || key.replace(/_/g, ' ');
}

function formatTarget(key) {
  return TARGET_LABELS[key] || key.replace(/_/g, ' ');
}

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showAddScore, setShowAddScore] = useState(false);
  const [benchmarks, setBenchmarks] = useState(null);
  const [editingScore, setEditingScore] = useState(null);
  const [editScoreVal, setEditScoreVal] = useState('');

  const reload = () => {
    Promise.all([
      api.getStudent(id),
      api.getStudentHistory(id),
      api.studentProgress(id),
    ])
      .then(([s, h, p]) => { setStudent(s); setHistory(h); setProgress(p); })
      .catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getStudent(id),
      api.getStudentHistory(id),
      api.studentProgress(id),
      api.getBenchmarks(),
    ])
      .then(([s, h, p, bm]) => { setStudent(s); setHistory(h); setProgress(p); setBenchmarks(bm); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
    </div>;
  }

  if (!student) return <div className="text-gray-500 text-center py-12">Student not found.</div>;

  const subtestGroups = {};
  for (const p of progress) {
    const key = `${p.subtest}_${p.target}`;
    if (!subtestGroups[key]) subtestGroups[key] = [];
    subtestGroups[key].push(p);
  }

  const handleSaveEdit = async () => {
    try {
      const updated = await api.updateStudent(student.id, editForm);
      setStudent(updated);
      setEditing(false);
    } catch { /* ignore */ }
  };

  const handleToggleActive = async () => {
    try {
      if (student.status === 'inactive') {
        await api.setStudentActive(student.id);
      } else {
        await api.setStudentInactive(student.id);
      }
      reload();
    } catch { /* ignore */ }
  };

  const startEdit = () => {
    setEditForm({
      first_name: student.first_name,
      last_name: student.last_name,
      grade: student.grade,
      school: student.school || '',
      student_id_external: student.student_id_external || '',
    });
    setEditing(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button onClick={() => navigate('/students')} className="flex items-center gap-2 text-primary-600 text-sm hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Students
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {student.status === 'inactive' && (
          <div className="mb-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
            <Archive className="w-4 h-4" /> This student is archived (inactive).
          </div>
        )}

        {editing ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Edit Student</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                <input value={editForm.first_name} onChange={(e) => setEditForm(f => ({ ...f, first_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                <input value={editForm.last_name} onChange={(e) => setEditForm(f => ({ ...f, last_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                <input value={editForm.grade} onChange={(e) => setEditForm(f => ({ ...f, grade: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">School</label>
                <input value={editForm.school} onChange={(e) => setEditForm(f => ({ ...f, school: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">External ID</label>
                <input value={editForm.student_id_external} onChange={(e) => setEditForm(f => ({ ...f, student_id_external: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveEdit} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{student.first_name} {student.last_name}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>Grade {student.grade}</span>
                {student.school && <span>{student.school}</span>}
                {student.student_id_external && <span>ID: {student.student_id_external}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={startEdit} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50" title="Edit student">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={handleToggleActive} className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm ${student.status === 'inactive' ? 'border-green-300 text-green-700 hover:bg-green-50' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}`} title={student.status === 'inactive' ? 'Reactivate' : 'Archive'}>
                {student.status === 'inactive' ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                {student.status === 'inactive' ? 'Reactivate' : 'Archive'}
              </button>
              <button
                onClick={() => navigate(`/assess?student=${student.id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                <ClipboardList className="w-4 h-4" /> New Assessment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress Charts */}
      {Object.keys(subtestGroups).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" /> Progress Over Time
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(subtestGroups).map(([key, points]) => {
              const bmKey = key;
              const bmData = benchmarks?.[bmKey];
              const bmVal = bmData?.[student?.grade]?.BOY?.benchmark || bmData?.[student?.grade]?.MOY?.benchmark;
              return (
              <div key={key} className="border border-gray-100 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {formatComboLabel(key)}
                </h3>
                <div className="h-48">
                  <ResponsiveContainer>
                    <LineChart data={points.map((p) => ({
                      name: `${p.time_of_year} ${p.academic_year}`,
                      score: p.raw_score,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      {bmVal && <ReferenceLine y={bmVal} stroke="#22c55e" strokeDasharray="6 3" label={{ value: 'Benchmark', position: 'right', fontSize: 10, fill: '#22c55e' }} />}
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Test History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Test History</h2>
          <button onClick={() => setShowAddScore(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
            <Plus className="w-3.5 h-3.5" /> Add Historical Score
          </button>
        </div>
        {history.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No completed assessments yet.</p>
        ) : (
          <div className="space-y-4">
            {history.map((session) => (
              <div key={session.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium text-gray-900">
                      {formatSubtest(session.subtest)}
                    </span>
                    <span className="text-sm text-gray-500 ml-3">
                      {session.time_of_year} {session.academic_year} | Grade {session.grade_at_test}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {session.has_audio && (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => {
                          const audio = new Audio(`/api/assessments/${session.id}/audio`);
                          audio.play().catch(() => {});
                        }} className="p-1 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700" title="Play recording">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        {session.audio_expires_at && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5" title={`Expires: ${new Date(session.audio_expires_at).toLocaleDateString()}`}>
                            <Clock className="w-3 h-3" />
                            {new Date(session.audio_expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(session.completed_at || session.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {session.scores.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {session.scores.map((score) => (
                      <div key={score.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-medium text-gray-600">
                          {formatTarget(score.target)}
                          {score.sub_target && ` (${score.sub_target})`}
                        </span>
                        {editingScore === score.id ? (
                          <>
                            <input type="number" value={editScoreVal} onChange={(e) => setEditScoreVal(e.target.value)}
                              className="w-16 px-1.5 py-0.5 border border-gray-300 rounded text-sm" autoFocus />
                            <button onClick={async () => {
                              await api.editScore(session.id, score.id, { raw_score: Number(editScoreVal) });
                              setEditingScore(null);
                              reload();
                            }} className="text-green-600 hover:text-green-800"><Save className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingScore(null)} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-bold text-gray-900">{score.raw_score ?? '—'}</span>
                            {score.risk_level && (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${RISK_BADGE[score.risk_level] || 'bg-gray-100 text-gray-500'}`}>
                                {score.risk_level}
                              </span>
                            )}
                            <button onClick={() => { setEditingScore(score.id); setEditScoreVal(String(score.raw_score ?? '')); }}
                              className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"><Pencil className="w-3 h-3" /></button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Historical Score Modal */}
      {showAddScore && (
        <AddHistoricalScoreModal
          studentId={student.id}
          studentGrade={student.grade}
          onClose={() => setShowAddScore(false)}
          onSaved={() => { setShowAddScore(false); reload(); }}
        />
      )}
    </div>
  );
}


function AddHistoricalScoreModal({ studentId, studentGrade, onClose, onSaved }) {
  const SUBTESTS = [
    { value: 'NLM_LISTENING', label: 'NLM Listening', targets: ['NLM_RETELL', 'NLM_QUESTIONS'] },
    { value: 'NLM_READING', label: 'NLM Reading', targets: ['NLM_RETELL', 'NLM_QUESTIONS', 'DECODING_FLUENCY', 'ACCURACY'] },
    { value: 'DDM_PA', label: 'DDM Phonemic Awareness', targets: ['PHONEME_SEGMENTATION', 'PHONEME_BLENDING', 'FIRST_SOUNDS', 'CONTINUOUS_PHONEME_BLENDING'] },
    { value: 'DDM_PM', label: 'DDM Phoneme Manipulation', targets: ['PHONEME_DELETION', 'PHONEME_ADDITION', 'PHONEME_SUBSTITUTION'] },
    { value: 'DDM_OM', label: 'DDM Orthographic Mapping', targets: ['IRREGULAR_WORDS', 'LETTER_SOUNDS', 'LETTER_NAMES'] },
    { value: 'DDM_DI', label: 'DDM Decoding Inventory', targets: ['CLOSED_SYLLABLES', 'VCE', 'BASIC_AFFIXES', 'VOWEL_TEAMS', 'VOWEL_R_CONTROLLED', 'ADVANCED_AFFIXES', 'COMPLEX_VOWELS', 'ADVANCED_WORD_FORMS', 'WORDS_IN_CONTEXT'] },
  ];

  const [subtest, setSubtest] = useState('NLM_LISTENING');
  const [timeOfYear, setTimeOfYear] = useState('BOY');
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [assessmentType, setAssessmentType] = useState('benchmark');
  const [targetScores, setTargetScores] = useState({});
  const [saving, setSaving] = useState(false);

  const currentSubtest = SUBTESTS.find(s => s.value === subtest);

  useEffect(() => {
    if (currentSubtest) {
      const init = {};
      currentSubtest.targets.forEach(t => { init[t] = ''; });
      setTargetScores(init);
    }
  }, [subtest]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const sessionRes = await api.startTest({
        student_id: studentId,
        subtest,
        time_of_year: timeOfYear,
        academic_year: academicYear,
        assessment_type: assessmentType,
        grade_at_test: studentGrade,
      });

      const scoreEntries = Object.entries(targetScores)
        .filter(([, v]) => v !== '')
        .map(([target, raw_score]) => ({
          target,
          raw_score: Number(raw_score),
        }));

      if (scoreEntries.length > 0) {
        await api.addManualScores(sessionRes.id, scoreEntries);
      }
      await api.completeTest(sessionRes.id);
      onSaved();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Historical Score</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-500">Manually enter scores from a prior assessment period.</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Subtest</label>
            <select value={subtest} onChange={(e) => setSubtest(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              {SUBTESTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Time of Year</label>
            <select value={timeOfYear} onChange={(e) => setTimeOfYear(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="BOY">BOY (Fall)</option>
              <option value="MOY">MOY (Winter)</option>
              <option value="EOY">EOY (Spring)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2022-2023">2022-2023</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Assessment Type</label>
            <select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="benchmark">Benchmark</option>
              <option value="progress_monitoring">Progress Monitoring</option>
            </select>
          </div>
        </div>

        <div className="border-t pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Scores</h3>
          {currentSubtest?.targets.map(target => (
            <div key={target} className="flex items-center gap-3">
              <label className="w-40 text-sm text-gray-600">{formatTarget(target)}</label>
              <input
                type="number"
                value={targetScores[target] || ''}
                onChange={(e) => setTargetScores(prev => ({ ...prev, [target]: e.target.value }))}
                placeholder="—"
                min="0"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Score'}
          </button>
        </div>
      </div>
    </div>
  );
}
