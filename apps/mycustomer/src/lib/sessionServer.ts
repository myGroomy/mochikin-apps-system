import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getSheets, getSpreadsheetId } from './sheetsServer'

const SESSION_COOKIE = 'mycustomer_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

export interface AuthenticatedUser {
  id: string
  username: string
  display_name: string
  role: string
  branch: string
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters')
  }
  return secret
}

function sign(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('base64url')
}

export function createSessionToken(user: AuthenticatedUser): string {
  const payload = Buffer.from(JSON.stringify({
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifySessionToken(token: string | undefined): AuthenticatedUser | null {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = sign(payload)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AuthenticatedUser & { exp?: number }
    if (!parsed.id || !parsed.username || !parsed.role || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return { id: parsed.id, username: parsed.username, display_name: parsed.display_name || parsed.branch || parsed.username, role: parsed.role, branch: parsed.branch || '' }
  } catch {
    return null
  }
}

export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies()
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
}

export async function requireSession(roles?: string[]): Promise<AuthenticatedUser> {
  const user = await getSessionUser()
  if (!user) throw new Error('UNAUTHORIZED')

  let activeRole = user.role
  let activeBranch = user.branch

  try {
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID
    if (
      spreadsheetId &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ) {
      const response = await getSheets().spreadsheets.values.get({
        spreadsheetId,
        range: 'users!A:Z',
      })
      const rows = response.data.values || []
      const headers = rows[0] || []
      const current = rows
        .slice(1)
        .map((row) =>
          Object.fromEntries(
            headers.map((header: string, index: number) => [header, row[index] || ''])
          )
        )
        .find((candidate) => candidate.id === user.id || candidate.username === user.username)

      if (current) {
        if (current.active === 'false' || current.status === 'disabled') {
          throw new Error('UNAUTHORIZED')
        }
        if (current.role) activeRole = current.role
        if (current.branch) activeBranch = current.branch
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') throw error
    // Graceful fallback: If Google Sheets is not configured or user is from central SSO,
    // trust the cryptographically verified signed session token.
  }

  const normRole = (r?: string | null) => {
    const s = String(r || '').toLowerCase()
    return s.includes('admin') || s.includes('owner') || s.includes('super') ? 'admin' : 'petugas'
  }

  const normalizedRole = normRole(activeRole)

  const currentUser: AuthenticatedUser = {
    id: user.id,
    username: user.username,
    display_name:
      normalizedRole === 'admin'
        ? 'Admin'
        : user.display_name || user.branch || user.username,
    role: normalizedRole,
    branch: activeBranch || '',
  }

  if (roles && roles.length > 0) {
    const allowed = roles.map(normRole)
    if (!allowed.includes(normalizedRole)) throw new Error('FORBIDDEN')
  }
  return currentUser
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS
