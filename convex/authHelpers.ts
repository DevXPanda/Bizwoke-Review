import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export type NormalizedRole = "SUPER_ADMIN" | "BRANCH_ADMIN" | "BRANCH_USER";

/**
 * Normalizes user roles into explicit enums.
 * Fallbacks are provided for legacy role mappings:
 * - "sadmin" or user.sadmin === 1 -> SUPER_ADMIN
 * - "admin" or user.admin === 1 -> BRANCH_ADMIN
 * - "user" -> BRANCH_USER
 */
export function normalizeRole(
  role: string | undefined,
  sadmin?: number,
  admin?: number
): NormalizedRole {
  if (role === "SUPER_ADMIN" || role === "sadmin" || sadmin === 1) {
    return "SUPER_ADMIN";
  }
  if (role === "BRANCH_ADMIN" || role === "admin" || admin === 1) {
    return "BRANCH_ADMIN";
  }
  return "BRANCH_USER";
}

/**
 * Validates the current authenticated user.
 */
export async function validateUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized: Not logged in");
  }
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("Unauthorized: User not found");
  }
  return user;
}

/**
 * Enforces role membership. Returns normalized user and role.
 */
export async function enforceRoles(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: NormalizedRole[]
) {
  const user = await validateUser(ctx);
  const role = normalizeRole(user.role, user.sadmin, user.admin);
  if (!allowedRoles.includes(role)) {
    throw new Error(`Forbidden: Access denied. Required role: ${allowedRoles.join(" or ")}`);
  }
  return { user, role };
}

/**
 * Enforces write restrictions.
 * BRANCH_USER is strictly read-only and cannot execute any mutations.
 */
export function enforceWriteAccess(user: { role: string; sadmin: number; admin: number }) {
  const role = normalizeRole(user.role, user.sadmin, user.admin);
  if (role === "BRANCH_USER") {
    throw new Error("Forbidden: Branch users are strictly read-only");
  }
}

/**
 * Resolves the branchId to filter queries/mutations.
 * - For SUPER_ADMIN: returns argsBranchId if provided, else undefined (all branches).
 * - For BRANCH_ADMIN / BRANCH_USER: ignores argsBranchId and forces their assigned branchId.
 */
export function getBranchFilterId(
  user: { role: string; sadmin: number; admin: number; branchId?: Id<"branches"> },
  argsBranchId?: Id<"branches">
): Id<"branches"> | undefined {
  const role = normalizeRole(user.role, user.sadmin, user.admin);
  if (role === "SUPER_ADMIN") {
    return argsBranchId;
  }
  // For branch roles, force their assigned branchId.
  // If the user has no branchId (legacy), return undefined to allow legacy user-scoped fallback.
  return user.branchId;
}

/**
 * Checks if the caller has permissions to interact with a specific branchId.
 */
export async function enforceBranchAccess(
  ctx: QueryCtx | MutationCtx,
  branchId: Id<"branches"> | undefined
) {
  const user = await validateUser(ctx);
  const role = normalizeRole(user.role, user.sadmin, user.admin);
  if (role === "SUPER_ADMIN") {
    return;
  }
  if (!user.branchId) {
    if (branchId !== undefined) {
      throw new Error("Forbidden: Cross-branch access denied");
    }
    return;
  }
  if (branchId !== undefined && branchId !== user.branchId) {
    throw new Error("Forbidden: Cross-branch access denied");
  }
}

/**
 * Traverses to the account owner (BRANCH_ADMIN) if user is a sub-user (BRANCH_USER).
 */
export async function getAccountOwner(ctx: QueryCtx | MutationCtx, user: any) {
  if (user.iscmpy === 1 && user.cmpyid) {
    // cmpyid is parent user ID as a string, let's look it up
    try {
      const parentId = user.cmpyid as Id<"users">;
      const parent = await ctx.db.get(parentId);
      if (parent) return parent;
    } catch (e) {
      // fallback
    }
  }
  return user;
}

/**
 * Checks if the account owner has an active subscription or is within their 3-day free trial.
 * Throws a SubscriptionExpired error if not active.
 */
export async function enforceActiveSubscriptionOrTrial(
  ctx: QueryCtx | MutationCtx,
  user: any
) {
  const role = normalizeRole(user.role, user.sadmin, user.admin);
  if (role === "SUPER_ADMIN") {
    return;
  }

  const owner = await getAccountOwner(ctx, user);
  const now = Date.now();
  const hasActiveTrial =
    owner.trialStatus === "active" &&
    owner.trialStartDate !== undefined &&
    owner.trialEndDate !== undefined &&
    now <= owner.trialEndDate;
  const hasActiveSub = owner.sub === 1;

  if (!hasActiveTrial && !hasActiveSub) {
    throw new Error("SubscriptionExpired: Your free trial or subscription has expired. Please upgrade or renew your plan to continue.");
  }
}
