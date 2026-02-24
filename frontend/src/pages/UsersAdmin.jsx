import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Upload, Pencil, Trash2, RotateCcw, X } from 'lucide-react';

export default function UsersAdmin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('active');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.listUsers({ status: tab }).then(setUsers).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg">Admin access required to manage users.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">Manage users in your organization</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-4">
        {['active', 'deleted'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
            }`}>
            {t === 'active' ? 'Active Users' : 'Deleted Users'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.first_name} {u.last_name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>{u.is_active ? 'Active' : 'Deleted'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.is_active ? (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {u.id !== currentUser.id && (
                          <button onClick={() => { api.deleteUser(u.id).then(load); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => { api.restoreUser(u.id).then(load); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-green-600" title="Restore">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Admin Settings */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Settings</h2>
        <IntelliScoreToggle />
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} />}
      {showImport && <ImportUsersModal onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); load(); }} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onDone={() => { setEditUser(null); load(); }} />}
    </div>
  );
}

function AddUserModal({ onClose, onDone }) {
  const [form, setForm] = useState({ email: '', password: 'Insight2024!', first_name: '', last_name: '', role: 'examiner' });
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try { await api.createUser(form); onDone(); }
    catch (e) { setErr(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Add New User</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="First Name *" required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Last Name *" required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <input type="email" placeholder="Email *" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="examiner">Examiner</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onDone }) {
  const [form, setForm] = useState({ first_name: user.first_name, last_name: user.last_name, role: user.role });
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try { await api.updateUser(user.id, form); onDone(); }
    catch (e) { setErr(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Edit User</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-gray-500">{user.email}</p>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="First Name" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Last Name" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="examiner">Examiner</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={submitting} className="w-full bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {submitting ? 'Updating...' : 'Update User'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ImportUsersModal({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const r = await api.bulkImportUsers(file);
      setResult(r);
      if (r.created > 0) setTimeout(onDone, 1500);
    } catch { setResult({ created: 0, errors: ['Upload failed'] }); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Bulk Import Users</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-600 mb-3">Upload a CSV with columns: <code className="bg-gray-100 px-1 rounded">email, first_name, last_name, role, password</code></p>
        <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} className="w-full mb-3 text-sm" />
        {result && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg text-sm">
            <p className="text-green-700 font-medium">{result.created} users created</p>
            {result.errors?.length > 0 && result.errors.map((e, i) => <p key={i} className="text-red-600 text-xs mt-1">{e}</p>)}
          </div>
        )}
        <button onClick={submit} disabled={!file || loading} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Importing...' : 'Import Users'}
        </button>
      </div>
    </div>
  );
}

function IntelliScoreToggle() {
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getMe().then(me => {
      if (me.organization?.intelliscore_enabled !== undefined) {
        setEnabled(me.organization.intelliscore_enabled);
      }
    }).catch(() => {});
  }, []);

  const toggle = async () => {
    setSaving(true);
    try {
      await api.updateOrgSettings({ intelliscore_enabled: !enabled });
      setEnabled(!enabled);
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900 text-sm">IntelliScore AI Analysis</p>
        <p className="text-xs text-gray-500">Enable or disable IntelliScore for all users in your organization.</p>
      </div>
      <button onClick={toggle} disabled={saving}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-purple-600' : 'bg-gray-300'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
