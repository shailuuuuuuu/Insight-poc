const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

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
  getGroupStudents: (groupId) => request(`/students/groups/${groupId}/students`),
  deleteGroup: (groupId) => request(`/students/groups/${groupId}`, { method: 'DELETE' }),

  // Assessments
  getSubtests: () => request('/assessments/subtests'),
  startTest: (data) => request('/assessments/start', { method: 'POST', body: JSON.stringify(data) }),
  addScore: (sessionId, data) => request(`/assessments/${sessionId}/scores`, { method: 'POST', body: JSON.stringify(data) }),
  addManualScores: (sessionId, scores) => request(`/assessments/${sessionId}/manual-scores`, { method: 'POST', body: JSON.stringify(scores) }),
  completeTest: (sessionId) => request(`/assessments/${sessionId}/complete`, { method: 'POST' }),
  getTestSession: (sessionId) => request(`/assessments/${sessionId}`),
  getRecommendations: (sessionId) => request(`/assessments/${sessionId}/recommendations`),
  getStudentHistory: (studentId) => request(`/assessments/student/${studentId}/history`),
  getNextSubtest: (studentId, academicYear = '2025-2026') =>
    request(`/assessments/student/${studentId}/next-subtest?academic_year=${academicYear}`),
  editScore: (sessionId, scoreId, data) => request(`/assessments/${sessionId}/scores/${scoreId}`, { method: 'PUT', body: JSON.stringify(data) }),

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

  // Organization settings
  updateOrgSettings: (data) => request('/users/org-settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Licenses
  listLicenses: () => request('/licenses/'),

  // Students - inactive
  setStudentInactive: (id) => request(`/students/${id}/set-inactive`, { method: 'POST' }),
  setStudentActive: (id) => request(`/students/${id}/set-active`, { method: 'POST' }),

  // Stimulus
  getStories: (grade, timeOfYear, assessmentType = 'benchmark') =>
    request(`/stimulus/stories/${grade}/${timeOfYear}?assessment_type=${assessmentType}`),
  getDdmGrid: (target) => request(`/stimulus/ddm-grid/${target}`),

  // Benchmarks
  getBenchmarks: () => request('/assessments/benchmarks'),

  // Notifications
  getNotifications: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/notifications/${qs ? `?${qs}` : ''}`);
  },
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/notifications/mark-all-read', { method: 'POST' }),
  getUnreadCount: () => request('/notifications/unread-count'),

  // MTSS
  tierSummary: () => request('/mtss/tier-summary'),
  tierStudents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/mtss/tier-students${qs ? `?${qs}` : ''}`);
  },
  tierHistory: (studentId) => request(`/mtss/tier-history/${studentId}`),
  createInterventionLog: (data) => request('/mtss/intervention-log', { method: 'POST', body: JSON.stringify(data) }),
  getInterventionLogs: (studentId) => request(`/mtss/intervention-logs/${studentId}`),

  // Interventions
  listInterventions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/interventions/${qs ? `?${qs}` : ''}`);
  },
  getIntervention: (id) => request(`/interventions/${id}`),
  assignIntervention: (data) => request('/interventions/assign', { method: 'POST', body: JSON.stringify(data) }),
  getAssignments: (studentId) => request(`/interventions/assignments/${studentId}`),
  updateAssignmentStatus: (id, status) => request(`/interventions/assignments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // PD Hub
  listPDCourses: () => request('/pd/courses'),
  getPDCourse: (id) => request(`/pd/courses/${id}`),
  completePDModule: (id, score) => request(`/pd/modules/${id}/complete`, { method: 'POST', body: JSON.stringify({ score }) }),
  getMyPDProgress: () => request('/pd/my-progress'),
  getPDCertificate: (courseId) => request(`/pd/certificate/${courseId}`),

  // Pathways
  generatePathway: (studentId) => request(`/pathways/generate/${studentId}`, { method: 'POST' }),
  getStudentPathway: (studentId) => request(`/pathways/student/${studentId}`),
  completePathwayActivity: (id) => request(`/pathways/activities/${id}/complete`, { method: 'PUT' }),
  deletePathway: (id) => request(`/pathways/${id}`, { method: 'DELETE' }),

  // Executive Analytics
  getScorecard: () => request('/executive/scorecard'),
  getSchoolComparison: () => request('/executive/school-comparison'),

  // Test Builder
  listTestItems: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/test-builder/items${qs ? `?${qs}` : ''}`);
  },
  createTestItem: (data) => request('/test-builder/items', { method: 'POST', body: JSON.stringify(data) }),
  listCustomTests: () => request('/test-builder/tests'),
  createCustomTest: (data) => request('/test-builder/tests', { method: 'POST', body: JSON.stringify(data) }),
  getCustomTest: (id) => request(`/test-builder/tests/${id}`),
  deleteCustomTest: (id) => request(`/test-builder/tests/${id}`, { method: 'DELETE' }),

  // Workspaces
  listWorkspaces: () => request('/workspaces/'),
  createWorkspace: (data) => request('/workspaces/', { method: 'POST', body: JSON.stringify(data) }),
  getWorkspace: (id) => request(`/workspaces/${id}`),
  addWorkspaceNote: (id, data) => request(`/workspaces/${id}/notes`, { method: 'POST', body: JSON.stringify(data) }),
  getWorkspaceNotes: (id) => request(`/workspaces/${id}/notes`),
  addActionItem: (id, data) => request(`/workspaces/${id}/action-items`, { method: 'POST', body: JSON.stringify(data) }),
  getActionItems: (id) => request(`/workspaces/${id}/action-items`),
  toggleActionItem: (id) => request(`/workspaces/action-items/${id}/toggle`, { method: 'PUT' }),

  // Gamification
  listBadges: () => request('/gamification/badges'),
  getStudentBadges: (studentId) => request(`/gamification/student/${studentId}/badges`),
  getStudentStreak: (studentId) => request(`/gamification/student/${studentId}/streak`),
  getStudentProfile: (studentId) => request(`/gamification/student/${studentId}/profile`),
  checkBadges: (studentId) => request(`/gamification/student/${studentId}/check-badges`, { method: 'POST' }),

  // SEL
  createSELScreening: (data) => request('/sel/screenings', { method: 'POST', body: JSON.stringify(data) }),
  getStudentSEL: (studentId) => request(`/sel/student/${studentId}`),
  getSELClassSummary: () => request('/sel/class-summary'),
  getSELCorrelation: () => request('/sel/correlation'),

  // Predictions
  getAtRiskPredictions: () => request('/predictions/at-risk'),
  toggleWatchlist: (studentId) => request(`/predictions/${studentId}/watchlist`, { method: 'POST' }),

  // AI Assistant
  askAssistant: (query) => request('/assistant/ask', { method: 'POST', body: JSON.stringify({ query }) }),

  // Parent Portal
  getMyChildren: () => request('/parent/my-children'),
  getChildProgress: (studentId) => request(`/parent/child/${studentId}/progress`),
  getChildActivities: (studentId) => request(`/parent/child/${studentId}/activities`),

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
  testingQueue: () => request('/reports/testing-queue'),
  completionStats: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/completion-stats${qs ? `?${qs}` : ''}`);
  },
  riskHeatmap: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/risk-heatmap${qs ? `?${qs}` : ''}`);
  },
  exportReport: (type, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/export/${type}${qs ? `?${qs}` : ''}`);
  },
};
