import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Plus, Upload, Search, UserPlus, X, Users, UserMinus, FolderPlus, Trash2, RotateCcw, UserX, Download, ChevronDown, ChevronRight } from 'lucide-react';

export default function Students() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [myStudents, setMyStudents] = useState([]);
  const [inactiveStudents, setInactiveStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [tab, setTab] = useState('my');
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(searchParams.get('action') === 'add');
  const [showImport, setShowImport] = useState(searchParams.get('action') === 'import');
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [all, my, grps, inactive] = await Promise.all([
        api.getAllStudents(),
        api.getMyStudents(),
        api.listGroups(),
        api.getAllStudents({ status: 'inactive' }),
      ]);
      setStudents(all);
      setMyStudents(my);
      setGroups(grps);
      setInactiveStudents(inactive);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getDisplayed = () => {
    if (tab === 'groups') return [];
    let list;
    if (tab === 'my') list = myStudents;
    else if (tab === 'all') list = students;
    else if (tab === 'inactive') list = inactiveStudents;
    else list = [];
    return list.filter((s) => {
      if (gradeFilter && s.grade !== gradeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          (s.student_id_external || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  };
  const displayed = getDisplayed();
  const myIds = new Set(myStudents.map((s) => s.id));
  const grades = [...new Set(students.map((s) => s.grade))].sort();

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectAll = () => {
    if (selectedIds.length === displayed.length) setSelectedIds([]);
    else setSelectedIds(displayed.map(s => s.id));
  };

  const addSelectedToGroup = async (groupId) => {
    await api.addStudentsToGroup(groupId, selectedIds);
    setSelectedIds([]);
    load();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {[
          { key: 'my', label: `My Students (${myStudents.length})` },
          { key: 'all', label: `All Students (${students.length})` },
          { key: 'groups', label: `My Groups (${groups.length})` },
          { key: 'inactive', label: `Inactive (${inactiveStudents.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelectedIds([]); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
        
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
        >
          <option value="">All Grades</option>
          {grades.map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
      </div>

      {/* My Groups Panel */}
      {tab === 'groups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">My Groups</h2>
            <button onClick={() => setShowGroupCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
              <FolderPlus className="w-4 h-4" /> Create Group
            </button>
          </div>
          {groups.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No groups yet.</p>
              <button onClick={() => setShowGroupCreate(true)} className="text-primary-600 text-sm mt-2 hover:underline">Create your first group</button>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map(g => (
                <GroupCard key={g.id} group={g} onDelete={async () => { if (confirm(`Delete group "${g.name}"?`)) { await api.deleteGroup(g.id); load(); } }} navigate={navigate} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {tab !== 'groups' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-400">Loading...</div>
            ) : displayed.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No students found.</p>
                {tab !== 'inactive' && (
                  <button onClick={() => setShowAddForm(true)} className="text-primary-600 text-sm mt-2 hover:underline">
                    Add your first student
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" checked={selectedIds.length === displayed.length && displayed.length > 0}
                        onChange={selectAll} className="rounded border-gray-300" />
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Grade</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">School</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/students/${s.id}`)}>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.includes(s.id)}
                          onChange={() => toggleSelect(s.id)} className="rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.last_name}, {s.first_name}</td>
                      <td className="px-4 py-3 text-gray-500">{s.student_id_external || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{s.grade}</td>
                      <td className="px-4 py-3 text-gray-600">{s.school || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>{s.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          {tab === 'all' && !myIds.has(s.id) && (
                            <button onClick={() => api.addToMyStudents([s.id]).then(load)}
                              className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Add to My Students">
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}
                          {tab === 'my' && (
                            <button onClick={() => api.removeFromMyStudents(s.id).then(load)}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Remove from My Students">
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                          {tab !== 'inactive' && s.status === 'active' && (
                            <button onClick={() => api.setStudentInactive(s.id).then(load)}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Make Inactive">
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                          {tab === 'inactive' && (
                            <button onClick={() => api.setStudentActive(s.id).then(load)}
                              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 text-green-600 text-xs font-medium" title="Reactivate">
                              <RotateCcw className="w-3.5 h-3.5" /> Active
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Bulk action bar */}
          {selectedIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4 z-40">
              <span className="text-sm font-medium">{selectedIds.length} selected</span>
              {tab !== 'my' && (
                <button onClick={() => { api.addToMyStudents(selectedIds).then(() => { setSelectedIds([]); load(); }); }}
                  className="px-3 py-1.5 bg-green-600 rounded-lg text-sm font-medium hover:bg-green-700">
                  Add to My Students
                </button>
              )}
              {groups.length > 0 && (
                <select onChange={e => { if (e.target.value) addSelectedToGroup(parseInt(e.target.value)); e.target.value = ''; }}
                  className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm text-white border-0 outline-none">
                  <option value="">Add to Group...</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
              <button onClick={() => setSelectedIds([])} className="text-gray-400 hover:text-white text-sm">Clear</button>
            </div>
          )}
        </>
      )}

      {showAddForm && <AddStudentModal onClose={() => setShowAddForm(false)} onSaved={load} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onDone={load} />}
      {showGroupCreate && <CreateGroupModal onClose={() => setShowGroupCreate(false)} onDone={() => { setShowGroupCreate(false); load(); }} />}
    </div>
  );
}

function GroupCard({ group, onDelete, navigate }) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const toggleExpand = async () => {
    if (!expanded && members.length === 0) {
      setLoadingMembers(true);
      try {
        const students = await api.getGroupStudents(group.id);
        setMembers(students);
      } catch {}
      setLoadingMembers(false);
    }
    setExpanded(!expanded);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
      <button
        onClick={toggleExpand}
        className="w-full p-5 text-left flex items-center gap-4"
      >
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{group.name}</h3>
          {group.description && <p className="text-xs text-gray-500 mt-0.5">{group.description}</p>}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users className="w-4 h-4" />
          <span>{group.student_count} student{group.student_count !== 1 ? 's' : ''}</span>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <button onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Delete Group">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-4">
          {loadingMembers ? (
            <div className="py-4 text-center text-gray-400 text-sm">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="py-4 text-center text-gray-400 text-sm">No students in this group.</div>
          ) : (
            <table className="w-full text-sm mt-2">
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
                {members.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/students/${s.id}`)}
                  >
                    <td className="py-2.5 font-medium text-gray-900 hover:text-primary-600">
                      {s.last_name}, {s.first_name}
                    </td>
                    <td className="py-2.5 text-gray-600">{s.grade}</td>
                    <td className="py-2.5 text-gray-600">{s.school || '—'}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>{s.status}</span>
                    </td>
                    <td className="py-2.5">
                      <span className="text-primary-600 text-xs flex items-center gap-1">
                        View <ChevronRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function AddStudentModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', grade: '', student_id_external: '', school: '', gender: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const update = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const student = await api.createStudent(form);
      await api.addToMyStudents([student.id]);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add New Student</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={form.first_name} onChange={(v) => update('first_name', v)} required />
            <Input label="Last Name" value={form.last_name} onChange={(v) => update('last_name', v)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <select value={form.grade} onChange={(e) => update('grade', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Select...</option>
                {['PreK','K','1','2','3','4','5','6','7','8'].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <Input label="Student ID" value={form.student_id_external} onChange={(v) => update('student_id_external', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="School" value={form.school} onChange={(v) => update('school', v)} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select value={form.gender} onChange={(e) => update('gender', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">—</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const res = await api.bulkImport(file);
    setResult(res);
    setLoading(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Import Students from CSV</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          CSV must include columns: <code className="bg-gray-100 px-1 rounded">first_name</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">last_name</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">grade</code>. Optional:{' '}
          <code className="bg-gray-100 px-1 rounded">student_id</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">school</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">gender</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">teacher_email</code>.
        </p>
        <button onClick={() => {
          const csv = 'first_name,last_name,grade,student_id,school,gender\nJohn,Doe,3,ST001,Elm Elementary,M\nJane,Smith,K,ST002,Oak Academy,F';
          const blob = new Blob([csv], { type: 'text/csv' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'student_import_template.csv'; a.click();
        }} className="flex items-center gap-1.5 mb-4 text-sm text-primary-600 hover:underline">
          <Download className="w-3.5 h-3.5" /> Download Sample CSV Template
        </button>

        {/* Column Mapping */}
        {file && !result && (
          <FieldMapper file={file} />
        )}
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} className="mb-4" />
        {result && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm">
            <p className="text-green-700 font-medium">{result.created} students imported.</p>
            {result.errors?.length > 0 && (
              <ul className="text-red-600 mt-2 list-disc ml-4">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
          <button onClick={handleImport} disabled={!file || loading}
            className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateGroupModal({ onClose, onDone }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try { await api.createGroup({ name, description: desc }); onDone(); }
    catch {} finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Group</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input placeholder="Group Name *" required value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <button type="submit" disabled={loading}
            className="w-full bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
}

function FieldMapper({ file }) {
  const [headers, setHeaders] = useState([]);
  const REQUIRED = ['first_name', 'last_name', 'grade'];
  const OPTIONAL = ['student_id', 'school', 'gender', 'teacher_email'];
  const ALL_FIELDS = [...REQUIRED, ...OPTIONAL];
  const [mapping, setMapping] = useState({});

  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const firstLine = e.target.result.split('\n')[0];
      const cols = firstLine.split(',').map(c => c.trim().replace(/"/g, ''));
      setHeaders(cols);
      const auto = {};
      cols.forEach((col, i) => {
        const lower = col.toLowerCase().replace(/\s+/g, '_');
        const match = ALL_FIELDS.find(f => f === lower || lower.includes(f.replace('_', '')));
        if (match) auto[i] = match;
      });
      setMapping(auto);
    };
    reader.readAsText(file);
  }, [file]);

  if (headers.length === 0) return null;

  return (
    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-xs font-semibold text-gray-600 mb-2">Column Mapping (drag labels to CSV columns)</p>
      <div className="space-y-1.5">
        {headers.map((h, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-32 text-gray-500 truncate">{h}</span>
            <span className="text-gray-400">→</span>
            <select value={mapping[i] || ''} onChange={(e) => setMapping(prev => ({ ...prev, [i]: e.target.value }))}
              className="px-2 py-1 border border-gray-300 rounded text-xs">
              <option value="">Skip</option>
              {ALL_FIELDS.map(f => <option key={f} value={f}>{f}{REQUIRED.includes(f) ? ' *' : ''}</option>)}
            </select>
            {mapping[i] && REQUIRED.includes(mapping[i]) && (
              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Required</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, required = false }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}
