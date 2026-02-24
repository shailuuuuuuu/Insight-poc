import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Heart } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';

const COMPETENCIES = [
  { key: 'self_awareness', label: 'Self-Awareness' },
  { key: 'self_management', label: 'Self-Management' },
  { key: 'social_awareness', label: 'Social Awareness' },
  { key: 'relationship_skills', label: 'Relationship Skills' },
  { key: 'decision_making', label: 'Decision Making' },
];

const RISK_THRESHOLDS = [
  { max: 10, level: 'High Risk', color: 'text-red-600 bg-red-50' },
  { max: 17, level: 'Some Risk', color: 'text-amber-600 bg-amber-50' },
  { max: 25, level: 'Low Risk', color: 'text-green-600 bg-green-50' },
];

function getRiskLevel(total) {
  for (const t of RISK_THRESHOLDS) {
    if (total <= t.max) return t;
  }
  return RISK_THRESHOLDS[2];
}

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

export default function SEL() {
  const [tab, setTab] = useState('screening');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
          <Heart className="w-6 h-6 text-rose-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEL Integration</h1>
          <p className="text-gray-500 mt-0.5">Social-Emotional Learning screenings and analytics</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'screening', label: 'Screening' },
          { key: 'profile', label: 'Student Profile' },
          { key: 'climate', label: 'Class Climate' },
          { key: 'correlation', label: 'Correlation' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'screening' && <ScreeningTab onSelectStudent={(id) => setTab('profile')} />}
      {tab === 'profile' && <StudentProfileTab />}
      {tab === 'climate' && <ClassClimateTab />}
      {tab === 'correlation' && <CorrelationTab />}
    </div>
  );
}

function ScreeningTab() {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [scores, setScores] = useState(
    Object.fromEntries(COMPETENCIES.map((c) => [c.key, 3]))
  );
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.getMyStudents().then(setStudents).catch(() => {});
  }, []);

  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const risk = getRiskLevel(total);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId) return;
    setSaving(true);
    setSuccess(false);
    try {
      await api.createSELScreening({
        student_id: Number(studentId),
        date,
        ...scores,
      });
      setSuccess(true);
      setScores(Object.fromEntries(COMPETENCIES.map((c) => [c.key, 3])));
      setTimeout(() => setSuccess(false), 3000);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit SEL Screening</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select a student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.last_name}, {s.first_name} (Grade {s.grade})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          {COMPETENCIES.map((c) => (
            <div key={c.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">{c.label}</label>
                <span className="text-sm font-semibold text-primary-600">{scores[c.key]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                value={scores[c.key]}
                onChange={(e) => setScores((p) => ({ ...p, [c.key]: Number(e.target.value) }))}
                className="w-full accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0</span>
                <span>5</span>
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">Total Score</p>
            <p className="text-2xl font-bold text-gray-900">{total} / 25</p>
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${risk.color}`}>
            {risk.level}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !studentId}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Submitting...' : 'Submit Screening'}
          </button>
          {success && (
            <span className="text-sm text-green-600 font-medium">Screening saved successfully!</span>
          )}
        </div>
      </form>
    </div>
  );
}

function StudentProfileTab() {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getMyStudents().then(setStudents).catch(() => {});
  }, []);

  useEffect(() => {
    if (!studentId) { setProfile(null); return; }
    setLoading(true);
    api.getStudentSEL(studentId)
      .then((screenings) => {
        if (!screenings || screenings.length === 0) {
          setProfile(null);
          return;
        }
        setProfile({
          latest: screenings[0],
          history: screenings,
        });
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [studentId]);

  const radarData = profile?.latest
    ? COMPETENCIES.map((c) => ({
        competency: c.label,
        score: profile.latest[c.key] ?? 0,
        fullMark: 5,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Choose a student...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
        </div>
      ) : !studentId ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
          <Heart className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>Select a student to view their SEL profile</p>
        </div>
      ) : profile ? (
        <>
          {/* Radar Chart */}
          {radarData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Competency Profile</h2>
              <div className="h-80">
                <ResponsiveContainer>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="competency" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                    <Radar
                      dataKey="score"
                      stroke="#7c3aed"
                      fill="#7c3aed"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Screening History */}
          {profile.history && profile.history.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Screening History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                      {COMPETENCIES.map((c) => (
                        <th key={c.key} className="text-center px-3 py-3 font-medium text-gray-500 text-xs">{c.label}</th>
                      ))}
                      <th className="text-center px-3 py-3 font-medium text-gray-500">Total</th>
                      <th className="text-center px-3 py-3 font-medium text-gray-500">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.history.map((entry, i) => {
                      const total = COMPETENCIES.reduce((s, c) => s + (entry[c.key] ?? 0), 0);
                      const risk = getRiskLevel(total);
                      return (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">
                            {entry.date ? new Date(entry.date).toLocaleDateString() : '—'}
                          </td>
                          {COMPETENCIES.map((c) => (
                            <td key={c.key} className="px-3 py-3 text-center text-gray-600">
                              {entry[c.key] ?? '—'}
                            </td>
                          ))}
                          <td className="px-3 py-3 text-center font-semibold text-gray-900">{total}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${risk.color}`}>
                              {risk.level}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
          <p>No SEL data found for this student</p>
        </div>
      )}
    </div>
  );
}

function ClassClimateTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSELClassSummary()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
        <Heart className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p>No class climate data available</p>
      </div>
    );
  }

  const barData = data.averages
    ? COMPETENCIES.map((c) => ({
        name: c.label,
        average: data.averages[c.key] ?? 0,
      }))
    : [];

  const pieData = data.risk_distribution
    ? Object.entries(data.risk_distribution).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      {/* Average Competency Scores */}
      {barData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Average Competency Scores</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 5]} />
                <Tooltip formatter={(v) => [v.toFixed(2), 'Average']} />
                <Bar dataKey="average" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Risk Distribution Pie */}
      {pieData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h2>
          <div className="flex items-center gap-8">
            <div className="w-64 h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-sm text-gray-600 capitalize">{d.name}</span>
                  <span className="text-sm font-bold text-gray-900">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const RISK_TO_NUM = { benchmark: 1, moderate: 2, high: 3 };
const NUM_TO_RISK = { 1: 'Benchmark', 2: 'Moderate', 3: 'High' };
const RISK_COLORS = { 1: '#22c55e', 2: '#f59e0b', 3: '#ef4444' };

function CorrelationTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSELCorrelation()
      .then((raw) => {
        const mapped = raw.map((d) => ({
          ...d,
          risk_num: RISK_TO_NUM[d.literacy_risk] ?? 0,
          risk_label: d.literacy_risk,
        }));
        setData(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
        <Heart className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p>No correlation data available yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">SEL vs Literacy Risk</h2>
      <p className="text-sm text-gray-400 mb-6">Each dot represents a student. Higher SEL scores tend to correlate with lower literacy risk.</p>
      <div className="flex items-center gap-4 mb-4">
        {Object.entries(RISK_COLORS).map(([num, color]) => (
          <div key={num} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-500">{NUM_TO_RISK[num]}</span>
          </div>
        ))}
      </div>
      <div className="h-96">
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="sel_total"
              type="number"
              name="SEL Total"
              domain={[0, 5]}
              tickCount={6}
              label={{ value: 'SEL Average Score (0–5)', position: 'insideBottom', offset: -15, fontSize: 12 }}
            />
            <YAxis
              dataKey="latest_score"
              type="number"
              name="Latest Literacy Score"
              label={{ value: 'Latest Literacy Score', angle: -90, position: 'insideLeft', offset: -5, fontSize: 12 }}
            />
            <ZAxis range={[50, 120]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-sm">
                    <p className="font-semibold text-gray-900">{d.student_name || `Student #${d.student_id}`}</p>
                    <p className="text-gray-500">SEL Score: {d.sel_total}</p>
                    <p className="text-gray-500">Literacy Score: {d.latest_score}</p>
                    <p className="text-gray-500">Literacy Risk: <span className="capitalize font-medium">{d.risk_label}</span></p>
                    <p className="text-gray-500">SEL Risk: <span className="capitalize font-medium">{d.sel_risk}</span></p>
                  </div>
                );
              }}
            />
            <Scatter data={data} fillOpacity={0.7}>
              {data.map((entry, i) => (
                <Cell key={i} fill={RISK_COLORS[entry.risk_num] || '#94a3b8'} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
