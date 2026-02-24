import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { AlertTriangle, Search, Star, StarOff, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PROB_CONFIG = {
  High: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  Medium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  Low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
};

const FACTOR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#4f46e5', '#818cf8'];

export default function Predictions() {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [probFilter, setProbFilter] = useState('All');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [schoolFilter, setSchoolFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    api.getAtRiskPredictions()
      .then(setPredictions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleWatchlist = async (studentId, e) => {
    e.stopPropagation();
    try {
      await api.toggleWatchlist(studentId);
      setPredictions(prev =>
        prev.map(p =>
          p.student_id === studentId ? { ...p, on_watchlist: !p.on_watchlist } : p
        )
      );
    } catch { /* ignore */ }
  };

  const grades = [...new Set(predictions.map(p => p.grade))].sort();
  const schools = [...new Set(predictions.map(p => p.school).filter(Boolean))].sort();

  const filtered = predictions.filter(p => {
    if (probFilter !== 'All' && p.probability !== probFilter) return false;
    if (gradeFilter !== 'All' && String(p.grade) !== gradeFilter) return false;
    if (schoolFilter !== 'All' && p.school !== schoolFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = `${p.first_name} ${p.last_name}`.toLowerCase();
      if (!name.includes(q)) return false;
    }
    return true;
  });

  const highCount = predictions.filter(p => p.probability === 'High').length;
  const medCount = predictions.filter(p => p.probability === 'Medium').length;
  const watchCount = predictions.filter(p => p.on_watchlist).length;

  const factorCounts = {};
  predictions.forEach(p => {
    (p.contributing_factors || []).forEach(f => {
      factorCounts[f] = (factorCounts[f] || 0) + 1;
    });
  });
  const factorChart = Object.entries(factorCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Predictive Analytics</h1>
          <p className="text-sm text-gray-500">Early warning system for at-risk students</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{highCount}</p>
              <p className="text-sm text-gray-500">High Risk Predictions</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{medCount}</p>
              <p className="text-sm text-gray-500">Medium Risk</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{watchCount}</p>
              <p className="text-sm text-gray-500">On Watch List</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
              showFilters ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100">
            <select
              value={probFilter}
              onChange={e => setProbFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="All">All Probability</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              value={gradeFilter}
              onChange={e => setGradeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="All">All Grades</option>
              {grades.map(g => <option key={g} value={String(g)}>Grade {g}</option>)}
            </select>
            <select
              value={schoolFilter}
              onChange={e => setSchoolFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="All">All Schools</option>
              {schools.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Early Warning Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Early Warning Table</h2>
          <p className="text-sm text-gray-500">{filtered.length} student{filtered.length !== 1 ? 's' : ''} shown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50">
                <th className="px-6 py-3 font-medium">Student Name</th>
                <th className="px-4 py-3 font-medium">Grade</th>
                <th className="px-4 py-3 font-medium">School</th>
                <th className="px-4 py-3 font-medium">Probability</th>
                <th className="px-4 py-3 font-medium">Contributing Factors</th>
                <th className="px-4 py-3 font-medium">Current Risk</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No predictions match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const cfg = PROB_CONFIG[p.probability] || PROB_CONFIG.Low;
                  return (
                    <tr key={p.student_id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <button
                          onClick={() => navigate(`/students/${p.student_id}`)}
                          className="font-medium text-primary-600 hover:underline"
                        >
                          {p.first_name} {p.last_name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.grade}</td>
                      <td className="px-4 py-3 text-gray-600">{p.school || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          {p.probability}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(p.contributing_factors || []).map(f => (
                            <span key={f} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.current_risk || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={e => toggleWatchlist(p.student_id, e)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title={p.on_watchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                        >
                          {p.on_watchlist ? (
                            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                          ) : (
                            <StarOff className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contributing Factors Summary */}
      {factorChart.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Contributing Factors Summary</h2>
          <p className="text-sm text-gray-500 mb-4">Most common risk factors across all predictions</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={factorChart} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {factorChart.map((_, i) => (
                    <Cell key={i} fill={FACTOR_COLORS[i % FACTOR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
