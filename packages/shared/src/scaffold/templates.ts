/**
 * F5.3 Next.js App Scaffold Templates
 * Boilerplate for new apps
 */

export const SCAFFOLD_FILES = {
  // app/layout.tsx
  layout: `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '[APP_NAME] - MOCHIKIN',
  description: '[APP_DESCRIPTION]',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  );
}
`,

  // app/page.tsx
  page: `export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">[APP_NAME]</h1>
      <p className="text-gray-600">Welcome to [APP_NAME]</p>
    </main>
  );
}
`,

  // middleware.ts - JWT context propagation
  middleware: `import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');

export async function middleware(request: NextRequest) {
  // Skip auth for public endpoints
  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // Extract JWT from Authorization header or session cookie
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Decode JWT (in real app, verify signature)
    const decoded = await jose.jwtVerify(token, SECRET);
    const claims = decoded.payload;

    // Create new headers with JWT claims
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-Person-Id', claims.person_id as string);
    requestHeaders.set('X-Branch-Id', claims.branch_id as string);
    requestHeaders.set('X-Role', claims.role as string);

    // Forward to route handler with headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('JWT verification failed:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    // Protect all /api routes
    '/api/:path*',
    // Protect app routes except public ones
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
`,

  // lib/supabase.ts - Supabase client setup
  supabase: `import { createClient } from '@supabase/supabase-js';
import { validateEnv } from '@mochikin/shared/env';

let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const env = validateEnv();
  supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  return supabaseClient;
}

export function getSupabaseServiceClient() {
  const env = validateEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}
`,

  // lib/auth-guard.ts - Protected route wrapper
  authGuard: `import { NextRequest, NextResponse } from 'next/server';

export interface AuthContext {
  personId: string;
  branchId: string;
  role: string;
  email?: string;
}

export function extractAuthContext(request: NextRequest): AuthContext | null {
  const personId = request.headers.get('X-Person-Id');
  const branchId = request.headers.get('X-Branch-Id');
  const role = request.headers.get('X-Role');
  const email = request.headers.get('X-Email');

  if (!personId || !branchId || !role) {
    console.warn('Missing auth context headers');
    return null;
  }

  return {
    personId,
    branchId,
    role,
    email: email || undefined,
  };
}

export function requireAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const context = extractAuthContext(request);

    if (!context) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing auth context' },
        { status: 401 }
      );
    }

    return handler(request, context);
  };
}

export function requireRole(roles: string[]) {
  return (handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) => {
    return async (request: NextRequest) => {
      const context = extractAuthContext(request);

      if (!context) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (!roles.includes(context.role)) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        );
      }

      return handler(request, context);
    };
  };
}
`,

  // package.json snippet
  packageJson: `{
  "name": "[app-name]",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint src --ext .ts,.tsx",
    "test": "vitest",
    "test:integration": "vitest run --grep integration"
  },
  "dependencies": {
    "@mochikin/shared": "*",
    "@supabase/supabase-js": "^2.38.0",
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "jose": "^4.14.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0",
    "vitest": "^0.34.0",
    "@testing-library/react": "^14.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
`,

  // tsconfig.json
  tsconfig: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noImplicitAny": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
`,

  // .env.example
  envExample: `# Supabase (shared across all apps)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Shared secrets (identical across all apps)
LAUNCHER_SSO_SHARED_SECRET=your_sso_secret_here_min_32_chars
MOCHIKIN_EVENTS_SECRET=your_events_secret_here_min_32_chars

# App-specific (if needed)
# [APP_NAME]_SPECIFIC_VAR=value
`,

  // next.config.js
  nextConfig: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;
`,

  // .gitignore
  gitignore: `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env.local
.env.*.local

# IDE
.vscode
.idea
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`,
};

export default SCAFFOLD_FILES;
