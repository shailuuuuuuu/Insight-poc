import { AlertTriangle } from 'lucide-react';

function progressColor(pct) {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-red-500';
}

function circleColor(pct) {
  if (pct >= 80) return '#22c55e';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

export default function CompletionTracker({ data = [] }) {
  const totalTested = data.reduce((s, d) => s + d.tested, 0);
  const totalStudents = data.reduce((s, d) => s + d.total, 0);
  const overallPct = totalStudents > 0 ? Math.round((totalTested / totalStudents) * 100) : 0;
  const strokeDash = (overallPct / 100) * 251.2;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Completion Tracker</h3>

      {/* Overall circular progress */}
      <div className="flex items-center gap-6 mb-8">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="10"
            />
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke={circleColor(overallPct)}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - strokeDash}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-gray-900">{overallPct}%</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500">Overall Completion</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalTested} <span className="text-base font-normal text-gray-400">/ {totalStudents}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">students tested</p>
        </div>
      </div>

      {/* Per-grade bars */}
      <div className="space-y-3">
        {data.map(({ grade, tested, total }) => {
          const pct = total > 0 ? Math.round((tested / total) * 100) : 0;
          return (
            <div key={grade} className="flex items-center gap-3">
              <span className="w-16 text-sm font-medium text-gray-700 shrink-0">
                Grade {grade}
              </span>
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progressColor(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-20 text-right shrink-0">
                {tested}/{total}
              </span>
              {pct < 80 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-amber-800 bg-amber-100 rounded-full shrink-0">
                  <AlertTriangle className="w-3 h-3" />
                  Behind schedule
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
