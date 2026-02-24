const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8'];
const SUBTESTS = [
  'NLM Reading',
  'NLM Listening',
  'DDM PA',
  'DDM PM',
  'DDM OM',
  'DDM DI',
];

function riskColor(pct) {
  if (pct < 10) return 'bg-green-500';
  if (pct <= 30) return 'bg-yellow-400';
  return 'bg-red-500';
}

function riskTextColor(pct) {
  if (pct < 10) return 'text-white';
  if (pct <= 30) return 'text-gray-900';
  return 'text-white';
}

export default function RiskHeatmap({ data = [], onCellClick }) {
  const lookup = {};
  data.forEach(d => {
    lookup[`${d.grade}::${d.subtest}`] = d;
  });

  const handleClick = (grade, subtest) => {
    if (onCellClick) {
      onCellClick(grade, subtest);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Heatmap</h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade
              </th>
              {SUBTESTS.map(s => (
                <th
                  key={s}
                  className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRADES.map(grade => (
              <tr key={grade}>
                <td className="px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">
                  Grade {grade}
                </td>
                {SUBTESTS.map(subtest => {
                  const cell = lookup[`${grade}::${subtest}`];
                  const pct = cell?.high_pct ?? 0;
                  const count = cell?.count ?? 0;
                  return (
                    <td key={subtest} className="px-1 py-1">
                      <button
                        onClick={() => handleClick(grade, subtest)}
                        title={`${count} students — ${pct}% high risk`}
                        className={`w-full rounded-lg py-2 px-3 text-center font-semibold text-xs transition-transform hover:scale-105 cursor-pointer ${riskColor(pct)} ${riskTextColor(pct)}`}
                      >
                        {pct}%
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-6 mt-5 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-green-500" />
          <span className="text-xs text-gray-600">Low Risk &lt;10%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-yellow-400" />
          <span className="text-xs text-gray-600">Moderate 10–30%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-red-500" />
          <span className="text-xs text-gray-600">High &gt;30%</span>
        </div>
      </div>
    </div>
  );
}
