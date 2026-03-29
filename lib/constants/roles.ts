/**
 * Shared role constants – single source of truth for role checks.
 * Use instead of inline ["admin", "supervisor"] literals.
 */

export const MANAGER_ROLES = ["admin", "supervisor"] as const;
export type ManagerRole = (typeof MANAGER_ROLES)[number];

export function isManagerRole(role: string | null | undefined): boolean {
  return MANAGER_ROLES.includes(role as ManagerRole);
}
