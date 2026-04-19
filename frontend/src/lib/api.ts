const API_BASE = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:8080'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('jwt')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw Object.assign(new Error(await res.text()), { status: res.status })
  return res.json()
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw Object.assign(new Error(await res.text()), { status: res.status })
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw Object.assign(new Error(await res.text()), { status: res.status })
  return res.json()
}
