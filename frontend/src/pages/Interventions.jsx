import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BookOpen, Search, X, ExternalLink, ChevronDown } from 'lucide-react';

const SKILL_COLORS = {
  phonemic_awareness: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-l-purple-500' },
  phonics: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-l-blue-500' },
  fluency: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-l-green-500' },
  vocabulary: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-l-amber-500' },
  comprehension: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-l-rose-500' },
};

const EVIDENCE_BADGE = {
  strong: 'bg-green-100 text-green-700',
  moderate: 'bg-amber-100 text-amber-700',
  emerging: 'bg-blue-100 text-blue-700',
};

const SKILL_OPTIONS = ['phonemic_awareness', 'phonics', 'fluency', 'vocabulary', 'comprehension'];
const GRADE_OPTIONS = ['K', '1', '2', '3', '4', '5', '6', '7', '8'];
const EVIDENCE_OPTIONS = ['strong', 'moderate', 'emerging'];

export default function Interventions() {
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [skillArea, setSkillArea] = useState('');
  const [grade, setGrade] = useState('');
  const [evidenceLevel, setEvidenceLevel] = useState('');
  const [selectedIntervention, setSelectedIntervention] = useState(null);
  const [students, setStudents] = useState([]);
  const [assignStudentId, setAssignStudentId] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');

  const loadInterventions = () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (skillArea) params.skill_area = skillArea;
    if (grade) params.grade = grade;
    if (evidenceLevel) params.evidence_level = evidenceLevel;
    api.listInterventions(params)
      .then(setInterventions)
      .catch(() => setInterventions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadInterventions(); }, [skillArea, grade, evidenceLevel]);

  useEffect(() => {
    const timeout = setTimeout(loadInterventions, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    api.getAllStudents().then(setStudents).catch(() => {});
  }, []);

  const skillBreakdown = SKILL_OPTIONS.reduce((acc, skill) => {
    acc[skill] = interventions.filter((i) => i.skill_area === skill).length;
    return acc;
  }, {});

  const handleAssign = async () => {
    if (!assignStudentId || !selectedIntervention) return;
    setAssigning(true);
    setAssignMsg('');
    try {
      await api.assignIntervention({
        intervention_id: selectedIntervention.id,
        student_id: Number(assignStudentId),
      });
      setAssignMsg('Intervention assigned successfully.');
      setShowAssign(false);
      setAssignStudentId('');
    } catch {
      setAssignMsg('Failed to assign intervention.');
    }
    setAssigning(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intervention Library</h1>
          <p className="text-sm text-gray-500">Browse evidence-based interventions and assign to students</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{interventions.length}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          {SKILL_OPTIONS.map((skill) => {
            const c = SKILL_COLORS[skill] || {};
            return (
              <button
                key={skill}
                onClick={() => setSkillArea(skillArea === skill ? '' : skill)}
                className={`text-center px-3 py-1.5 rounded-lg transition-colors ${
                  skillArea === skill ? `${c.bg} ring-2 ring-offset-1 ring-primary-300` : 'hover:bg-gray-50'
                }`}
              >
                <p className="text-lg font-bold text-gray-900">{skillBreakdown[skill] || 0}</p>
                <p className={`text-[10px] font-medium capitalize ${c.text || 'text-gray-500'}`}>
                  {skill.replace(/_/g, ' ')}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search interventions…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={skillArea}
            onChange={(e) => setSkillArea(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Skill Areas</option>
            {SKILL_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Grades</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>
          <select
            value={evidenceLevel}
            onChange={(e) => setEvidenceLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Evidence Levels</option>
            {EVIDENCE_OPTIONS.map((e) => (
              <option key={e} value={e} className="capitalize">{e}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
        </div>
      ) : interventions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
          No interventions match the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {interventions.map((item) => {
            const sc = SKILL_COLORS[item.skill_area] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-l-gray-400' };
            const eb = EVIDENCE_BADGE[item.evidence_level] || 'bg-gray-100 text-gray-600';
            return (
              <button
                key={item.id}
                onClick={() => { setSelectedIntervention(item); setAssignMsg(''); setShowAssign(false); }}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${sc.border} p-5 text-left hover:shadow-md hover:border-primary-200 transition-all group`}
              >
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-2">
                  {item.title}
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${sc.bg} ${sc.text}`}>
                    {(item.skill_area || '').replace(/_/g, ' ')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${eb}`}>
                    {item.evidence_level}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  {item.grade_range && <span>Grades {item.grade_range}</span>}
                  {item.duration && <span>{item.duration}</span>}
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {item.description}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  View details <ExternalLink className="w-3 h-3" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedIntervention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-lg font-semibold text-gray-900">{selectedIntervention.title}</h2>
              <button onClick={() => setSelectedIntervention(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                {selectedIntervention.skill_area && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                    (SKILL_COLORS[selectedIntervention.skill_area] || {}).bg || 'bg-gray-50'
                  } ${(SKILL_COLORS[selectedIntervention.skill_area] || {}).text || 'text-gray-700'}`}>
                    {selectedIntervention.skill_area.replace(/_/g, ' ')}
                  </span>
                )}
                {selectedIntervention.evidence_level && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                    EVIDENCE_BADGE[selectedIntervention.evidence_level] || 'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedIntervention.evidence_level} evidence
                  </span>
                )}
                {selectedIntervention.grade_range && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Grades {selectedIntervention.grade_range}
                  </span>
                )}
                {selectedIntervention.duration && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {selectedIntervention.duration}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Description</h3>
                <p className="text-sm text-gray-600 whitespace-pre-line">{selectedIntervention.description}</p>
              </div>

              {selectedIntervention.materials && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Materials</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{selectedIntervention.materials}</p>
                </div>
              )}

              {selectedIntervention.instructions && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Step-by-Step Instructions</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{selectedIntervention.instructions}</p>
                </div>
              )}

              {assignMsg && (
                <p className={`text-sm ${assignMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                  {assignMsg}
                </p>
              )}

              {showAssign ? (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <label className="block text-xs font-medium text-gray-600">Select Student</label>
                  <select
                    value={assignStudentId}
                    onChange={(e) => setAssignStudentId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Choose student…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAssign}
                      disabled={assigning || !assignStudentId}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                    >
                      {assigning ? 'Assigning…' : 'Assign'}
                    </button>
                    <button
                      onClick={() => { setShowAssign(false); setAssignStudentId(''); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAssign(true)}
                  className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Assign to Student
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
