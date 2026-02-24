import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Users, ClipboardList, AlertTriangle, TrendingUp, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const RISK_COLORS = { benchmark: '#22c55e', moderate: '#f59e0b', high: '#ef4444' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myStudents, setMyStudents] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMyStudents(), api.riskSummary()])
      .then(([students, risk]) => {
        setMyStudents(students);
        setRiskData(risk);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalStudents = myStudents.length;
  const totalAssessments = riskData.reduce((sum, r) => sum + r.total_students, 0);
  const atRisk = riskData.reduce((sum, r) => sum + r.high_risk + r.moderate_risk, 0);

  const overallPie = riskData.length > 0
    ? [
        { name: 'Benchmark', value: riskData.reduce((s, r) => s + r.low_risk, 0), color: RISK_COLORS.benchmark },
        { name: 'Moderate', value: riskData.reduce((s, r) => s + r.moderate_risk, 0), color: RISK_COLORS.moderate },
        { name: 'High', value: riskData.reduce((s, r) => s + r.high_risk, 0), color: RISK_COLORS.high },
      ].filter((d) => d.value > 0)
    : [];

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
        />
        <StatCard
          icon={ClipboardList} label="Assessments" value={totalAssessments}
          color="bg-green-50 text-green-600" onClick={() => navigate('/reports')}
        />
        <StatCard
          icon={AlertTriangle} label="At Risk" value={atRisk}
          color="bg-amber-50 text-amber-600" onClick={() => navigate('/reports')}
        />
        <StatCard
          icon={TrendingUp} label="Subtests Tracked" value={riskData.length}
          color="bg-purple-50 text-purple-600" onClick={() => navigate('/reports')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Overall Risk Distribution</h2>
          {overallPie.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="w-48 h-48">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={overallPie} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                      {overallPie.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {overallPie.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm text-gray-600">
                      {d.name}: <span className="font-semibold">{d.value}</span>
                    </span>
                  </div>
                ))}
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

      {/* Recent Students */}
      {myStudents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Students</h2>
            <button onClick={() => navigate('/students')} className="text-primary-600 text-sm hover:underline">
              View all
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
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{s.last_name}, {s.first_name}</td>
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
                      <button onClick={() => navigate(`/students/${s.id}`)} className="text-primary-600 hover:underline text-xs">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-left hover:shadow-md transition-shadow w-full"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </button>
  );
}

function QuickAction({ label, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
    >
      <div className="text-left">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
  );
}
