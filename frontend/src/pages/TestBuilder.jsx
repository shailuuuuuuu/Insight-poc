import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { PenTool, Search, Plus, X, ChevronUp, ChevronDown, Trash2, Eye, Check } from 'lucide-react';

const RESPONSE_TYPES = ['selected', 'constructed', 'oral'];
const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];
const GRADE_OPTIONS = ['K', '1', '2', '3', '4', '5', '6', '7', '8'];
const SKILL_AREAS = ['phonemic_awareness', 'phonics', 'fluency', 'vocabulary', 'comprehension', 'writing'];

export default function TestBuilder() {
  const [tab, setTab] = useState('items');
  const [items, setItems] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [testDetail, setTestDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);
  const [filters, setFilters] = useState({ skill_area: '', grade: '', difficulty: '', search: '' });

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.skill_area) params.skill_area = filters.skill_area;
      if (filters.grade) params.grade = filters.grade;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.search) params.search = filters.search;
      const data = await api.listTestItems(params);
      setItems(data);
    } catch {}
    setLoading(false);
  }, [filters]);

  const loadTests = useCallback(async () => {
    try {
      const data = await api.listCustomTests();
      setTests(data);
    } catch {}
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { loadTests(); }, []);

  const handleDeleteTest = async (id) => {
    if (!confirm('Delete this test?')) return;
    try {
      await api.deleteCustomTest(id);
      if (selectedTest === id) { setSelectedTest(null); setTestDetail(null); }
      loadTests();
    } catch {}
  };

  const handleViewTest = async (id) => {
    if (selectedTest === id) { setSelectedTest(null); setTestDetail(null); return; }
    setSelectedTest(id);
    setDetailLoading(true);
    try {
      const detail = await api.getCustomTest(id);
      setTestDetail(detail);
    } catch { setTestDetail(null); }
    setDetailLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
          <PenTool className="w-6 h-6 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Builder</h1>
          <p className="text-gray-500 mt-0.5">Create custom assessments from the item bank</p>
        </div>
      </div>

      {/* Summary Tiles — click to switch tabs */}
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <button
          onClick={() => setTab('items')}
          className={`rounded-xl border-2 p-5 text-left transition-all hover:shadow-md ${
            tab === 'items'
              ? 'border-primary-500 bg-primary-50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className={`text-3xl font-bold ${tab === 'items' ? 'text-primary-700' : 'text-gray-800'}`}>
            {items.length}
          </p>
          <p className="text-sm font-medium text-gray-500 mt-1">Item Bank</p>
        </button>
        <button
          onClick={() => setTab('tests')}
          className={`rounded-xl border-2 p-5 text-left transition-all hover:shadow-md ${
            tab === 'tests'
              ? 'border-violet-500 bg-violet-50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className={`text-3xl font-bold ${tab === 'tests' ? 'text-violet-700' : 'text-gray-800'}`}>
            {tests.length}
          </p>
          <p className="text-sm font-medium text-gray-500 mt-1">My Tests</p>
        </button>
      </div>

      {tab === 'items' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={filters.search}
                  onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                  placeholder="Search items..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={filters.skill_area}
                onChange={(e) => setFilters((p) => ({ ...p, skill_area: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Skills</option>
                {SKILL_AREAS.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <select
                value={filters.grade}
                onChange={(e) => setFilters((p) => ({ ...p, grade: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Grades</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
              <select
                value={filters.difficulty}
                onChange={(e) => setFilters((p) => ({ ...p, difficulty: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Difficulties</option>
                {DIFFICULTY_OPTIONS.map((d) => (
                  <option key={d} value={d} className="capitalize">{d}</option>
                ))}
              </select>
              <button
                onClick={() => setShowAddItem(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <PenTool className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No items found</p>
                <p className="text-sm mt-1">Try adjusting filters or add a new item</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Stem</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Skill Area</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Grade</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Difficulty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <React.Fragment key={item.id}>
                        <tr
                          onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                          className={`border-b border-gray-50 cursor-pointer transition-colors ${
                            expandedItem === item.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-4 py-3 text-gray-900 max-w-xs truncate" title={item.stem}>
                            <span className="flex items-center gap-2">
                              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${expandedItem === item.id ? 'rotate-180' : ''}`} />
                              {item.stem}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium capitalize">
                              {item.response_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 capitalize">{item.skill_area?.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-3 text-gray-600">{item.grade}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              item.difficulty === 'easy' ? 'bg-green-50 text-green-700'
                                : item.difficulty === 'hard' ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {item.difficulty}
                            </span>
                          </td>
                        </tr>
                        {expandedItem === item.id && (
                          <tr className="bg-gray-50">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-xs font-medium text-gray-400 uppercase mb-1">Full Question</p>
                                  <p className="text-gray-800">{item.stem}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-400 uppercase mb-1">Answer Key</p>
                                  <p className="text-gray-800">{item.answer_key || '—'}</p>
                                </div>
                                {item.distractors && (
                                  <div className="col-span-2">
                                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">Distractors</p>
                                    <p className="text-gray-600">{Array.isArray(item.distractors) ? item.distractors.join(', ') : item.distractors}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'tests' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" /> Create Test
            </button>
          </div>

          {tests.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
              <PenTool className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No custom tests yet</p>
              <p className="text-sm mt-1">Create your first custom assessment</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    onClick={() => handleViewTest(test.id)}
                    className={`bg-white rounded-xl shadow-sm border p-5 cursor-pointer transition-all hover:shadow-md ${
                      selectedTest === test.id ? 'border-primary-400 ring-2 ring-primary-200' : 'border-gray-200'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900 truncate">{test.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{test.item_count ?? test.items?.length ?? 0} items</p>
                    {test.description && (
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2">{test.description}</p>
                    )}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewTest(test.id); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTest(test.id); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 rounded-lg text-xs text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTest && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{testDetail?.name || 'Loading...'}</h2>
                      {testDetail?.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{testDetail.description}</p>
                      )}
                    </div>
                    <button onClick={() => { setSelectedTest(null); setTestDetail(null); }} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {detailLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full" />
                    </div>
                  ) : testDetail?.items?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left px-4 py-3 font-medium text-gray-500 w-8">#</th>
                            <th className="text-left px-4 py-3 font-medium text-gray-500">Question / Stem</th>
                            <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                            <th className="text-left px-4 py-3 font-medium text-gray-500">Skill</th>
                            <th className="text-left px-4 py-3 font-medium text-gray-500">Difficulty</th>
                            <th className="text-left px-4 py-3 font-medium text-gray-500">Answer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {testDetail.items.map((item, i) => (
                            <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                              <td className="px-4 py-3 text-gray-900">{item.stem}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium capitalize">
                                  {item.response_type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600 capitalize">{item.skill_area?.replace(/_/g, ' ')}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                                  item.difficulty === 'easy' ? 'bg-green-50 text-green-700'
                                    : item.difficulty === 'hard' ? 'bg-red-50 text-red-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}>{item.difficulty}</span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{item.answer_key || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-400 text-sm">No items in this test.</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showAddItem && (
        <AddItemModal
          onClose={() => setShowAddItem(false)}
          onCreated={() => { setShowAddItem(false); loadItems(); }}
        />
      )}

      {showWizard && (
        <CreateTestWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => { setShowWizard(false); loadTests(); }}
        />
      )}
    </div>
  );
}

function AddItemModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    stem: '', response_type: 'selected', answer_key: '',
    skill_area: 'comprehension', grade: '3', difficulty: 'medium',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.stem.trim()) return;
    setSaving(true);
    try {
      await api.createTestItem(form);
      onCreated();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Test Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Stem</label>
            <textarea
              value={form.stem}
              onChange={(e) => setForm((p) => ({ ...p, stem: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Enter the question or prompt..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Response Type</label>
              <select
                value={form.response_type}
                onChange={(e) => setForm((p) => ({ ...p, response_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              >
                {RESPONSE_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Answer Key</label>
              <input
                value={form.answer_key}
                onChange={(e) => setForm((p) => ({ ...p, answer_key: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Correct answer"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Skill Area</label>
              <select
                value={form.skill_area}
                onChange={(e) => setForm((p) => ({ ...p, skill_area: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              >
                {SKILL_AREAS.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
              <select
                value={form.grade}
                onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
              >
                {DIFFICULTY_OPTIONS.map((d) => (
                  <option key={d} value={d} className="capitalize">{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateTestWizard({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (step === 2 && allItems.length === 0) {
      setLoadingItems(true);
      api.listTestItems({}).then(setAllItems).catch(() => {}).finally(() => setLoadingItems(false));
    }
  }, [step]);

  const filteredItems = allItems.filter((item) =>
    !itemSearch || item.stem.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const selectedItems = selectedIds.map((id) => allItems.find((i) => i.id === id)).filter(Boolean);

  const moveItem = (index, direction) => {
    const newIds = [...selectedIds];
    const target = index + direction;
    if (target < 0 || target >= newIds.length) return;
    [newIds[index], newIds[target]] = [newIds[target], newIds[index]];
    setSelectedIds(newIds);
  };

  const handleSave = async () => {
    if (!name.trim() || selectedIds.length === 0) return;
    setSaving(true);
    try {
      await api.createCustomTest({ name, description, item_ids: selectedIds });
      onCreated();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create Custom Test</h2>
            <p className="text-sm text-gray-400">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Step indicators */}
        <div className="flex gap-1 px-6 pt-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-primary-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Grade 3 Comprehension Check"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Optional description..."
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Search items..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <p className="text-xs text-gray-400">{selectedIds.length} item(s) selected</p>
              {loadingItems ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full" />
                </div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {filteredItems.map((item) => (
                    <label key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) => {
                          setSelectedIds((prev) =>
                            e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                          );
                        }}
                        className="rounded mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{item.stem}</p>
                        <p className="text-xs text-gray-400">
                          {item.skill_area?.replace(/_/g, ' ')} · Grade {item.grade} · {item.difficulty}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{selectedItems.length} items selected. Reorder as needed:</p>
              <div className="space-y-1">
                {selectedItems.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs font-medium text-gray-400 w-6">{i + 1}.</span>
                    <p className="flex-1 text-sm text-gray-900 truncate">{item.stem}</p>
                    <button
                      onClick={() => moveItem(i, -1)}
                      disabled={i === 0}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => moveItem(i, 1)}
                      disabled={i === selectedItems.length - 1}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => setSelectedIds((prev) => prev.filter((id) => id !== item.id))}
                      className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-900">Test: {name}</p>
                {description && <p className="text-sm text-gray-500">{description}</p>}
                <p className="text-sm text-gray-500">{selectedIds.length} items</p>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">Ready to save</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !name.trim()) || (step === 2 && selectedIds.length === 0)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Test'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
