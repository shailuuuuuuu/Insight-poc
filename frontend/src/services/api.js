const BASE = '/api';

function getToken() {
  return localStorage.getItem('insight_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('insight_token');
    localStorage.removeItem('insight_user');
    window.location.href = '/login';
    return;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  if (res.headers.get('content-type')?.includes('text/csv')) {
    return res.blob();
  }
  return res.json();
}

export const api = {
  // Auth
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  signup: (data) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),

  // Students
  getAllStudents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/students/all${qs ? `?${qs}` : ''}`);
  },
  getMyStudents: () => request('/students/my'),
  createStudent: (data) => request('/students/', { method: 'POST', body: JSON.stringify(data) }),
  getStudent: (id) => request(`/students/${id}`),
  updateStudent: (id, data) => request(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addToMyStudents: (ids) => request('/students/add-to-my-students', { method: 'POST', body: JSON.stringify(ids) }),
  removeFromMyStudents: (id) => request(`/students/remove-from-my-students/${id}`, { method: 'DELETE' }),
  bulkImport: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/students/bulk-import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return res.json();
  },

  // Groups
  listGroups: () => request('/students/groups/list'),
  createGroup: (data) => request('/students/groups', { method: 'POST', body: JSON.stringify(data) }),
  addStudentsToGroup: (groupId, ids) =>
    request(`/students/groups/${groupId}/add-students`, { method: 'POST', body: JSON.stringify(ids) }),

  // Assessments
  getSubtests: () => request('/assessments/subtests'),
  startTest: (data) => request('/assessments/start', { method: 'POST', body: JSON.stringify(data) }),
  addScore: (sessionId, data) => request(`/assessments/${sessionId}/scores`, { method: 'POST', body: JSON.stringify(data) }),
  addManualScores: (sessionId, scores) => request(`/assessments/${sessionId}/manual-scores`, { method: 'POST', body: JSON.stringify(scores) }),
  completeTest: (sessionId) => request(`/assessments/${sessionId}/complete`, { method: 'POST' }),
  getTestSession: (sessionId) => request(`/assessments/${sessionId}`),
  getRecommendations: (sessionId) => request(`/assessments/${sessionId}/recommendations`),
  getStudentHistory: (studentId) => request(`/assessments/student/${studentId}/history`),

  // IntelliScore
  uploadAudio: async (sessionId, blob) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    const res = await fetch(`${BASE}/assessments/${sessionId}/upload-audio`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Audio upload failed');
    return res.json();
  },
  transcribeAudio: (sessionId) =>
    request(`/assessments/${sessionId}/transcribe`, { method: 'POST' }),
  setTranscript: (sessionId, transcript) =>
    request(`/assessments/${sessionId}/set-transcript`, { method: 'POST', body: JSON.stringify({ transcript }) }),
  analyzeTranscript: (sessionId) =>
    request(`/assessments/${sessionId}/analyze-transcript`, { method: 'POST' }),

  // Users (admin)
  listUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/users/${qs ? `?${qs}` : ''}`);
  },
  createUser: (data) => request('/users/', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  restoreUser: (id) => request(`/users/${id}/restore`, { method: 'POST' }),
  bulkImportUsers: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/users/bulk-import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return res.json();
  },

  // Licenses
  listLicenses: () => request('/licenses/'),

  // Students - inactive
  setStudentInactive: (id) => request(`/students/${id}/set-inactive`, { method: 'POST' }),
  setStudentActive: (id) => request(`/students/${id}/set-active`, { method: 'POST' }),

  // Stimulus
  getStories: (grade, timeOfYear, assessmentType = 'benchmark') =>
    request(`/stimulus/stories/${grade}/${timeOfYear}?assessment_type=${assessmentType}`),
  getDdmGrid: (target) => request(`/stimulus/ddm-grid/${target}`),

  // Reports
  riskSummary: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/risk-summary${qs ? `?${qs}` : ''}`);
  },
  studentRiskTable: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/student-risk-table${qs ? `?${qs}` : ''}`);
  },
  studentProgress: (studentId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/student/${studentId}/progress${qs ? `?${qs}` : ''}`);
  },
  exportReport: (type, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/export/${type}${qs ? `?${qs}` : ''}`);
  },
};
