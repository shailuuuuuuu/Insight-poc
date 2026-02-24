import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { KeyRound } from 'lucide-react';

export default function Licenses() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listLicenses().then(setLicenses).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const total = licenses.reduce((s, l) => s + l.total, 0);
  const used = licenses.reduce((s, l) => s + l.used, 0);
  const available = total - used;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Licenses</h1>
        <p className="text-gray-500 text-sm mt-1">View license usage across academic years</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Licenses" value={total} color="blue" />
        <StatCard label="Used" value={used} color="amber" />
        <StatCard label="Available" value={available} color="green" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : licenses.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <KeyRound className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No licenses found for your organization.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Academic Year</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Used</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Available</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {licenses.map(l => {
                const avail = l.total - l.used;
                const pct = l.total > 0 ? Math.round((l.used / l.total) * 100) : 0;
                return (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{l.academic_year}</td>
                    <td className="px-4 py-3 text-gray-600">{l.total}</td>
                    <td className="px-4 py-3 text-gray-600">{l.used}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${avail > 10 ? 'text-green-600' : avail > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                        {avail}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                          <div
                            className={`h-2 rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
