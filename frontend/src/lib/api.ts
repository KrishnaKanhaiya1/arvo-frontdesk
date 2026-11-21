const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const role = localStorage.getItem('arvo_actor_role') || (path.startsWith('/api/customer') ? 'customer' : 'agent');
  const actorId = localStorage.getItem('arvo_actor_id') || (role === 'customer' ? 'cust-acme' : 'agent-meera');

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
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
