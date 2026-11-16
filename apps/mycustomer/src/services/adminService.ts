export interface Branch {
  id: string
  code: string
  name: string
  created_at: string
  address?: string
  city: string
  is_active?: boolean
}

export interface ManagedUser {
  id: string
  username: string
  email: string
  display_name: string
  pin: string
  role: string
  created_at: string
  branch: string
}

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'petugas', label: 'Petugas' },
]

export function isManagerRole(role: string | undefined | null): boolean {
  const r = (role || '').toLowerCase()
  return r === 'admin' || r === 'owner' || r === 'super_admin' || r === 'role_admin'
}

async function request<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const options: RequestInit = { method }
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(body)
  }
  const response = await fetch(url, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Permintaan gagal (${response.status})`)
  return data as T
}

export async function getBranches(): Promise<Branch[]> {
  const data = await request<{ data: Branch[] }>('/api/admin/branches')
  return data.data
}

export async function createBranch(code: string, name: string, city: string): Promise<void> {
  await request('/api/admin/branches', 'POST', { code: code.trim(), name: name.trim(), city: city.trim() })
}

export async function updateBranch(branch: Branch): Promise<void> {
  await request('/api/admin/branches', 'PATCH', {
    id: branch.id,
    code: branch.code.trim(),
    name: branch.name.trim(),
    city: branch.city.trim(),
  })
}

export async function deleteBranch(id: string): Promise<void> {
  await request(`/api/admin/branches?id=${encodeURIComponent(id)}`, 'DELETE')
}

export async function getUsers(): Promise<ManagedUser[]> {
  const data = await request<{ data: ManagedUser[] }>('/api/admin/users')
  return data.data
}

export async function createUser(
  username: string,
  email: string,
  pin: string,
  role: string,
  branch: string,
  displayName: string,
): Promise<void> {
  await request('/api/admin/users', 'POST', {
    username: username.trim(),
    email: email.trim(),
    pin,
    role: isManagerRole(role) ? 'admin' : 'petugas',
    branch,
    display_name: displayName.trim(),
  })
}

export async function updateUser(user: ManagedUser): Promise<void> {
  await request('/api/admin/users', 'PATCH', {
    id: user.id,
    username: user.username.trim(),
    email: user.email.trim(),
    pin: user.pin || undefined,
    role: isManagerRole(user.role) ? 'admin' : 'petugas',
    branch: user.branch,
    display_name: user.display_name.trim(),
  })
}

export async function deleteUser(id: string): Promise<void> {
  await request(`/api/admin/users?id=${encodeURIComponent(id)}`, 'DELETE')
}
