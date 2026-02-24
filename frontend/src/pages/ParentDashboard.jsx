import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Home, ChevronDown, CheckCircle, Circle, TrendingUp, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const STATUS_MESSAGES = {
  green: {
    color: 'bg-green-50 border-green-200 text-green-800',
    icon: 'text-green-500',
    messages: [
      'is performing at grade level in most areas',
      'is making great progress across the board',
    ],
  },
  amber: {
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: 'text-amber-500',
    messages: [
      'needs a little extra support in some areas',
      'is working towards grade level and improving',
    ],
  },
  red: {
    color: 'bg-red-50 border-red-200 text-red-800',
    icon: 'text-red-500',
    messages: [
      'would benefit from additional support and practice',
      'has areas that need focused attention',
    ],
  },
};

function getRiskLevel(progress) {
  if (!progress) return 'green';
  const risk = progress.overall_risk || progress.risk_level || '';
  if (risk.toLowerCase().includes('high')) return 'red';
  if (risk.toLowerCase().includes('moderate') || risk.toLowerCase().includes('medium')) return 'amber';
  return 'green';
}

function getImprovementMessages(scores) {
  if (!scores || scores.length < 2) return [];
  const msgs = [];
  const latest = scores[scores.length - 1];
  const prev = scores[scores.length - 2];
  if (latest.score > prev.score) {
    msgs.push(`Great improvement${latest.label ? ` in ${latest.label}` : ''}!`);
  }
  return msgs;
}

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    api.getMyChildren()
      .then(kids => {
        setChildren(kids);
        if (kids.length > 0) setSelectedChild(kids[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    setProgress(null);
    setActivities([]);
    Promise.all([
      api.getChildProgress(selectedChild.id),
      api.getChildActivities(selectedChild.id),
    ])
      .then(([prog, acts]) => {
        setProgress(prog);
        setActivities(acts);
      })
      .catch(() => {});
  }, [selectedChild]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto rounded-full bg-teal-100 flex items-center justify-center mb-4">
          <Home className="w-8 h-8 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome, Parent!</h1>
        <p className="text-gray-500 text-lg">No children are linked to your account yet. Please contact your school to get connected.</p>
      </div>
    );
  }

  const riskLevel = getRiskLevel(progress);
  const statusCfg = STATUS_MESSAGES[riskLevel];
  const scores = progress?.scores || [];
  const improvementMsgs = getImprovementMessages(scores);

  const ACTIVITY_COLORS = [
    'bg-pink-50 border-pink-200',
    'bg-blue-50 border-blue-200',
    'bg-purple-50 border-purple-200',
    'bg-teal-50 border-teal-200',
    'bg-orange-50 border-orange-200',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center">
          <Home className="w-6 h-6 text-teal-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-gray-500">Track your child's learning journey</p>
        </div>
      </div>

      {/* Child Selector */}
      {children.length > 1 && (
        <div className="relative">
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="w-full flex items-center justify-between px-5 py-4 bg-white rounded-2xl border-2 border-teal-200 hover:border-teal-400 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-lg">
                {selectedChild?.first_name?.[0]}
              </div>
              <span className="text-lg font-semibold text-gray-900">
                {selectedChild?.first_name} {selectedChild?.last_name}
              </span>
              <span className="text-sm text-gray-400">Grade {selectedChild?.grade}</span>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showSelector ? 'rotate-180' : ''}`} />
          </button>
          {showSelector && (
            <div className="absolute z-10 mt-2 w-full bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => { setSelectedChild(child); setShowSelector(false); }}
                  className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-teal-50 transition-colors text-left ${
                    child.id === selectedChild?.id ? 'bg-teal-50' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-sm">
                    {child.first_name?.[0]}
                  </div>
                  <span className="font-medium text-gray-900">{child.first_name} {child.last_name}</span>
                  <span className="text-sm text-gray-400">Grade {child.grade}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Risk Summary */}
      <div className={`rounded-2xl border-2 p-6 ${statusCfg.color}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            riskLevel === 'green' ? 'bg-green-200' : riskLevel === 'amber' ? 'bg-amber-200' : 'bg-red-200'
          }`}>
            {riskLevel === 'green' ? (
              <Sparkles className={`w-6 h-6 ${statusCfg.icon}`} />
            ) : (
              <TrendingUp className={`w-6 h-6 ${statusCfg.icon}`} />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">
              {selectedChild?.first_name} {statusCfg.messages[0]}
            </h2>
            {progress?.summary && (
              <p className="text-base opacity-80">{progress.summary}</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Chart */}
      {scores.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Progress Over Time</h2>
          <p className="text-sm text-gray-500 mb-4">Score trends across assessments</p>
          {improvementMsgs.length > 0 && (
            <div className="mb-4 space-y-2">
              {improvementMsgs.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  {msg}
                </div>
              ))}
            </div>
          )}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scores}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#14b8a6"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#14b8a6' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* At-Home Activities */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">At-Home Activities</h2>
        <p className="text-sm text-gray-500 mb-4">Fun ways to support learning at home</p>
        {activities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
            No activities suggested yet — check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activities.map((act, i) => (
              <div
                key={act.id || i}
                className={`rounded-2xl border-2 p-5 ${ACTIVITY_COLORS[i % ACTIVITY_COLORS.length]} transition-transform hover:scale-[1.02]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{act.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{act.description}</p>
                  </div>
                  <button className="flex-shrink-0 mt-1">
                    {act.completed ? (
                      <CheckCircle className="w-7 h-7 text-green-500" />
                    ) : (
                      <Circle className="w-7 h-7 text-gray-300 hover:text-green-400 transition-colors" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
