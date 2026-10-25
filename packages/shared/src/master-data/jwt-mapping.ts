import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MasterDataService, getMasterDataService } from '@mochikin/shared/master-data';
import { JWTClaimsSchema, type JWTClaims } from '@mochikin/shared/schemas/master-data';

/**
 * JWT Mapping Service for MyLauncher
 * Maps person email to person_id/branch_id and creates JWT custom claims
 * Used during auth handoff to set user context across all apps
 */

export interface JWTTokenPayload {
  sub: string; // person_id
  person_id: string;
  branch_id: string;
  role: string;
  email: string;
  name?: string;
  iat: number;
  exp: number;
}

export class JWTMappingService {
  private masterDataService: MasterDataService;
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.masterDataService = getMasterDataService(supabaseClient);
  }

  /**
   * Get person record by email and extract JWT claims
   */
  async getJWTClaimsByEmail(email: string): Promise<JWTClaims | null> {
    try {
      // Query people table for this email
      const { data, error } = await this.supabase
        .from('people')
        .select('id, branch_id, role, email, name, status')
        .eq('email', email)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        console.warn(`Person not found or inactive: ${email}`);
        return null;
      }

      // Validate against schema
      const claims = JWTClaimsSchema.parse({
        person_id: data.id,
        branch_id: data.branch_id,
        role: data.role,
        email: data.email,
      });

      return claims;
    } catch (error) {
      console.error('Failed to get JWT claims:', error);
      throw error;
    }
  }

  /**
   * Get person record by ID
   */
  async getPersonById(personId: string) {
    try {
      const person = await this.masterDataService.getPersonById(personId);
      return person;
    } catch (error) {
      console.error('Failed to get person:', error);
      return null;
    }
  }

  /**
   * Validate JWT claims (check person still active, role valid)
   */
  async validateJWTClaims(claims: JWTClaims): Promise<boolean> {
    try {
      const person = await this.getPersonById(claims.person_id);

      if (!person) {
        console.warn(`Person not found: ${claims.person_id}`);
        return false;
      }

      if (person.status !== 'active') {
        console.warn(`Person inactive: ${claims.person_id}`);
        return false;
      }

      if (person.branch_id !== claims.branch_id) {
        console.warn(`Branch mismatch for person: ${claims.person_id}`);
        return false;
      }

      if (person.role !== claims.role) {
        console.warn(`Role mismatch for person: ${claims.person_id}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('JWT validation error:', error);
      return false;
    }
  }

  /**
   * Create JWT token payload with custom claims
   */
  createTokenPayload(claims: JWTClaims, person?: any): JWTTokenPayload {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 24 * 60 * 60; // 24 hours

    return {
      sub: claims.person_id,
      person_id: claims.person_id,
      branch_id: claims.branch_id,
      role: claims.role,
      email: claims.email,
      name: person?.name,
      iat: now,
      exp: now + expiresIn,
    };
  }

  /**
   * Map user login to JWT claims
   * Called from auth endpoint during login
   */
  async mapUserToJWTClaims(email: string): Promise<{ claims: JWTClaims; person: any } | null> {
    try {
      // Get claims from master data
      const claims = await this.getJWTClaimsByEmail(email);
      if (!claims) {
        return null;
      }

      // Get full person record for additional info
      const person = await this.getPersonById(claims.person_id);
      if (!person) {
        return null;
      }

      // Validate
      const isValid = await this.validateJWTClaims(claims);
      if (!isValid) {
        return null;
      }

      return { claims, person };
    } catch (error) {
      console.error('Failed to map user to JWT:', error);
      return null;
    }
  }

  /**
   * Check if person has permission for a specific branch
   */
  async hasPermissionForBranch(personId: string, branchId: string): Promise<boolean> {
    try {
      const person = await this.getPersonById(personId);
      if (!person) return false;

      // Check if person is assigned to this branch
      return person.branch_id === branchId;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Check if person has role permission
   */
  hasRolePermission(role: string, requiredRole: string): boolean {
    // Role hierarchy: super_admin > branch_manager > staff > guest
    const hierarchy: Record<string, number> = {
      super_admin: 4,
      branch_manager: 3,
      staff: 2,
      guest: 1,
    };

    return (hierarchy[role] || 0) >= (hierarchy[requiredRole] || 0);
  }

  /**
   * Get accessible branches for a person
   */
  async getAccessibleBranches(personId: string) {
    try {
      const person = await this.getPersonById(personId);
      if (!person) return [];

      // For now, return just the assigned branch
      // In future, could return multiple branches via branch_members table
      return [person.branch_id];
    } catch (error) {
      console.error('Failed to get accessible branches:', error);
      return [];
    }
  }

  /**
   * Refresh JWT claims (called periodically or on logout-then-login)
   */
  async refreshJWTClaims(personId: string): Promise<JWTClaims | null> {
    try {
      const person = await this.getPersonById(personId);
      if (!person || person.status !== 'active') {
        return null;
      }

      return JWTClaimsSchema.parse({
        person_id: person.id,
        branch_id: person.branch_id,
        role: person.role,
        email: person.email,
      });
    } catch (error) {
      console.error('JWT refresh error:', error);
      return null;
    }
  }
}

/**
 * Singleton instance
 */
let serviceInstance: JWTMappingService | null = null;

export function getJWTMappingService(supabaseClient: SupabaseClient): JWTMappingService {
  if (!serviceInstance) {
    serviceInstance = new JWTMappingService(supabaseClient);
  }
  return serviceInstance;
}
