// API client for backend communication

interface ApiError {
  error: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json() as ApiError;
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

// Authentication API
export const authApi = {
  login: async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    return handleResponse<{ user: { id: string; username: string; role: string }; teacher?: any }>(response);
  },

  logout: async () => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<{ message: string }>(response);
  },

  me: async () => {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });
    return handleResponse<{ user: { id: string; username: string; role: string; email?: string; secretWord?: string }; teacher?: any }>(response);
  },

  updateProfile: async (data: { email?: string; secretWord?: string }) => {
    const response = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; user: any }>(response);
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string }>(response);
  },
};

// Students API
export const studentsApi = {
  getAll: async () => {
    const response = await fetch('/api/students');
    return handleResponse<any[]>(response);
  },

  create: async (student: any) => {
    const response = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    return handleResponse<any>(response);
  },

  update: async (id: string, student: any) => {
    const response = await fetch(`/api/students/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    return handleResponse<any>(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`/api/students/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },

  getTermDetails: async (studentId: string, termId: string) => {
    const response = await fetch(`/api/students/${studentId}/term-details?termId=${termId}`);
    return handleResponse<any>(response);
  },

  saveTermDetails: async (studentId: string, details: any) => {
    const response = await fetch(`/api/students/${studentId}/term-details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    });
    return handleResponse<any>(response);
  },
};

// Teachers API
export const teachersApi = {
  getAll: async () => {
    const response = await fetch('/api/teachers');
    return handleResponse<any[]>(response);
  },

  create: async (teacher: any) => {
    const response = await fetch('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacher),
    });
    return handleResponse<any>(response);
  },

  update: async (id: string, teacher: any) => {
    const response = await fetch(`/api/teachers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacher),
    });
    return handleResponse<any>(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`/api/teachers/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },

  getStudents: async (teacherId: string, classLevel?: string) => {
    const url = classLevel
      ? `/api/teachers/${teacherId}/students?classLevel=${encodeURIComponent(classLevel)}`
      : `/api/teachers/${teacherId}/students`;
    const response = await fetch(url);
    return handleResponse<any[]>(response);
  },

  getScores: async (teacherId: string, termId: string, classLevel?: string, subjectId?: string) => {
    const params = new URLSearchParams({ termId });
    if (classLevel) params.append('classLevel', classLevel);
    if (subjectId) params.append('subjectId', subjectId);
    const response = await fetch(`/api/teachers/${teacherId}/scores?${params}`);
    return handleResponse<any[]>(response);
  },

  saveScore: async (teacherId: string, scoreData: {
    studentId: string;
    subjectId: string;
    termId: string;
    classScore: number;
    examScore: number;
  }) => {
    const response = await fetch(`/api/teachers/${teacherId}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scoreData),
    });
    return handleResponse<any>(response);
  },

  resetPassword: async (teacherId: string, password: string) => {
    const response = await fetch(`/api/admin/teachers/${teacherId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return handleResponse<{ message: string }>(response);
  },
};

// Subjects API
export const subjectsApi = {
  getAll: async () => {
    const response = await fetch('/api/subjects');
    return handleResponse<any[]>(response);
  },

  create: async (subject: any) => {
    const response = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subject),
    });
    return handleResponse<any>(response);
  },

  update: async (id: string, subject: any) => {
    const response = await fetch(`/api/subjects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subject),
    });
    return handleResponse<any>(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`/api/subjects/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },
};

// Academic Years API
export const academicYearsApi = {
  getAll: async () => {
    const response = await fetch('/api/academic-years');
    return handleResponse<any[]>(response);
  },

  getActive: async () => {
    const response = await fetch('/api/academic-years/active');
    return handleResponse<any>(response);
  },

  create: async (year: any) => {
    const response = await fetch('/api/academic-years', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(year),
    });
    return handleResponse<any>(response);
  },

  update: async (id: string, year: any) => {
    const response = await fetch(`/api/academic-years/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(year),
    });
    return handleResponse<any>(response);
  },

  setActive: async (id: string) => {
    const response = await fetch(`/api/academic-years/${id}/set-active`, {
      method: 'POST',
    });
    return handleResponse<any>(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`/api/academic-years/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },
};

// Academic Terms API
export const academicTermsApi = {
  getAll: async (yearId?: string) => {
    const url = yearId ? `/api/academic-terms?yearId=${yearId}` : '/api/academic-terms';
    const response = await fetch(url);
    return handleResponse<any[]>(response);
  },

  getActive: async () => {
    const response = await fetch('/api/academic-terms/active');
    return handleResponse<any>(response);
  },

  create: async (term: any) => {
    const response = await fetch('/api/academic-terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(term),
    });
    return handleResponse<any>(response);
  },

  update: async (id: string, term: any) => {
    const response = await fetch(`/api/academic-terms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(term),
    });
    return handleResponse<any>(response);
  },

  setActive: async (id: string) => {
    const response = await fetch(`/api/academic-terms/${id}/set-active`, {
      method: 'POST',
    });
    return handleResponse<any>(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`/api/academic-terms/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },
};

// Scores API
export const scoresApi = {
  getAll: async () => {
    const response = await fetch('/api/scores');
    return handleResponse<any[]>(response);
  },

  getByStudent: async (studentId: string) => {
    const response = await fetch(`/api/scores?studentId=${studentId}`);
    return handleResponse<any[]>(response);
  },

  getByTerm: async (termId: string) => {
    const response = await fetch(`/api/scores?termId=${termId}`);
    return handleResponse<any[]>(response);
  },

  create: async (score: any) => {
    const response = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(score),
    });
    return handleResponse<any>(response);
  },

  update: async (id: string, score: any) => {
    const response = await fetch(`/api/scores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(score),
    });
    return handleResponse<any>(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`/api/scores/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },
};

// Teacher Assignments API
export const teacherAssignmentsApi = {
  getAll: async () => {
    const response = await fetch('/api/teacher-assignments');
    return handleResponse<any[]>(response);
  },

  getByTeacher: async (teacherId: string) => {
    const response = await fetch(`/api/teacher-assignments?teacherId=${teacherId}`);
    return handleResponse<any[]>(response);
  },

  create: async (assignment: any) => {
    const response = await fetch('/api/teacher-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignment),
    });
    return handleResponse<any>(response);
  },

  bulkCreate: async (teacherId: string, assignments: any[]) => {
    const response = await fetch('/api/teacher-assignments/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId, assignments }),
    });
    return handleResponse<any[]>(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`/api/teacher-assignments/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },
};

// Grading Scales API
export const gradingScalesApi = {
  getAll: async () => {
    const response = await fetch('/api/grading-scales');
    return handleResponse<any[]>(response);
  },

  create: async (scale: any) => {
    const response = await fetch('/api/grading-scales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scale),
    });
    return handleResponse<any>(response);
  },

  update: async (id: string, scale: any) => {
    const response = await fetch(`/api/grading-scales/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scale),
    });
    return handleResponse<any>(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`/api/grading-scales/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },
};

// Assessment Configs API
export const assessmentConfigsApi = {
  getAll: async () => {
    const response = await fetch('/api/assessment-configs');
    return handleResponse<any[]>(response);
  },

  update: async (id: string, config: any) => {
    const response = await fetch(`/api/assessment-configs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return handleResponse<any>(response);
  },
};
