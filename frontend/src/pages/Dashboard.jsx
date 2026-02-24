import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Users, ClipboardList, AlertTriangle, TrendingUp, ChevronRight, ExternalLink, Play } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import RiskHeatmap from '../components/RiskHeatmap';
import CompletionTracker from '../components/CompletionTracker';

const RISK_COLORS = { benchmark: '#22c55e', moderate: '#f59e0b', high: '#ef4444' };
const RISK_KEYS = { Benchmark: 'benchmark', Moderate: 'moderate', High: 'high' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myStudents, setMyStudents] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState([]);
  const [queueData, setQueueData] = useState([]);
  const [completionData, setCompletionData] = useState([]);

  useEffect(() => {
    Promise.all([api.getMyStudents(), api.riskSummary(), api.riskHeatmap(), api.testingQueue(), api.completionStats()])
      .then(([students, risk, heatmap, queue, completion]) => {
        setMyStudents(students);
        setRiskData(risk);
        setHeatmapData(heatmap);
        setQueueData(queue);
        setCompletionData(completion);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalStudents = myStudents.length;
  const totalAssessments = riskData.reduce((sum, r) => sum + r.total_students, 0);
  const atRisk = riskData.reduce((sum, r) => sum + r.high_risk + r.moderate_risk, 0);
  const benchmarkCount = riskData.reduce((sum, r) => sum + r.low_risk, 0);
  const moderateCount = riskData.reduce((sum, r) => sum + r.moderate_risk, 0);
  const highCount = riskData.reduce((sum, r) => sum + r.high_risk, 0);

  const overallPie = riskData.length > 0
    ? [
        { name: 'Benchmark', value: benchmarkCount, color: RISK_COLORS.benchmark },
        { name: 'Moderate', value: moderateCount, color: RISK_COLORS.moderate },
        { name: 'High', value: highCount, color: RISK_COLORS.high },
      ].filter((d) => d.value > 0)
    : [];

  const handlePieClick = (data) => {
    if (data?.name) {
      const riskKey = RISK_KEYS[data.name];
      if (riskKey) {
        const firstSubtest = riskData[0]?.subtest || '';
        navigate(`/reports?tab=table&riskFilter=${firstSubtest}:${riskKey}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.first_name}
        </h1>
        <p className="text-gray-500 mt-1">Here's an overview of your assessment data.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users} label="My Students" value={totalStudents}
          color="bg-blue-50 text-blue-600" onClick={() => navigate('/students')}
          subtitle={`${myStudents.filter(s => s.status === 'active').length} active`}
        />
        <StatCard
          icon={ClipboardList} label="Assessments" value={totalAssessments}
          color="bg-green-50 text-green-600" onClick={() => navigate('/reports')}
          subtitle={riskData.length > 0 ? `across ${riskData.length} subtests` : null}
        />
        <StatCard
          icon={AlertTriangle} label="At Risk" value={atRisk}
          color="bg-amber-50 text-amber-600" onClick={() => navigate('/reports')}
          subtitle={atRisk > 0 ? <span><span className="text-amber-600">{moderateCount} moderate</span> · <span className="text-red-600">{highCount} high</span></span> : null}
        />
        <StatCard
          icon={TrendingUp} label="Subtests Tracked" value={riskData.length}
          color="bg-purple-50 text-purple-600" onClick={() => navigate('/reports')}
          subtitle={benchmarkCount > 0 ? `${benchmarkCount} at benchmark` : null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 group mb-4 w-full text-left"
          >
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              Overall Risk Distribution
            </h2>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </button>
          {overallPie.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="w-48 h-48">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={overallPie}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      style={{ cursor: 'pointer' }}
                      onClick={(_, index) => handlePieClick(overallPie[index])}
                    >
                      {overallPie.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {overallPie.map((d) => {
                  const riskKey = RISK_KEYS[d.name];
                  const firstSubtest = riskData[0]?.subtest || '';
                  return (
                    <button
                      key={d.name}
                      onClick={() => navigate(`/reports?tab=table&riskFilter=${firstSubtest}:${riskKey}`)}
                      className="flex items-center gap-2 w-full text-left hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors group"
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-sm text-gray-600 group-hover:text-gray-900 flex-1">
                        {d.name}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{d.value}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-600 transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-center py-12">
              No assessment data yet. Start by assessing a student.
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickAction label="Add New Student" desc="Create a student record" onClick={() => navigate('/students?action=add')} />
            <QuickAction label="Start Assessment" desc="Administer a CUBED-3 subtest" onClick={() => navigate('/assess')} />
            <QuickAction label="View Reports" desc="Risk charts and student data" onClick={() => navigate('/reports')} />
            <QuickAction label="Import Students" desc="Bulk upload via CSV" onClick={() => navigate('/students?action=import')} />
          </div>
        </div>
      </div>

      {/* Risk by Subtest — clickable cards */}
      {riskData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 group mb-4 w-full text-left"
          >
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              Risk by Subtest
            </h2>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {riskData.map((r) => (
              <button
                key={r.subtest}
                onClick={() => navigate(`/reports?tab=table&riskFilter=${r.subtest}:high`)}
                className="text-left p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group"
              >
                <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 truncate">
                  {r.subtest.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{r.total_students} assessed</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-medium text-gray-700">{r.low_risk}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-medium text-gray-700">{r.moderate_risk}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="font-medium text-gray-700">{r.high_risk}</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Students */}
      {myStudents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/students')}
              className="flex items-center gap-2 group"
            >
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                My Students
              </h2>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
            </button>
            <button onClick={() => navigate('/students')} className="text-primary-600 text-sm hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Grade</th>
                  <th className="pb-2 font-medium">School</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {myStudents.slice(0, 5).map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/students/${s.id}`)}
                  >
                    <td className="py-3 font-medium text-gray-900 hover:text-primary-600">{s.last_name}, {s.first_name}</td>
                    <td className="py-3 text-gray-600">{s.grade}</td>
                    <td className="py-3 text-gray-600">{s.school || '—'}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-primary-600 hover:underline text-xs flex items-center gap-1">
                        View <ChevronRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Risk Heatmap */}
      {heatmapData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Heatmap (Grade × Subtest)</h2>
          <RiskHeatmap data={heatmapData} onCellClick={(grade, subtest) => navigate(`/reports?tab=table&riskFilter=${subtest}:high`)} />
        </div>
      )}

      {/* Testing Queue & Completion Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Testing Queue */}
        {queueData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Testing Queue</h2>
              <span className="text-xs text-gray-400">Priority-sorted</span>
            </div>
            <div className="space-y-2">
              {queueData.slice(0, 8).map((s) => (
                <div key={s.student_id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.latest_risk === 'high' ? 'bg-red-500' : s.latest_risk === 'moderate' ? 'bg-amber-500' : 'bg-green-500'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400">Grade {s.grade} · {s.days_since_last}d since last test</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/assess')} className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium hover:bg-primary-100 flex-shrink-0">
                    <Play className="w-3 h-3" /> Assess
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completion Tracker */}
        {completionData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessment Completion by Grade</h2>
            <CompletionTracker data={completionData} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, onClick, subtitle }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-left hover:shadow-md hover:border-primary-200 transition-all w-full group"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-600 transition-colors flex-shrink-0" />
      </div>
    </button>
  );
}

function QuickAction({ label, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-primary-200 transition-all group"
    >
      <div className="text-left">
        <p className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">{label}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
    </button>
  );
}
