const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';
export const apiUrl = BASE;
export async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE}/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}
