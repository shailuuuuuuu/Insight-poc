import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TrendingUp, Filter } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, BarChart, Bar, Cell,
} from 'recharts';

const BENCHMARK_LINE = 50;
const YEARS = ['2023-2024', '2024-2025', '2025-2026'];
const GRADE_OPTIONS = ['K', '1', '2', '3', '4', '5', '6', '7', '8'];
const RISK_COLORS = { benchmark: '#22c55e', moderate: '#f59e0b', high: '#ef4444' };

export default function Longitudinal() {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [progressData, setProgressData] = useState([]);
  const [progressLoading, setProgressLoading] = useState(false);

  const [activeView, setActiveView] = useState('growth');

  const [cohortFilters, setCohortFilters] = useState({ grade: '', school: '', risk_level: '' });
  const [schools, setSchools] = useState([]);

  const [yearData, setYearData] = useState([]);
  const [yearLoading, setYearLoading] = useState(false);

  const [disaggGroupBy, setDisaggGroupBy] = useState('grade');
  const [disaggData, setDisaggData] = useState([]);
  const [disaggLoading, setDisaggLoading] = useState(false);

  useEffect(() => {
    api.getAllStudents()
      .then((s) => {
        setStudents(s);
        const schoolSet = [...new Set(s.filter((st) => st.school).map((st) => st.school))].sort();
        setSchools(schoolSet);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      setProgressData([]);
      return;
    }
    setProgressLoading(true);
    api.studentProgress(selectedStudentId)
      .then((data) => {
        const formatted = (Array.isArray(data) ? data : data.data_points || []).map((d) => ({
          period: `${d.time_of_year || d.period} ${(d.academic_year || '').slice(-4)}`,
          score: d.score ?? d.composite_score ?? 0,
          benchmark: d.benchmark ?? BENCHMARK_LINE,
        }));
        setProgressData(formatted);
      })
      .catch(() => setProgressData([]))
      .finally(() => setProgressLoading(false));
  }, [selectedStudentId]);

  useEffect(() => {
    setYearLoading(true);
    Promise.all(
      YEARS.map((year) =>
        api.riskSummary({ academic_year: year, ...cleanParams(cohortFilters) })
          .then((data) => ({ year, data }))
          .catch(() => ({ year, data: [] }))
      )
    )
      .then((results) => {
        const rows = results.map(({ year, data }) => {
          const total = data.reduce((s, r) => s + (r.total_students || 0), 0);
          const low = data.reduce((s, r) => s + (r.low_risk || 0), 0);
          const mod = data.reduce((s, r) => s + (r.moderate_risk || 0), 0);
          const hi = data.reduce((s, r) => s + (r.high_risk || 0), 0);
          const avg = total > 0 ? data.reduce((s, r) => s + (r.avg_score || 0), 0) / data.length : 0;
          return {
            year,
            student_count: total,
            pct_benchmark: total > 0 ? Math.round((low / total) * 100) : 0,
            pct_moderate: total > 0 ? Math.round((mod / total) * 100) : 0,
            pct_high: total > 0 ? Math.round((hi / total) * 100) : 0,
            avg_score: Math.round(avg),
          };
        });
        setYearData(rows);
      })
      .finally(() => setYearLoading(false));
  }, [cohortFilters]);

  useEffect(() => {
    setDisaggLoading(true);
    if (disaggGroupBy === 'grade') {
      Promise.all(
        GRADE_OPTIONS.map((g) =>
          api.riskSummary({ grade: g, ...cleanParams(cohortFilters) })
            .then((data) => ({ group: `Grade ${g}`, data }))
            .catch(() => ({ group: `Grade ${g}`, data: [] }))
        )
      )
        .then(buildDisagg)
        .finally(() => setDisaggLoading(false));
    } else {
      Promise.all(
        schools.map((s) =>
          api.riskSummary({ school: s, ...cleanParams(cohortFilters) })
            .then((data) => ({ group: s, data }))
            .catch(() => ({ group: s, data: [] }))
        )
      )
        .then(buildDisagg)
        .finally(() => setDisaggLoading(false));
    }
  }, [disaggGroupBy, cohortFilters, schools]);

  const buildDisagg = (results) => {
    setDisaggData(
      results
        .map(({ group, data }) => {
          const total = data.reduce((s, r) => s + (r.total_students || 0), 0);
          const low = data.reduce((s, r) => s + (r.low_risk || 0), 0);
          const mod = data.reduce((s, r) => s + (r.moderate_risk || 0), 0);
          const hi = data.reduce((s, r) => s + (r.high_risk || 0), 0);
          return { group, Benchmark: low, Moderate: mod, 'High Risk': hi, total };
        })
        .filter((d) => d.total > 0)
    );
  };

  const cleanParams = (obj) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v));

  const VIEWS = [
    { key: 'growth', label: 'Student Growth' },
    { key: 'yoy', label: 'Year-over-Year' },
    { key: 'disagg', label: 'Disaggregation' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Longitudinal Analytics</h1>
          <p className="text-sm text-gray-500">Track student progress and cohort trends over time</p>
        </div>
      </div>

      {/* Cohort Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Cohort:</span>
          <select
            value={cohortFilters.grade}
            onChange={(e) => setCohortFilters((p) => ({ ...p, grade: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Grades</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>
          <select
            value={cohortFilters.school}
            onChange={(e) => setCohortFilters((p) => ({ ...p, school: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Schools</option>
            {schools.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={cohortFilters.risk_level}
            onChange={(e) => setCohortFilters((p) => ({ ...p, risk_level: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Risk Levels</option>
            <option value="benchmark">Benchmark</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === v.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Student Growth Chart */}
      {activeView === 'growth' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Growth Over Time</h2>
          <div className="mb-4">
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 w-full max-w-md"
            >
              <option value="">Select a student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.last_name}, {s.first_name} — Grade {s.grade}
                </option>
              ))}
            </select>
          </div>

          {!selectedStudentId ? (
            <p className="text-gray-400 text-sm text-center py-12">Select a student to view their growth chart.</p>
          ) : progressLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full" />
            </div>
          ) : progressData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No progress data available for this student.</p>
          ) : (
            <div style={{ height: 340 }}>
              <ResponsiveContainer>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine
                    y={progressData[0]?.benchmark || BENCHMARK_LINE}
                    stroke="#22c55e"
                    strokeDasharray="6 4"
                    label={{ value: 'Benchmark', position: 'right', fill: '#22c55e', fontSize: 11 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 5, fill: '#6366f1' }}
                    activeDot={{ r: 7 }}
                    name="Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Year-over-Year Table */}
      {activeView === 'yoy' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Year-over-Year Statistics</h2>

          {yearLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-3 font-medium">Year</th>
                    <th className="pb-3 font-medium text-center">Students</th>
                    <th className="pb-3 font-medium text-center">% Benchmark</th>
                    <th className="pb-3 font-medium text-center">% Moderate</th>
                    <th className="pb-3 font-medium text-center">% High Risk</th>
                    <th className="pb-3 font-medium text-center">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {yearData.map((row) => (
                    <tr key={row.year} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{row.year}</td>
                      <td className="py-3 text-center text-gray-700">{row.student_count}</td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {row.pct_benchmark}%
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          {row.pct_moderate}%
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {row.pct_high}%
                        </span>
                      </td>
                      <td className="py-3 text-center text-gray-700 font-medium">{row.avg_score}</td>
                    </tr>
                  ))}
                  {yearData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">No data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Disaggregation View */}
      {activeView === 'disagg' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Disaggregation</h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setDisaggGroupBy('grade')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  disaggGroupBy === 'grade' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                By Grade
              </button>
              <button
                onClick={() => setDisaggGroupBy('school')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  disaggGroupBy === 'school' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                By School
              </button>
            </div>
          </div>

          {disaggLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full" />
            </div>
          ) : disaggData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No data available for disaggregation.</p>
          ) : (
            <div style={{ height: Math.max(320, disaggData.length * 50 + 80) }}>
              <ResponsiveContainer>
                <BarChart data={disaggData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="group" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Benchmark" stackId="a" fill={RISK_COLORS.benchmark} />
                  <Bar dataKey="Moderate" stackId="a" fill={RISK_COLORS.moderate} />
                  <Bar dataKey="High Risk" stackId="a" fill={RISK_COLORS.high} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
