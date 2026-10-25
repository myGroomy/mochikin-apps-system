"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  KeyRound,
  Shield,
  Layers,
  Settings,
  RefreshCw,
  Rocket,
  HelpCircle,
  Terminal,
  FileSpreadsheet,
} from "lucide-react";

const SECTIONS = [
  { id: "overview", label: "Overview & Vision", icon: BookOpen },
  { id: "setup", label: "Local Setup", icon: Terminal },
  { id: "auth", label: "Auth & RBAC", icon: KeyRound },
  { id: "sso", label: "Cross-Domain SSO", icon: Shield },
  { id: "database", label: "Database (Sheets)", icon: FileSpreadsheet },
  { id: "settings", label: "Feature Settings", icon: Settings },
  { id: "sync", label: "User Sync", icon: RefreshCw },
  { id: "deployment", label: "Deployment & Smoke", icon: Rocket },
  { id: "troubleshooting", label: "Troubleshooting", icon: HelpCircle },
];

export function DocsView() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-accent" />
          MOCHIKIN LAUNCHER Documentation
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          Complete guide for setup, architecture, SSO integration, database schema, and deployment.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-hairline pb-3">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeTab === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveTab(sec.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-surface text-ink-soft hover:bg-secondary hover:text-ink"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {sec.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-ink">Product Overview & Vision</CardTitle>
                <CardDescription>Central Entry Point & Identity Gateway for MOCHIKIN APPS</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-ink-soft leading-relaxed">
                <p>
                  <strong className="text-ink">MOCHIKIN LAUNCHER</strong> serves as the centralized identity gateway for all internal applications in the MOCHIKIN ecosystem. Instead of requiring employees to maintain separate credentials and logins across multiple standalone tools, Launcher provides unified single sign-on (SSO) and role-based access control (RBAC).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                  <div className="p-4 rounded-xl border border-hairline bg-surface space-y-2">
                    <div className="flex items-center gap-2 font-bold text-ink">
                      <Layers className="h-4 w-4 text-accent" />
                      Connected Ecosystem Apps
                    </div>
                    <ul className="space-y-1.5 text-xs">
                      <li>• <strong>STOKIS</strong> — Stock Opname & Inventory (<code>https://stokis-project.vercel.app</code>)</li>
                      <li>• <strong>MYCUSTOMER</strong> — Customer CRM & Retention (<code>https://retain-ly.vercel.app</code>)</li>
                      <li>• <strong>MYSHIFT</strong> — Shift & Schedule (Placeholder, Inactive)</li>
                      <li>• <strong>MYHR</strong> — Employee & HR Management (Placeholder, Inactive)</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-hairline bg-surface space-y-2">
                    <div className="flex items-center gap-2 font-bold text-ink">
                      <Shield className="h-4 w-4 text-emerald" />
                      Core Responsibilities
                    </div>
                    <ul className="space-y-1.5 text-xs">
                      <li>1. Single Account Identity (Username + PIN)</li>
                      <li>2. Authentication & Failed Login Protection</li>
                      <li>3. Role & Permission Authorization</li>
                      <li>4. Application Registry & Deep Linking</li>
                      <li>5. Cross-Domain Signed Token SSO</li>
                      <li>6. Audit Logging & Notification Feed</li>
                    </ul>
                  </div>
                </div>

                <p className="text-xs text-mist">
                  <em>Note: Business logic remains inside each business application (e.g. stock counts stay in STOKIS, customer orders stay in MYCUSTOMER). Launcher only handles identity, authorization, and navigation.</em>
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "setup" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-ink">Local Development & Setup</CardTitle>
                <CardDescription>Step-by-step instructions to run MOCHIKIN LAUNCHER locally</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-ink-soft">
                <div className="space-y-2">
                  <h3 className="font-semibold text-ink">1. Prerequisites</h3>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>Node.js 20 or later</li>
                    <li>npm or pnpm</li>
                    <li>Google Cloud Service Account (for Google Sheets database)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-ink">2. Environment Configuration (<code>.env.local</code>)</h3>
                  <pre className="p-3 rounded-lg bg-sunken text-xs font-mono text-ink overflow-x-auto border border-hairline">
{`# Google Service Account Credentials
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-sa@project.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
REGISTRY_SPREADSHEET_ID="11Hlits3ugvw9LtbeKGnTnO3_rm4erdvM-dqf1vFcuak"

# Session & Security
LAUNCHER_SESSION_SECRET="generate-a-long-random-secret-at-least-32-chars"
LAUNCHER_SSO_SHARED_SECRET="shared-secret-with-stokis-and-mycustomer-32-chars"
SESSION_EXPIRES_IN_SECONDS="3600"
MAX_FAILED_LOGIN_ATTEMPTS="5"
ACCOUNT_LOCK_DURATION_MINUTES="5"`}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-ink">3. Install & Start</h3>
                  <pre className="p-3 rounded-lg bg-sunken text-xs font-mono text-ink overflow-x-auto border border-hairline">
{`npm install
npm run dev`}
                  </pre>
                  <p className="text-xs text-ink-soft">
                    Open <code>http://localhost:3000</code> in your browser. First login automatically seeds demo users (<code>admin</code>, <code>crew</code>, <code>viewer</code> with PIN <code>1234</code>) and default roles.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "auth" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-ink">Authentication & Role-Based Access Control</CardTitle>
                <CardDescription>User identification, PIN hashing, and permission policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-ink-soft">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-hairline bg-surface space-y-2">
                    <h4 className="font-semibold text-ink text-xs uppercase tracking-wider">Authentication Rules</h4>
                    <ul className="text-xs space-y-1 text-ink-soft">
                      <li>• Login uses <strong>Username + PIN</strong> (4–8 digits).</li>
                      <li>• Internal stable identity remains <code>employee_id</code> (e.g. <code>emp_001</code>).</li>
                      <li>• PINs are hashed with <code>scryptSync</code> + 16-byte random salt.</li>
                      <li>• 5 failed attempts trigger a 5-minute account lock.</li>
                      <li>• Sessions expire in 1 hour (configurable).</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border border-hairline bg-surface space-y-2">
                    <h4 className="font-semibold text-ink text-xs uppercase tracking-wider">Default Roles & Permissions</h4>
                    <ul className="text-xs space-y-1 text-ink-soft">
                      <li>• <strong>Admin</strong> (<code>role_admin</code>): Full access + admin panel</li>
                      <li>• <strong>User</strong> (<code>role_user</code>): Access to STOKIS & MYCUSTOMER</li>
                      <li>• <strong>Viewer</strong> (<code>role_viewer</code>): Access to STOKIS (read-only)</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-ink">Demo Accounts (PIN: <code>1234</code>)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-hairline text-ink">
                          <th className="py-2">Username</th>
                          <th className="py-2">Employee ID</th>
                          <th className="py-2">Role</th>
                          <th className="py-2">Accessible Apps</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        <tr>
                          <td className="py-2 font-mono font-bold text-ink">admin</td>
                          <td className="py-2 font-mono">emp_001</td>
                          <td className="py-2"><Badge variant="default">Admin</Badge></td>
                          <td className="py-2">STOKIS, MYCUSTOMER</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-mono font-bold text-ink">crew</td>
                          <td className="py-2 font-mono">emp_002</td>
                          <td className="py-2"><Badge variant="secondary">User</Badge></td>
                          <td className="py-2">STOKIS, MYCUSTOMER</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-mono font-bold text-ink">viewer</td>
                          <td className="py-2 font-mono">emp_003</td>
                          <td className="py-2"><Badge variant="outline">Viewer</Badge></td>
                          <td className="py-2">STOKIS</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "sso" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-ink">Cross-Domain Single Sign-On (SSO)</CardTitle>
                <CardDescription>Signed handoff token flow for separate Vercel deployments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-ink-soft">
                <p>
                  Because Launcher (<code>mylauncher-two.vercel.app</code>), STOKIS (<code>stokis-project.vercel.app</code>), and MYCUSTOMER (<code>retain-ly.vercel.app</code>) reside on distinct Vercel hostnames, browser cookies cannot be shared directly. SSO is achieved via a <strong>short-lived signed token handoff flow</strong>.
                </p>

                <div className="p-4 rounded-xl border border-hairline bg-sunken space-y-3">
                  <h4 className="font-bold text-ink text-xs uppercase tracking-wider">Handoff Architecture Flow</h4>
                  <ol className="list-decimal list-inside text-xs space-y-2 font-mono text-ink-soft">
                    <li>User signs in to Launcher → Launcher creates <code>mochikin_launcher_session</code> httpOnly cookie.</li>
                    <li>User clicks app card → Navigation hits <code>GET /api/auth/handoff?appId=STOKIS&amp;returnPath=/</code>.</li>
                    <li>Launcher checks permission &amp; issues signed JWT-like token (60-second TTL) using <code>LAUNCHER_SSO_SHARED_SECRET</code>.</li>
                    <li>Launcher redirects to <code>https://stokis-project.vercel.app/api/auth/sso/callback?token=...</code>.</li>
                    <li>STOKIS verifies HMAC signature with the same <code>LAUNCHER_SSO_SHARED_SECRET</code>.</li>
                    <li>STOKIS creates its local httpOnly session cookie (<code>stokis_session</code>) and redirects user to target page.</li>
                  </ol>
                </div>

                <div className="p-3 rounded-lg border border-hairline bg-surface space-y-2">
                  <h4 className="font-semibold text-ink text-xs">Shared Secrets Configuration</h4>
                  <p className="text-xs">
                    All three Vercel projects (<code>mylauncher</code>, <code>stokis-project</code>, <code>retain-ly</code>) must have the exact same <code>LAUNCHER_SSO_SHARED_SECRET</code> environment variable configured in Production and Preview.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "database" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-ink">Database & Storage Architecture</CardTitle>
                <CardDescription>Google Sheets multi-tab persistence with server-side caching</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-ink-soft">
                <p>
                  Launcher uses a single Google Spreadsheet (ID configured in <code>REGISTRY_SPREADSHEET_ID</code>) as its primary server database. Browser <code>localStorage</code> is used exclusively for non-sensitive Zustand UI mirrors.
                </p>

                <div className="space-y-2">
                  <h4 className="font-semibold text-ink text-xs uppercase tracking-wider">Spreadsheet Schema Tabs</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg border border-hairline bg-surface">
                      <p className="font-bold text-ink">Employees</p>
                      <p className="text-mist text-[11px]">id, username, name, role_id, status, pin_hash, branch</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-hairline bg-surface">
                      <p className="font-bold text-ink">Roles</p>
                      <p className="text-mist text-[11px]">role_id, name, permissions</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-hairline bg-surface">
                      <p className="font-bold text-ink">Permissions</p>
                      <p className="text-mist text-[11px]">permission_id, key, description</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-hairline bg-surface">
                      <p className="font-bold text-ink">Apps</p>
                      <p className="text-mist text-[11px]">app_id, name, url, icon, status, permission</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-hairline bg-surface">
                      <p className="font-bold text-ink">Sessions</p>
                      <p className="text-mist text-[11px]">session_id, employee_id, role_id, issued_at, expires_at, revoked_at</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-hairline bg-surface">
                      <p className="font-bold text-ink">AuditLogs</p>
                      <p className="text-mist text-[11px]">id, created_at, actor, action, target, details</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-hairline bg-surface">
                      <p className="font-bold text-ink">Announcements</p>
                      <p className="text-mist text-[11px]">id, title, body, severity, status, audience, expires_at</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-hairline bg-surface">
                      <p className="font-bold text-ink">Notifications</p>
                      <p className="text-mist text-[11px]">notification_id, employee_id, title, body, type, read_at</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-hairline bg-surface">
                      <p className="font-bold text-ink">Settings</p>
                      <p className="text-mist text-[11px]">key, enabled, updated_at, updated_by</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-hairline bg-surface space-y-2">
                  <h4 className="font-semibold text-ink text-xs">Performance & Quota Protections</h4>
                  <ul className="text-xs space-y-1 text-ink-soft">
                    <li>• <strong>10-Second Server Cache</strong>: Reads are cached in memory to stay within Google Sheets rate limits.</li>
                    <li>• <strong>In-Flight Request Coalescing</strong>: Concurrent reads for the same sheet share a single Google API request.</li>
                    <li>• <strong>Write Invalidation & Versioning</strong>: Any mutation invalidates the cache for that tab immediately.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-ink">Global Feature Visibility Settings</CardTitle>
                <CardDescription>Customizing UI features via Admin Panel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-ink-soft">
                <p>
                  Admins can toggle the global visibility of optional UI components via <code>/admin/settings</code> without disabling backend security or API routes.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-hairline bg-surface space-y-1">
                    <p className="font-bold text-ink">Launcher UI Features</p>
                    <p className="text-mist">Global Search, Notifications Bell, Work Context, Announcement Banners, Favorites Panel, Recent Apps, System Status, Recent Activity</p>
                  </div>
                  <div className="p-3 rounded-lg border border-hairline bg-surface space-y-1">
                    <p className="font-bold text-ink">Admin Nav Items</p>
                    <p className="text-mist">Roles Admin, Permissions Admin, Applications Admin, Announcements Admin, Sessions Admin, Audit Log Admin</p>
                  </div>
                </div>

                <p className="text-xs text-mist">
                  Settings are stored in the <code>Settings</code> sheet tab and apply globally across all logged-in users.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "sync" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-ink">User Synchronization Script</CardTitle>
                <CardDescription>Syncing users from STOKIS Users sheet into Launcher Employees</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-ink-soft">
                <p>
                  Launcher includes an automated synchronization script to import or update users from STOKIS into Launcher&apos;s <code>Employees</code> table:
                </p>

                <pre className="p-3 rounded-lg bg-sunken text-xs font-mono text-ink overflow-x-auto border border-hairline">
npm run sync:stokis-users
                </pre>

                <div className="space-y-2 text-xs">
                  <p><strong>Key behaviors:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-ink-soft">
                    <li>• Reads <code>Users</code> tab from STOKIS spreadsheet.</li>
                    <li>• Hashes PINs into Launcher <code>Employees</code> tab (never stores plaintext).</li>
                    <li>• Maps STOKIS roles (<code>admin</code> → <code>role_admin</code>, <code>petugas</code> → <code>role_user</code>).</li>
                    <li>• Automatically migrates schema to add <code>username</code> column if missing.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "deployment" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-ink">Deployment & Smoke Verification</CardTitle>
                <CardDescription>Deploying to Vercel and running production checks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-ink-soft">
                <div className="space-y-2">
                  <h3 className="font-semibold text-ink">Production URL</h3>
                  <p className="text-xs font-mono text-accent">https://mylauncher-two.vercel.app</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-ink">Verification Commands</h3>
                  <pre className="p-3 rounded-lg bg-sunken text-xs font-mono text-ink overflow-x-auto border border-hairline">
{`# 1. Full lint, typecheck, and build verification
npm run verify

# 2. Production API & SSO smoke test (9/9 checks)
LAUNCHER_SMOKE_URL=https://mylauncher-two.vercel.app \\
LAUNCHER_SMOKE_USERNAME=admin \\
LAUNCHER_SMOKE_PIN=1234 \\
npm run smoke:prod`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "troubleshooting" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-ink">Troubleshooting & FAQ</CardTitle>
                <CardDescription>Common issues and solutions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-ink-soft">
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg border border-hairline bg-surface space-y-1">
                    <p className="font-bold text-rose">Q: 401 Unauthorized when launching STOKIS or MYCUSTOMER?</p>
                    <p className="text-ink-soft">
                      Ensure <code>LAUNCHER_SSO_SHARED_SECRET</code> is configured identically (min 32 chars) across all three Vercel projects (<code>mylauncher</code>, <code>stokis-project</code>, <code>retain-ly</code>).
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-hairline bg-surface space-y-1">
                    <p className="font-bold text-amber">Q: Google Sheets API 429 Rate Limit?</p>
                    <p className="text-ink-soft">
                      The 10-second server cache automatically throttles requests. Avoid running rapid manual automated loops against the Google Sheets API.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-hairline bg-surface space-y-1">
                    <p className="font-bold text-ink">Q: Account locked after 5 failed login attempts?</p>
                    <p className="text-ink-soft">
                      The account is locked for 5 minutes. An admin can unlock or reset the PIN from <code>/admin/employees</code>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
