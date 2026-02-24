import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Layers, Plus, ChevronRight, Clock, CheckCircle } from 'lucide-react';

const TIER_COLORS = {
  3: { bg: 'bg-red-500', light: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  2: { bg: 'bg-amber-400', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  1: { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
};

const INTERVENTION_TYPES = [
  { value: 'phonics', label: 'Phonics' },
  { value: 'fluency', label: 'Fluency' },
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'comprehension', label: 'Comprehension' },
  { value: 'phonemic_awareness', label: 'Phonemic Awareness' },
];

export default function MTSS() {
  const navigate = useNavigate();
  const [tierSummary, setTierSummary] = useState(null);
  const [activeTierTab, setActiveTierTab] = useState(1);
  const [tierStudents, setTierStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [interventionLogs, setInterventionLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    duration_minutes: 30,
    type: 'phonics',
    fidelity_score: 3,
    notes: '',
  });

  const [tier23Students, setTier23Students] = useState([]);

  useEffect(() => {
    api.tierSummary()
      .then(setTierSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.all([api.tierStudents({ tier: 2 }), api.tierStudents({ tier: 3 })])
      .then(([t2, t3]) => setTier23Students([...t3, ...t2]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setStudentsLoading(true);
    api.tierStudents({ tier: activeTierTab })
      .then(setTierStudents)
      .catch(() => setTierStudents([]))
      .finally(() => setStudentsLoading(false));
  }, [activeTierTab]);

  useEffect(() => {
    if (!selectedStudentId) {
      setInterventionLogs([]);
      return;
    }
    setLogsLoading(true);
    api.getInterventionLogs(selectedStudentId)
      .then(setInterventionLogs)
      .catch(() => setInterventionLogs([]))
      .finally(() => setLogsLoading(false));
  }, [selectedStudentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    setSaving(true);
    setFormMsg('');
    try {
      await api.createInterventionLog({ student_id: Number(selectedStudentId), ...form });
      setFormMsg('Intervention logged successfully.');
      const logs = await api.getInterventionLogs(selectedStudentId);
      setInterventionLogs(logs);
    } catch {
      setFormMsg('Failed to save intervention log.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  const tiers = tierSummary || { tier_1: 0, tier_2: 0, tier_3: 0, total: 1 };
  const total = tiers.total || tiers.tier_1 + tiers.tier_2 + tiers.tier_3 || 1;
  const pct = (n) => Math.round((n / total) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Layers className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MTSS Dashboard</h1>
          <p className="text-sm text-gray-500">Multi-Tiered System of Supports overview and intervention tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Pyramid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Tier Distribution</h2>
          <div className="flex flex-col items-center space-y-1">
            <PyramidRow
              tier={3}
              count={tiers.tier_3}
              pct={pct(tiers.tier_3)}
              widthClass="w-1/3"
            />
            <PyramidRow
              tier={2}
              count={tiers.tier_2}
              pct={pct(tiers.tier_2)}
              widthClass="w-2/3"
            />
            <PyramidRow
              tier={1}
              count={tiers.tier_1}
              pct={pct(tiers.tier_1)}
              widthClass="w-full"
            />
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">{total} total students</p>
        </div>

        {/* Student List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Students by Tier</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-4">
            {[1, 2, 3].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTierTab(t)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTierTab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tier {t}
              </button>
            ))}
          </div>

          {studentsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full" />
            </div>
          ) : tierStudents.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No students in Tier {activeTierTab}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Grade</th>
                    <th className="pb-2 font-medium">School</th>
                    <th className="pb-2 font-medium">Risk Areas</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {tierStudents.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/students/${s.id}`)}
                    >
                      <td className="py-3 font-medium text-gray-900">{s.last_name}, {s.first_name}</td>
                      <td className="py-3 text-gray-600">{s.grade}</td>
                      <td className="py-3 text-gray-600">{s.school || '—'}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {(s.risk_areas || []).map((area) => (
                            <span key={area} className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                              {area.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {(!s.risk_areas || s.risk_areas.length === 0) && (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Intervention Log Form & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary-600" />
            Log Intervention
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Student (Tier 2/3)</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select a student…</option>
                {tier23Students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.last_name}, {s.first_name} — Grade {s.grade}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duration (min)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={form.duration_minutes}
                  onChange={(e) => setForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Intervention Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              >
                {INTERVENTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fidelity Score: {form.fidelity_score}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={form.fidelity_score}
                onChange={(e) => setForm((p) => ({ ...p, fidelity_score: Number(e.target.value) }))}
                className="w-full accent-primary-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>Low</span><span>High</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Observation notes…"
              />
            </div>

            {formMsg && (
              <p className={`text-sm ${formMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {formMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || !selectedStudentId}
              className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Log Intervention'}
            </button>
          </form>
        </div>

        {/* Recent Intervention Logs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Recent Intervention Logs
          </h2>
          {!selectedStudentId ? (
            <p className="text-gray-400 text-sm text-center py-8">Select a student to view logs.</p>
          ) : logsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full" />
            </div>
          ) : interventionLogs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No intervention logs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Duration</th>
                    <th className="pb-2 font-medium">Fidelity</th>
                  </tr>
                </thead>
                <tbody>
                  {interventionLogs.slice(0, 10).map((log, i) => (
                    <tr key={log.id || i} className="border-b border-gray-50">
                      <td className="py-2 text-gray-700">{log.date}</td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                          {(log.type || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2 text-gray-600">{log.duration_minutes} min</td>
                      <td className="py-2 text-gray-600">{log.fidelity_score}/5</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PyramidRow({ tier, count, pct, widthClass }) {
  const colors = TIER_COLORS[tier];
  return (
    <div className={`${widthClass} transition-all`}>
      <div className={`${colors.bg} rounded-lg py-3 px-4 text-center text-white`}>
        <p className="text-sm font-bold">Tier {tier}</p>
        <p className="text-lg font-bold">{count}</p>
        <p className="text-xs opacity-90">{pct}%</p>
      </div>
    </div>
  );
}
