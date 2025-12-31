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
    return handleResponse<{ user: { id: string; username: string; role: string } }>(response);
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
};

// Academic Terms API
export const academicTermsApi = {
  getAll: async () => {
    const response = await fetch('/api/academic-terms');
    return handleResponse<any[]>(response);
  },

  create: async (term: any) => {
    const response = await fetch('/api/academic-terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(term),
    });
    return handleResponse<any>(response);
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
