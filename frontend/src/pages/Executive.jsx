import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Building2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const TIER_COLORS = { tier1: '#22c55e', tier2: '#f59e0b', tier3: '#ef4444' };

export default function Executive() {
  const [scorecard, setScorecard] = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('school');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    Promise.all([api.getScorecard(), api.getSchoolComparison()])
      .then(([sc, comp]) => {
        setScorecard(sc);
        setSchools(comp);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const barColor = (rate) => {
    if (rate >= 70) return '#22c55e';
    if (rate >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const chartData = useMemo(() =>
    [...schools]
      .sort((a, b) => a.proficiency_rate - b.proficiency_rate)
      .map((s) => ({ ...s, fill: barColor(s.proficiency_rate) })),
    [schools]
  );

  const sortedSchools = useMemo(() => {
    const sorted = [...schools].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string') return aVal.localeCompare(bVal);
      return aVal - bVal;
    });
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [schools, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortHeader = ({ label, field, className = '' }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-4 py-3 font-medium text-gray-500 cursor-pointer hover:text-gray-900 select-none ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === field && (
          <span className="text-primary-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </span>
    </th>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  const tierData = scorecard?.tier_distribution;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Analytics</h1>
          <p className="text-gray-500 mt-0.5">District-wide performance overview</p>
        </div>
      </div>

      {/* District Scorecard */}
      {scorecard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <ScorecardCard
            label="Total Students"
            value={scorecard.total_students?.toLocaleString() ?? '—'}
            bg="bg-blue-50 border-blue-200"
            accent="text-blue-700"
          />
          <ScorecardCard
            label="Tested This Year"
            value={scorecard.tested_this_year?.toLocaleString() ?? '—'}
            bg="bg-indigo-50 border-indigo-200"
            accent="text-indigo-700"
          />
          <ScorecardCard
            label="Proficiency Rate"
            value={`${scorecard.proficiency_rate ?? 0}%`}
            bg={scorecard.proficiency_rate >= 70 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}
            accent={scorecard.proficiency_rate >= 70 ? 'text-green-700' : 'text-amber-700'}
          />
          <ScorecardCard
            label="Completion Rate"
            value={`${scorecard.completion_rate ?? 0}%`}
            bg={scorecard.completion_rate >= 80 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}
            accent={scorecard.completion_rate >= 80 ? 'text-green-700' : 'text-amber-700'}
          />
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500 mb-2">Tier Distribution</p>
            {tierData ? (
              <div className="space-y-2">
                {Object.entries(tierData).map(([tier, count]) => {
                  const total = Object.values(tierData).reduce((s, v) => s + v, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={tier} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-12 capitalize">{tier}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: TIER_COLORS[tier] || '#94a3b8',
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-14 text-right">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-gray-400 text-sm">No data</span>
            )}
          </div>
          <ScorecardCard
            label="Growth Count"
            value={scorecard.growth_count?.toLocaleString() ?? '—'}
            bg="bg-emerald-50 border-emerald-200"
            accent="text-emerald-700"
          />
        </div>
      )}

      {/* School Comparison Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">School Comparison</h2>
          <p className="text-sm text-gray-400 mb-6">Proficiency rate by school, ranked lowest to highest</p>
          <div style={{ height: Math.max(300, chartData.length * 44 + 40) }}>
            <ResponsiveContainer>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="school" type="category" width={180} tick={{ fontSize: 13 }} />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Proficiency Rate']}
                  contentStyle={{ borderRadius: 8 }}
                />
                <Bar dataKey="proficiency_rate" radius={[0, 6, 6, 0]} barSize={28}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Summary Table */}
      {schools.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">School Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <SortHeader label="School" field="school" className="text-left" />
                  <SortHeader label="Students" field="students" className="text-right" />
                  <SortHeader label="Proficiency %" field="proficiency_rate" className="text-right" />
                  <SortHeader label="At-Risk %" field="at_risk_rate" className="text-right" />
                  <SortHeader label="Completion %" field="completion_rate" className="text-right" />
                </tr>
              </thead>
              <tbody>
                {sortedSchools.map((s) => (
                  <tr key={s.school} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.school}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{s.students?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        s.proficiency_rate >= 70 ? 'bg-green-100 text-green-700'
                          : s.proficiency_rate >= 50 ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {s.proficiency_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        s.at_risk_rate <= 20 ? 'bg-green-100 text-green-700'
                          : s.at_risk_rate <= 40 ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {s.at_risk_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{s.completion_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!scorecard && schools.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No executive data available yet.</p>
        </div>
      )}
    </div>
  );
}

function ScorecardCard({ label, value, bg, accent }) {
  return (
    <div className={`rounded-xl shadow-sm border p-5 ${bg}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}
