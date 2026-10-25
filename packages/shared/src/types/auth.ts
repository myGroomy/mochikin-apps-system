import { z } from 'zod';

export const JWTCustomClaimsSchema = z.object({
  person_id: z.string(),
  branch_id: z.string(),
  role: z.enum([
    'role_staff',
    'role_captain',
    'role_manager',
    'role_admin',
    'super_admin',
  ]),
  permissions: z.array(z.string()).default([]),
  iat: z.number(),
  exp: z.number(),
});

export type UserRole = 'role_staff' | 'role_captain' | 'role_manager' | 'role_admin' | 'super_admin';

export interface JWTCustomClaims {
  person_id: string;
  branch_id: string;
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;
}

export interface Person {
  person_id: string;
  username: string;
  branch_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  branch_id: string;
  name: string;
  region: string;
  created_at: string;
}
