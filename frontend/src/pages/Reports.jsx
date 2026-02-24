import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { BarChart3, Download, Filter, Users, Plus, X } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

const RISK_COLORS = { low_risk: '#22c55e', moderate_risk: '#f59e0b', high_risk: '#ef4444' };
const RISK_BADGE = {
  advanced: 'bg-blue-100 text-blue-700',
  benchmark: 'bg-green-100 text-green-700',
  moderate: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const COLUMN_LABELS = {
  'NLM_LISTENING_NLM_RETELL': 'NLM Listening\nRetell',
  'NLM_LISTENING_NLM_QUESTIONS': 'NLM Listening\nQuestions',
  'NLM_READING_NLM_RETELL': 'NLM Reading\nRetell',
  'NLM_READING_NLM_QUESTIONS': 'NLM Reading\nQuestions',
  'NLM_READING_DECODING_FLUENCY': 'Decoding\nFluency',
  'DDM_PA_PHONEME_SEGMENTATION': 'PA\nSegmentation',
  'DDM_PA_PHONEME_BLENDING': 'PA\nBlending',
  'DDM_PA_FIRST_SOUNDS': 'PA\nFirst Sounds',
  'DDM_PA_CONTINUOUS_PHONEME_BLENDING': 'PA\nCont. Blending',
  'DDM_PM_PHONEME_DELETION': 'PM\nDeletion',
  'DDM_PM_PHONEME_ADDITION': 'PM\nAddition',
  'DDM_PM_PHONEME_SUBSTITUTION': 'PM\nSubstitution',
  'DDM_OM_IRREGULAR_WORDS': 'OM\nIrregular Words',
  'DDM_OM_LETTER_SOUNDS': 'OM\nLetter Sounds',
  'DDM_OM_LETTER_NAMES': 'OM\nLetter Names',
  'DDM_DI_CLOSED_SYLLABLES': 'DI\nClosed Syll.',
  'DDM_DI_VCE': 'DI\nVCe',
  'DDM_DI_BASIC_AFFIXES': 'DI\nBasic Affixes',
  'DDM_DI_VOWEL_TEAMS': 'DI\nVowel Teams',
  'DDM_DI_VOWEL_R_CONTROLLED': 'DI\nR-Controlled',
  'DDM_DI_ADVANCED_AFFIXES': 'DI\nAdv. Affixes',
  'DDM_DI_COMPLEX_VOWELS': 'DI\nComplex Vowels',
  'DDM_DI_ADVANCED_WORD_FORMS': 'DI\nAdv. Word Forms',
};

const COLUMN_ORDER = [
  'NLM_LISTENING_NLM_RETELL', 'NLM_LISTENING_NLM_QUESTIONS',
  'NLM_READING_NLM_RETELL', 'NLM_READING_NLM_QUESTIONS', 'NLM_READING_DECODING_FLUENCY',
  'DDM_PA_PHONEME_SEGMENTATION', 'DDM_PA_PHONEME_BLENDING', 'DDM_PA_FIRST_SOUNDS', 'DDM_PA_CONTINUOUS_PHONEME_BLENDING',
  'DDM_PM_PHONEME_DELETION', 'DDM_PM_PHONEME_ADDITION', 'DDM_PM_PHONEME_SUBSTITUTION',
  'DDM_OM_IRREGULAR_WORDS', 'DDM_OM_LETTER_SOUNDS', 'DDM_OM_LETTER_NAMES',
  'DDM_DI_CLOSED_SYLLABLES', 'DDM_DI_VCE', 'DDM_DI_BASIC_AFFIXES', 'DDM_DI_VOWEL_TEAMS',
  'DDM_DI_VOWEL_R_CONTROLLED', 'DDM_DI_ADVANCED_AFFIXES', 'DDM_DI_COMPLEX_VOWELS', 'DDM_DI_ADVANCED_WORD_FORMS',
];

function formatLabel(key) {
  return COLUMN_LABELS[key] || key.replace(/_/g, ' ');
}

function shortLabel(key) {
  const full = COLUMN_LABELS[key];
  if (full) return full.replace('\n', ' ');
  return key.replace(/_/g, ' ');
}

export default function Reports() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('summary');
  const [riskData, setRiskData] = useState([]);
  const [riskTable, setRiskTable] = useState([]);
  const [filters, setFilters] = useState({ academic_year: '2025-2026', time_of_year: '', grade: '', school: '', group_id: '' });
  const [riskFilter, setRiskFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [schools, setSchools] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  useEffect(() => {
    api.listGroups().then(setGroups).catch(() => {});
    api.getAllStudents().then(students => {
      const s = [...new Set(students.filter(st => st.school).map(st => st.school))].sort();
      setSchools(s);
    }).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const tableFilters = { ...cleanFilters };
      if (riskFilter) tableFilters.risk_filter = riskFilter;
      const [summary, table] = await Promise.all([
        api.riskSummary(cleanFilters),
        api.studentRiskTable(tableFilters),
      ]);
      setRiskData(summary);
      setRiskTable(table);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); setSelectedStudentIds([]); }, [filters, riskFilter]);

  const chartData = riskData.map((r) => ({
    name: shortLabel(r.subtest),
    Benchmark: r.low_risk,
    Moderate: r.moderate_risk,
    'High Risk': r.high_risk,
  }));

  const tableColumns = useMemo(() => {
    const allKeys = new Set();
    for (const row of riskTable) {
      for (const key of Object.keys(row.risks || {})) {
        allKeys.add(key);
      }
    }
    return COLUMN_ORDER.filter((k) => allKeys.has(k));
  }, [riskTable]);

  const handleExport = async (type) => {
    const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const blob = await api.exportReport(type, cleanFilters);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cubed3_${type}_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('benchmark')}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Benchmark CSV
          </button>
          <button
            onClick={() => handleExport('detailed')}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Detailed CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filters.academic_year} onChange={(e) => setFilters((p) => ({ ...p, academic_year: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500">
            <option value="2025-2026">2025-2026</option>
            <option value="2024-2025">2024-2025</option>
            <option value="2023-2024">2023-2024</option>
          </select>
          <select value={filters.time_of_year} onChange={(e) => setFilters((p) => ({ ...p, time_of_year: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Periods</option>
            <option value="BOY">BOY</option>
            <option value="MOY">MOY</option>
            <option value="EOY">EOY</option>
          </select>
          <select value={filters.grade} onChange={(e) => setFilters((p) => ({ ...p, grade: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Grades</option>
            {['PreK', 'K', '1', '2', '3', '4', '5', '6', '7', '8'].map((g) => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>
          <select value={filters.school} onChange={(e) => setFilters((p) => ({ ...p, school: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Schools</option>
            {schools.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.group_id} onChange={(e) => setFilters((p) => ({ ...p, group_id: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Groups</option>
            {groups.map((g) => <option key={g.id} value={String(g.id)}>{g.name}</option>)}
          </select>
          {riskFilter && (
            <button onClick={() => setRiskFilter('')} className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200">
              Risk: {riskFilter.split(':')[1]} <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('summary')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'summary' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
          }`}
        >
          Risk Summary
        </button>
        <button
          onClick={() => setTab('table')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
          }`}
        >
          Student Table
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
        </div>
      ) : tab === 'summary' ? (
        <div className="space-y-6">
          {/* Bar Chart */}
          {chartData.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution by Subtest</h2>
              <div style={{ height: Math.max(320, chartData.length * 36 + 60) }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Benchmark" stackId="a" fill={RISK_COLORS.low_risk} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Moderate" stackId="a" fill={RISK_COLORS.moderate_risk} />
                    <Bar dataKey="High Risk" stackId="a" fill={RISK_COLORS.high_risk} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
              No assessment data available for the selected filters.
            </div>
          )}

          {/* Summary Pie Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {riskData.map((r) => {
              const pieData = [
                { name: 'Benchmark', value: r.low_risk, color: '#22c55e' },
                { name: 'Moderate', value: r.moderate_risk, color: '#f59e0b' },
                { name: 'High Risk', value: r.high_risk, color: '#ef4444' },
              ].filter((d) => d.value > 0);

              return (
                <div key={r.subtest} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">
                    {shortLabel(r.subtest)}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">{r.total_students} students assessed</p>

                  <div className="flex items-center gap-4">
                    <div className="w-28 h-28 flex-shrink-0">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            innerRadius={28}
                            outerRadius={50}
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {pieData.map((d, i) => (
                              <Cell key={i} fill={d.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => [`${value} students`, name]}
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex-1 space-y-2">
                      <LegendRow color="#22c55e" label="Benchmark" count={r.low_risk} pct={r.low_risk_pct}
                        onClick={() => { setRiskFilter(`${r.subtest}:benchmark`); setTab('table'); }} />
                      <LegendRow color="#f59e0b" label="Moderate" count={r.moderate_risk} pct={r.moderate_risk_pct}
                        onClick={() => { setRiskFilter(`${r.subtest}:moderate`); setTab('table'); }} />
                      <LegendRow color="#ef4444" label="High Risk" count={r.high_risk} pct={r.high_risk_pct}
                        onClick={() => { setRiskFilter(`${r.subtest}:high`); setTab('table'); }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
        <div className="space-y-3">
          {/* Bulk action bar */}
          {selectedStudentIds.length > 0 && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-primary-700 font-medium">{selectedStudentIds.length} student(s) selected</span>
              <div className="flex gap-2">
                <button onClick={() => setShowCreateGroup(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700">
                  <Users className="w-3.5 h-3.5" /> Create Group
                </button>
                <button onClick={() => setSelectedStudentIds([])} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Clear</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {riskTable.length === 0 || tableColumns.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No data available.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="w-10 px-3 py-3 sticky left-0 bg-gray-50 z-10">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.length === riskTable.length && riskTable.length > 0}
                          onChange={(e) => setSelectedStudentIds(e.target.checked ? riskTable.map(r => r.student_id) : [])}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 sticky left-10 bg-gray-50 z-10 min-w-[160px]">Student</th>
                      <th className="text-left px-3 py-3 font-medium text-gray-500 min-w-[60px]">Grade</th>
                      {tableColumns.map((key) => {
                        const label = formatLabel(key);
                        const lines = label.split('\n');
                        return (
                          <th key={key} className="text-center px-2 py-2 font-medium text-gray-500 min-w-[80px]">
                            <div className="flex flex-col items-center leading-tight">
                              <span className="text-[10px] font-semibold text-gray-400">{lines[0]}</span>
                              {lines[1] && <span className="text-xs">{lines[1]}</span>}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {riskTable.map((row) => {
                      const selected = selectedStudentIds.includes(row.student_id);
                      return (
                        <tr key={row.student_id} className={`border-b border-gray-50 hover:bg-gray-50 ${selected ? 'bg-primary-50/50' : ''}`}>
                          <td className="px-3 py-2.5 sticky left-0 bg-white z-10">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => {
                                setSelectedStudentIds(prev => e.target.checked ? [...prev, row.student_id] : prev.filter(id => id !== row.student_id));
                              }}
                              className="rounded"
                            />
                          </td>
                          <td className="px-4 py-2.5 font-medium text-gray-900 sticky left-10 bg-white z-10">
                            <button onClick={() => navigate(`/students/${row.student_id}`)} className="hover:text-primary-600 hover:underline">
                              {row.student_name}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-gray-600">{row.grade}</td>
                          {tableColumns.map((key) => {
                            const risk = row.risks?.[key];
                            return (
                              <td key={key} className="px-2 py-2.5 text-center">
                                {risk ? (
                                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${RISK_BADGE[risk] || 'bg-gray-100 text-gray-500'}`}>
                                    {risk}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create Group Modal */}
        {showCreateGroup && (
          <CreateGroupModal
            studentIds={selectedStudentIds}
            onClose={() => setShowCreateGroup(false)}
            onCreated={() => {
              setShowCreateGroup(false);
              setSelectedStudentIds([]);
              api.listGroups().then(setGroups).catch(() => {});
            }}
          />
        )}
        </>
      )}
    </div>
  );
}

function CreateGroupModal({ studentIds, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const group = await api.createGroup({ name: name.trim() });
      await api.addStudentsToGroup(group.id, studentIds);
      onCreated();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create Group</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-500">{studentIds.length} student(s) will be added to this group.</p>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Group Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., High Risk NLM"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleCreate} disabled={saving || !name.trim()} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, count, pct, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 w-full text-left hover:bg-gray-50 rounded px-1 py-0.5 transition-colors cursor-pointer">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs text-gray-600 flex-1">{label}</span>
      <span className="text-xs font-bold text-gray-900">{count}</span>
      <span className="text-[10px] text-gray-400 w-10 text-right">({pct}%)</span>
    </button>
  );
}
