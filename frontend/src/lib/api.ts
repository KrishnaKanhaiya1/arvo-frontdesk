export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl) {
      // If envUrl is explicitly pointing to localhost and browser is on 127.0.0.1, align them
      if (window.location.hostname === '127.0.0.1' && envUrl.includes('localhost')) {
        return envUrl.replace('localhost', '127.0.0.1');
      }
      return envUrl;
    }
    // Dynamic fallback matching current hostname (127.0.0.1 vs localhost)
    const host = window.location.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';
    return `http://${host}:3001`;
  }
  return (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
}

export const API_URL = getApiUrl();

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const role = localStorage.getItem('arvo_actor_role') || (path.startsWith('/api/customer') ? 'customer' : 'agent');
  const actorId = localStorage.getItem('arvo_actor_id') || (role === 'customer' ? 'cust-acme' : 'agent-meera');
  const baseUrl = getApiUrl();

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: 'include', // Automatically send and receive HTTP-only session cookies
    headers: {
      'Content-Type': 'application/json',
      'x-actor-role': role,
      'x-actor-id': actorId,
      ...options?.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) throw { status: res.status, ...json.error };
  return (json.data !== undefined ? json.data : json) as T;
}

export async function loginWithCredentials(email: string, password: string) {
  return apiFetch<{ success: boolean; user: any }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function loginDemoPersona(personaId: string) {
  return apiFetch<{ success: boolean; user: any }>('/api/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify({ personaId }),
  });
}

export async function fetchCurrentSession() {
  return apiFetch<{ authenticated: boolean; user: any | null }>('/api/auth/session');
}

export async function logoutPersona() {
  return apiFetch<{ success: boolean }>('/api/auth/logout', {
    method: 'POST',
  });
}
