import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Users2, ArrowLeft, Plus, X, MessageSquare, CheckSquare, Clock } from 'lucide-react';

const TYPE_BADGES = {
  PLC: 'bg-blue-100 text-blue-700',
  'Grade Team': 'bg-green-100 text-green-700',
  Intervention: 'bg-amber-100 text-amber-700',
  Custom: 'bg-purple-100 text-purple-700',
};

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(null);

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listWorkspaces();
      setWorkspaces(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadWorkspaces(); }, [loadWorkspaces]);

  if (activeWorkspace) {
    return (
      <WorkspaceDetail
        workspace={activeWorkspace}
        onBack={() => { setActiveWorkspace(null); loadWorkspaces(); }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
            <Users2 className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
            <p className="text-gray-500 mt-0.5">Collaborate with your team</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" /> Create Workspace
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
          <Users2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No workspaces yet</p>
          <p className="text-sm mt-1">Create a workspace to start collaborating</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <div key={ws.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 truncate flex-1 mr-2">{ws.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${TYPE_BADGES[ws.type] || 'bg-gray-100 text-gray-600'}`}>
                  {ws.type}
                </span>
              </div>
              <p className="text-sm text-gray-500">{ws.member_count ?? ws.members?.length ?? 0} members</p>
              <button
                onClick={() => setActiveWorkspace(ws)}
                className="mt-4 w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
              >
                Open
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateWorkspaceModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadWorkspaces(); }}
        />
      )}
    </div>
  );
}

function CreateWorkspaceModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('PLC');
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listUsers({ status: 'active' }).then(setUsers).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.createWorkspace({ name, type, member_ids: selectedUserIds });
      onCreated();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Create Workspace</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Workspace Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., 3rd Grade PLC"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            >
              {Object.keys(TYPE_BADGES).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Members</label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
              {users.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">No users available</p>
              ) : (
                users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(u.id)}
                      onChange={(e) => {
                        setSelectedUserIds((prev) =>
                          e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                        );
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">{u.first_name} {u.last_name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{u.role}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving || !name.trim()} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkspaceDetail({ workspace, onBack }) {
  const [tab, setTab] = useState('notes');
  const [notes, setNotes] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [noteStudent, setNoteStudent] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [actionForm, setActionForm] = useState({ title: '', assignee: '', due_date: '' });
  const [addingAction, setAddingAction] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [n, a] = await Promise.all([
        api.getWorkspaceNotes(workspace.id),
        api.getActionItems(workspace.id),
      ]);
      setNotes(n);
      setActionItems(a);
    } catch {}
    setLoading(false);
  }, [workspace.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await api.addWorkspaceNote(workspace.id, {
        content: noteText,
        student_id: noteStudent || undefined,
      });
      setNoteText('');
      setNoteStudent('');
      loadData();
    } catch {}
    setAddingNote(false);
  };

  const handleAddAction = async (e) => {
    e.preventDefault();
    if (!actionForm.title.trim()) return;
    setAddingAction(true);
    try {
      await api.addActionItem(workspace.id, actionForm);
      setActionForm({ title: '', assignee: '', due_date: '' });
      loadData();
    } catch {}
    setAddingAction(false);
  };

  const handleToggleAction = async (id) => {
    try {
      await api.toggleActionItem(id);
      loadData();
    } catch {}
  };

  const members = workspace.members || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{workspace.name}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${TYPE_BADGES[workspace.type] || 'bg-gray-100 text-gray-600'}`}>
              {workspace.type}
            </span>
          </div>
          {members.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {members.slice(0, 6).map((m, i) => (
                <div
                  key={m.id || i}
                  className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold border-2 border-white -ml-1 first:ml-0"
                  title={`${m.first_name} ${m.last_name}`}
                >
                  {(m.first_name?.[0] || '')}{(m.last_name?.[0] || '')}
                </div>
              ))}
              {members.length > 6 && (
                <span className="text-xs text-gray-400 ml-2">+{members.length - 6} more</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'notes', label: 'Notes / Discussion', icon: MessageSquare },
          { key: 'actions', label: 'Action Items', icon: CheckSquare },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
        </div>
      ) : tab === 'notes' ? (
        <div className="space-y-4">
          {/* Add Note Form */}
          <form onSubmit={handleAddNote} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              placeholder="Add a note or discussion point..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <input
                value={noteStudent}
                onChange={(e) => setNoteStudent(e.target.value)}
                placeholder="Student ID (optional)"
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 w-48"
              />
              <button
                type="submit"
                disabled={addingNote || !noteText.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {addingNote ? 'Posting...' : 'Post Note'}
              </button>
            </div>
          </form>

          {/* Notes List */}
          {notes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No notes yet. Start the discussion!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                      {(note.author_name?.[0] || note.author?.[0] || 'U')}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{note.author_name || note.author || 'Unknown'}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {note.created_at ? new Date(note.created_at).toLocaleString() : ''}
                    </span>
                    {note.student_id && (
                      <span className="ml-auto px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        Student #{note.student_id}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Add Action Item Form */}
          <form onSubmit={handleAddAction} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">Action Item</label>
                <input
                  value={actionForm.title}
                  onChange={(e) => setActionForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="What needs to be done?"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assignee</label>
                <input
                  value={actionForm.assignee}
                  onChange={(e) => setActionForm((p) => ({ ...p, assignee: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 w-40"
                  placeholder="Who?"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                <input
                  type="date"
                  value={actionForm.due_date}
                  onChange={(e) => setActionForm((p) => ({ ...p, due_date: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                type="submit"
                disabled={addingAction || !actionForm.title.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {addingAction ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>

          {/* Action Items List */}
          {actionItems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No action items yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
              {actionItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                  <button
                    onClick={() => handleToggleAction(item.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      item.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-primary-400'
                    }`}
                  >
                    {item.completed && <CheckSquare className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {item.assignee && (
                        <span className="text-xs text-gray-400">{item.assignee}</span>
                      )}
                      {item.due_date && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
