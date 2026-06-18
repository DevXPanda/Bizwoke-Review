import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import bcrypt from "bcryptjs";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { validateUser, enforceRoles, enforceWriteAccess, getBranchFilterId, enforceBranchAccess, normalizeRole, enforceActiveSubscriptionOrTrial, getAccountOwner } from "./authHelpers";
import { Id } from "./_generated/dataModel";

// Helper to sanitize name prefix for formKey
function sanitizeUname(uname: string) {
  return uname.replace(/[\s.,?&]/g, "_").toLowerCase().substring(0, 5);
}

// Helper to enforce branch user limits based on pricing packages
async function checkBranchUserLimit(
  ctx: any,
  branchId: Id<"branches">,
  userIdToExempt?: Id<"users">,
  willBeActive: boolean = true
) {
  const branch = await ctx.db.get(branchId);
  if (!branch || branch.deleted) {
    return;
  }

  let pricingPackage = null;
  let owner: any = null;

  if (branch.pricingPackageId) {
    pricingPackage = await ctx.db.get(branch.pricingPackageId);
  } else {
    // Check if there is an owner assigned to this branch
    const branchUsers = await ctx.db
      .query("users")
      .withIndex("by_branchId", (q: any) => q.eq("branchId", branchId))
      .collect();
    owner = branchUsers.find((u: any) => normalizeRole(u.role, u.sadmin, u.admin) === "BRANCH_ADMIN");
    if (owner && owner.pricingPackageId) {
      pricingPackage = await ctx.db.get(owner.pricingPackageId);
    }
  }

  if (!pricingPackage || pricingPackage.status !== "active") {
    return; // No active package, no limit enforced
  }

  const maxUsers = pricingPackage.maxUsers;

  // Let's count active users under this company owner (or in this branch if no owner)
  let activeUsersCount = 0;

  if (owner) {
    const ownerIdStr = owner._id.toString();
    const allUsers = await ctx.db.query("users").collect();
    const activeCompanyUsers = allUsers.filter((u: any) => {
      if (u.active !== 1) return false;
      if (u._id === userIdToExempt) return false;
      const isOwner = u._id === owner._id;
      const isChildOfOwner = u.cmpyid === ownerIdStr;
      return isOwner || isChildOfOwner;
    });
    activeUsersCount = activeCompanyUsers.length;
  } else {
    // Fallback: count active users assigned to this branch
    const users = await ctx.db
      .query("users")
      .withIndex("by_branchId", (q: any) => q.eq("branchId", branchId))
      .collect();
    activeUsersCount = users.filter((u: any) => u.active === 1 && u._id !== userIdToExempt).length;
  }

  const newActiveCount = willBeActive ? activeUsersCount + 1 : activeUsersCount;

  if (newActiveCount > maxUsers) {
    throw new Error(
      `UserLimitExceeded: Subscribed plan "${pricingPackage.packageName}" allows a maximum of ${maxUsers} active user(s).`
    );
  }
}

// Queries
export const checkDuplicateUsername = query({
  args: { uname: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_uname", (q) => q.eq("uname", args.uname))
      .unique();
    return user ? 1 : 0;
  },
});

export const checkDuplicateCompany = query({
  args: { cmpy: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("cmpy"), args.cmpy))
      .first();
    return user ? 1 : 0;
  },
});

export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    const callerRole = normalizeRole(caller.role, caller.sadmin, caller.admin);
    if (callerRole !== "SUPER_ADMIN" && caller._id !== args.userId) {
      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser || targetUser.branchId !== caller.branchId) {
        throw new Error("Forbidden: Cross-branch access denied");
      }
    }
    return await ctx.db.get(args.userId);
  },
});

export const getAllUsers = query({
  args: { currentUserId: v.id("users") },
  handler: async (ctx, args) => {
    const { user, role } = await enforceRoles(ctx, ["SUPER_ADMIN", "BRANCH_ADMIN"]);
    if (role === "SUPER_ADMIN") {
      return await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("sadmin"), 0))
        .collect();
    } else {
      if (!user.branchId) return [];
      return await ctx.db
        .query("users")
        .withIndex("by_branchId", (q) => q.eq("branchId", user.branchId))
        .collect();
    }
  },
});

export const getCompanyUsers = query({
  args: { adminId: v.id("users") },
  handler: async (ctx, args) => {
    const { user: caller, role: callerRole } = await enforceRoles(ctx, ["SUPER_ADMIN", "BRANCH_ADMIN"]);
    const adminUser = await ctx.db.get(args.adminId);
    if (!adminUser) throw new Error("Admin not found");
    if (callerRole === "BRANCH_ADMIN" && adminUser.branchId !== caller.branchId) {
      throw new Error("Forbidden: Cross-branch access denied");
    }
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("cmpyid"), args.adminId.toString()))
      .filter((q) => q.eq(q.field("admin"), 0))
      .collect();
  },
});

// Mutations
export const register = mutation({
  args: {
    uname: v.string(),
    fname: v.string(),
    lname: v.string(),
    email: v.string(),
    mobile: v.string(),
    pwd: v.string(),
    cmpy: v.optional(v.string()),
    isCompanyAdmin: v.boolean(),
    planId: v.optional(v.id("plans")),
    smsQuota: v.number(),
    emailQuota: v.number(),
    whatsappQuota: v.number(),
    webQuota: v.number(),
    amount: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    // Check duplicates
    const dupUname = await ctx.db
      .query("users")
      .withIndex("by_uname", (q) => q.eq("uname", args.uname))
      .first();
    if (dupUname) throw new Error("This username is taken");

    if (args.cmpy) {
      const dupCmpy = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("cmpy"), args.cmpy))
        .first();
      if (dupCmpy) throw new Error("This Company already exists");
    }

    if (args.branchId) {
      await checkBranchUserLimit(ctx, args.branchId);
    }

    const unameForm = sanitizeUname(args.uname);
    const formKey = unameForm + Math.floor(Math.random() * 100000);
    const actKey = Math.floor(Math.random() * 1000000).toString();
    const actKeyHash = bcrypt.hashSync(actKey, 10);
    const passwordHash = bcrypt.hashSync(args.pwd, 10);

    const role = args.isCompanyAdmin ? "BRANCH_ADMIN" : "BRANCH_USER";
    const sub = 0; // Inactive subscription by default

    // Insert user
    const userId = await ctx.db.insert("users", {
      role,
      sadmin: 0,
      admin: args.isCompanyAdmin ? 1 : 0,
      iscmpy: args.cmpy ? 1 : 0,
      cmpy: args.cmpy,
      uname: args.uname,
      fname: args.fname,
      lname: args.lname,
      email: args.email,
      mobile: args.mobile,
      active: 0, // Unverified
      websiteForm: 0,
      sub,
      actKey: actKeyHash,
      formKey,
      frameId: "",
      password: passwordHash,
      latestActivity: new Date().toUTCString(),
      branchId: args.branchId,
    });

    // Create quota record
    await ctx.db.insert("quota", {
      byUserId: userId,
      smsQuota: args.smsQuota,
      emailQuota: args.emailQuota,
      whatsappQuota: args.whatsappQuota,
      webQuota: args.webQuota,
      byFormKey: formKey,
      planId: undefined, // Will be set after payment
      amount: args.amount,
      balance: args.amount, // Due balance
      branchId: args.branchId,
    });

    // Create company details if admin
    if (args.isCompanyAdmin && args.cmpy) {
      await ctx.db.insert("companyDetails", {
        userId,
        cmpyName: args.cmpy,
        cmpyMobile: "",
        cmpyEmail: "",
        cmpyLogo: "",
        branchId: args.branchId,
      });
    }

    // Log action
    await ctx.db.insert("activity", {
      userId,
      actionType: "REGISTER",
      msg: `New user registration [ Username: ${args.uname}, Email: ${args.email} ]`,
      actTime: new Date().toUTCString(),
      branchId: args.branchId,
    });

    // Schedule verification email dispatch
    await ctx.scheduler.runAfter(0, internal.email.sendVerificationEmail, {
      email: args.email,
      code: actKey,
    });

    return { userId, formKey, actKey };
  },
});

export const emailVerify = mutation({
  args: { formKey: v.string(), sentCode: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_formKey", (q) => q.eq("formKey", args.formKey))
      .unique();
    if (!user) throw new Error("Wrong credentials");

    if (user.active === 1) return { success: true, alreadyActive: true };

    const isValid = bcrypt.compareSync(args.sentCode, user.actKey);
    if (!isValid) {
      await ctx.db.insert("activity", {
        userId: user._id,
        actionType: "VERIFY_FAILED",
        msg: `Invalid verification code provided [ Username: ${user.uname} ]`,
        actTime: new Date().toUTCString(),
      });
      throw new Error("Invalid code");
    }

    // Update active status
    if (user.branchId) {
      await checkBranchUserLimit(ctx, user.branchId, user._id, true);
    }
    await ctx.db.patch(user._id, { active: 1 });

    await ctx.db.insert("activity", {
      userId: user._id,
      actionType: "VERIFY_SUCCESS",
      msg: `Account verified [ Username: ${user.uname} ]`,
      actTime: new Date().toUTCString(),
    });

    return { success: true };
  },
});

export const loginUser = mutation({
  args: { uname: v.string(), pwd: v.string() },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_uname", (q) => q.eq("uname", args.uname))
      .unique();

    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.uname))
        .unique();
    }

    if (!user) return { status: "wrong_credentials" };
    if (user.active === 0) return { status: "unverified", formKey: user.formKey };
    if (user.active === 2) return { status: "deactivated" };

    let hash = user.password;
    if (!hash) {
      const account = await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id).eq("provider", "password"))
        .first();
      if (account) {
        hash = account.secret;
      }
    }

    if (!hash) {
      return { status: "wrong_credentials" };
    }

    const isValid = bcrypt.compareSync(args.pwd, hash);
    if (!isValid) {
      await ctx.db.insert("activity", {
        userId: user._id,
        actionType: "LOGIN_FAILED",
        msg: `Failed Login Attempt - Wrong Credentials [ Username: ${args.uname} ]`,
        actTime: new Date().toUTCString(),
      });
      return { status: "wrong_credentials" };
    }

    // Update activity
    await ctx.db.patch(user._id, {
      latestActivity: new Date().toUTCString(),
    });

    await ctx.db.insert("activity", {
      userId: user._id,
      actionType: "LOGIN_SUCCESS",
      msg: `Logged In [ Username: ${user.uname} ]`,
      actTime: new Date().toUTCString(),
    });

    return { status: "success", user };
  },
});

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    fname: v.string(),
    lname: v.string(),
    email: v.string(),
    mobile: v.string(),
    gender: v.string(),
    dob: v.string(),
  },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    enforceWriteAccess(caller);
    const callerRole = normalizeRole(caller.role, caller.sadmin, caller.admin);
    if (callerRole !== "SUPER_ADMIN" && caller._id !== args.userId) {
      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser || targetUser.branchId !== caller.branchId || callerRole !== "BRANCH_ADMIN") {
        throw new Error("Forbidden: Cross-branch access denied");
      }
    }
    await ctx.db.patch(args.userId, {
      fname: args.fname,
      lname: args.lname,
      email: args.email,
      mobile: args.mobile,
      gender: args.gender,
      dob: args.dob,
    });
    return true;
  },
});

export const updatePassword = mutation({
  args: { userId: v.id("users"), currentPwd: v.string(), newPwd: v.string() },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    enforceWriteAccess(caller);
    const callerRole = normalizeRole(caller.role, caller.sadmin, caller.admin);
    if (callerRole !== "SUPER_ADMIN" && caller._id !== args.userId) {
      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser || targetUser.branchId !== caller.branchId || callerRole !== "BRANCH_ADMIN") {
        throw new Error("Forbidden: Cross-branch access denied");
      }
    }
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const isValid = bcrypt.compareSync(args.currentPwd, user.password || "");
    if (!isValid) return false;

    const hash = bcrypt.hashSync(args.newPwd, 10);
    await ctx.db.patch(args.userId, { password: hash });
    return true;
  },
});

export const resetPasswordVcode = mutation({
  args: { userId: v.id("users"), email: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.email !== args.email) return false;

    const hash = bcrypt.hashSync(args.code, 10);
    await ctx.db.patch(args.userId, { actKey: hash });
    return true;
  },
});

export const verifyVcode = query({
  args: { userId: v.id("users"), code: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return false;
    return bcrypt.compareSync(args.code, user.actKey);
  },
});

export const changePassword = mutation({
  args: { userId: v.id("users"), newPwd: v.string() },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    enforceWriteAccess(caller);
    const callerRole = normalizeRole(caller.role, caller.sadmin, caller.admin);
    if (callerRole !== "SUPER_ADMIN" && caller._id !== args.userId) {
      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser || targetUser.branchId !== caller.branchId || callerRole !== "BRANCH_ADMIN") {
        throw new Error("Forbidden: Cross-branch access denied");
      }
    }
    const hash = bcrypt.hashSync(args.newPwd, 10);
    await ctx.db.patch(args.userId, { password: hash });
    return true;
  },
});

export const deactivateAccount = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    enforceWriteAccess(caller);
    const callerRole = normalizeRole(caller.role, caller.sadmin, caller.admin);
    if (callerRole !== "SUPER_ADMIN" && caller._id !== args.userId) {
      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser || targetUser.branchId !== caller.branchId || callerRole !== "BRANCH_ADMIN") {
        throw new Error("Forbidden: Cross-branch access denied");
      }
    }
    await ctx.db.patch(args.userId, { active: 2 });
    return true;
  },
});

export const activateAccount = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    enforceWriteAccess(caller);
    const callerRole = normalizeRole(caller.role, caller.sadmin, caller.admin);
    if (callerRole !== "SUPER_ADMIN" && caller._id !== args.userId) {
      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser || targetUser.branchId !== caller.branchId || callerRole !== "BRANCH_ADMIN") {
        throw new Error("Forbidden: Cross-branch access denied");
      }
    }
    const userToActivate = await ctx.db.get(args.userId);
    if (userToActivate && userToActivate.branchId) {
      await checkBranchUserLimit(ctx, userToActivate.branchId, args.userId, true);
    }
    await ctx.db.patch(args.userId, { active: 1 });
    return true;
  },
});

export const migrateLegacyUser = mutation({
  args: { unameOrEmail: v.string(), pwd: v.string() },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_uname", (q) => q.eq("uname", args.unameOrEmail))
      .unique();
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.unameOrEmail))
        .unique();
    }
    if (!user) return { success: false, reason: "not_found" };

    const isValid = bcrypt.compareSync(args.pwd, user.password || "");
    if (!isValid) return { success: false, reason: "wrong_password" };

    // Check if authAccounts record already exists
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id).eq("provider", "password"))
      .first();

    if (!account) {
      await ctx.db.insert("authAccounts", {
        userId: user._id,
        provider: "password",
        providerAccountId: user.email,
        secret: user.password,
      });
    }

    return { success: true, email: user.email };
  },
});

export const resolveEmail = query({
  args: { unameOrEmail: v.string() },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_uname", (q) => q.eq("uname", args.unameOrEmail))
      .unique();
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.unameOrEmail))
        .unique();
    }
    return user ? user.email : null;
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const getUserByFormKey = query({
  args: { formKey: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_formKey", (q) => q.eq("formKey", args.formKey))
      .unique();
    if (user && user.branchId) {
      const branch = await ctx.db.get(user.branchId);
      if (branch?.deleted) {
        return null;
      }
    }
    return user;
  },
});

export const resendVerificationCode = mutation({
  args: { formKey: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_formKey", (q) => q.eq("formKey", args.formKey))
      .unique();
    if (!user) throw new Error("User not found");
    if (user.active === 1) return { alreadyActive: true };

    const actKey = Math.floor(Math.random() * 1000000).toString();
    const actKeyHash = bcrypt.hashSync(actKey, 10);

    await ctx.db.patch(user._id, { actKey: actKeyHash });

    await ctx.db.insert("activity", {
      userId: user._id,
      actionType: "RESEND_VERIFY",
      msg: `Verification code resent [ Username: ${user.uname}, Email: ${user.email}, Code: ${actKey} ]`,
      actTime: new Date().toUTCString(),
    });

    // Schedule verification email dispatch
    await ctx.scheduler.runAfter(0, internal.email.sendVerificationEmail, {
      email: user.email,
      code: actKey,
    });

    return { success: true, code: actKey };
  },
});

export const resetTestUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_uname", (q) => q.eq("uname", "map1"))
      .first();
    if (!user) return "user_not_found";

    const hash = bcrypt.hashSync("123456", 10);

    // Update user password and activate
    await ctx.db.patch(user._id, {
      password: hash,
      active: 1, // Activated
      websiteForm: 1, // Set websiteForm to 1 so they go straight to dashboard
      sub: 1, // Active subscription
    });

    // Update quota balance to 0 for active subscription
    const quota = await ctx.db
      .query("quota")
      .withIndex("by_userId", (q) => q.eq("byUserId", user._id))
      .first();
    if (quota) {
      await ctx.db.patch(quota._id, {
        balance: 0,
      });
    }

    // Update or insert authAccounts
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id).eq("provider", "password"))
      .first();

    if (account) {
      await ctx.db.patch(account._id, {
        secret: hash,
        providerAccountId: user.email,
      });
    } else {
      await ctx.db.insert("authAccounts", {
        userId: user._id,
        provider: "password",
        providerAccountId: user.email,
        secret: hash,
      });
    }

    return { success: true, email: user.email, uname: user.uname };
  }
});

// Admin compiler query for user details (7 tabs)
export const getAdminUserDetail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user: caller, role: callerRole } = await enforceRoles(ctx, ["SUPER_ADMIN", "BRANCH_ADMIN"]);
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) return null;

    if (callerRole === "BRANCH_ADMIN" && targetUser.branchId !== caller.branchId) {
      throw new Error("Forbidden: Cross-branch access denied");
    }

    const company = await ctx.db
      .query("companyDetails")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const subUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("cmpyid"), args.userId.toString()))
      .collect();

    const quota = await ctx.db
      .query("quota")
      .withIndex("by_userId", (q) => q.eq("byUserId", args.userId))
      .first();

    const platforms = await ctx.db
      .query("websites")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const feedbacks = await ctx.db
      .query("ratings")
      .withIndex("by_formKey", (q) => q.eq("formKey", targetUser.formKey))
      .collect();

    const sentLinks = await ctx.db
      .query("sentLinks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      profile: targetUser,
      company,
      subUsers,
      quota,
      platforms,
      feedbacks,
      sentLinks,
    };
  },
});

// Admin mutation to update user quotas
export const updateUserQuotaAdmin = mutation({
  args: {
    userId: v.id("users"),
    smsQuota: v.number(),
    emailQuota: v.number(),
    whatsappQuota: v.number(),
    webQuota: v.number(),
    amount: v.optional(v.number()),
    balance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user: caller } = await enforceRoles(ctx, ["SUPER_ADMIN"]);
    enforceWriteAccess(caller);

    const quota = await ctx.db
      .query("quota")
      .withIndex("by_userId", (q) => q.eq("byUserId", args.userId))
      .first();

    const targetUser = await ctx.db.get(args.userId);
    const branchId = targetUser?.branchId;

    if (!quota) {
      await ctx.db.insert("quota", {
        byUserId: args.userId,
        smsQuota: args.smsQuota,
        emailQuota: args.emailQuota,
        whatsappQuota: args.whatsappQuota,
        webQuota: args.webQuota,
        byFormKey: targetUser?.formKey || "",
        amount: args.amount,
        balance: args.balance,
        branchId,
      });
    } else {
      await ctx.db.patch(quota._id, {
        smsQuota: args.smsQuota,
        emailQuota: args.emailQuota,
        whatsappQuota: args.whatsappQuota,
        webQuota: args.webQuota,
        amount: args.amount,
        balance: args.balance,
        branchId,
      });
    }
    return true;
  },
});

// Admin mutation to toggle subscription and verification state
export const updateUserSubscriptionAdmin = mutation({
  args: {
    userId: v.id("users"),
    sub: v.number(),
    active: v.number(),
    role: v.string(),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const { user: caller, role: callerRole } = await enforceRoles(ctx, ["SUPER_ADMIN", "BRANCH_ADMIN"]);
    enforceWriteAccess(caller);
    await enforceActiveSubscriptionOrTrial(ctx, caller);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User not found");

    const targetBranchId = args.branchId !== undefined ? args.branchId : targetUser.branchId;
    if (targetBranchId) {
      await checkBranchUserLimit(ctx, targetBranchId, args.userId, args.active === 1);
    }

    if (callerRole === "BRANCH_ADMIN") {
      if (targetUser.branchId !== caller.branchId) {
        throw new Error("Forbidden: Cross-branch access denied");
      }
      if (args.branchId && args.branchId !== caller.branchId) {
        throw new Error("Forbidden: Cannot assign user to a different branch");
      }
      if (args.role !== "BRANCH_USER") {
        throw new Error("Forbidden: Branch Admin can only manage Branch Users");
      }
    }

    const updates: any = {
      sub: args.sub,
      active: args.active,
      role: args.role,
    };

    if (args.branchId !== undefined) {
      updates.branchId = args.branchId;
      const qRecord = await ctx.db
        .query("quota")
        .withIndex("by_userId", (q) => q.eq("byUserId", args.userId))
        .first();
      if (qRecord) {
        await ctx.db.patch(qRecord._id, { branchId: args.branchId });
      }
      const cmpyDetails = await ctx.db
        .query("companyDetails")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .first();
      if (cmpyDetails) {
        await ctx.db.patch(cmpyDetails._id, { branchId: args.branchId });
      }
    }

    // Audit Logging
    const logMsgs = [];
    if (targetUser.active !== args.active) {
      logMsgs.push(`Status Changed to ${args.active === 1 ? "Active" : args.active === 2 ? "Suspended" : "Unverified"}`);
    }
    if (targetUser.role !== args.role) {
      logMsgs.push(`Role Changed to ${args.role}`);
    }
    if (targetUser.branchId !== args.branchId) {
      logMsgs.push(`Branch Changed`);
    }

    if (logMsgs.length > 0) {
      await ctx.db.insert("activity", {
        userId: caller._id,
        actionType: "USER_UPDATE",
        msg: `Updated user [ Username: ${targetUser.uname} ] Details: ${logMsgs.join(", ")}`,
        actTime: new Date().toUTCString(),
        branchId: caller.branchId,
      });
    }

    return true;
  },
});

export const runDatabaseAudit = query({
  args: {},
  handler: async (ctx) => {
    // 1. Fetch all users
    const allUsers = await ctx.db.query("users").collect();
    const userMap = new Map(allUsers.map(u => [u._id, u]));
    const formKeyMap = new Map(allUsers.map(u => [u.formKey, u]));

    // 2. Fetch all other collections
    const companyDetails = await ctx.db.query("companyDetails").collect();
    const ratings = await ctx.db.query("ratings").collect();
    const sentLinks = await ctx.db.query("sentLinks").collect();
    const transactions = await ctx.db.query("transactions").collect();
    const quota = await ctx.db.query("quota").collect();
    const activity = await ctx.db.query("activity").collect();
    const websites = await ctx.db.query("websites").collect();

    // Results container
    const auditResults: Record<string, { passed: boolean; scanned: number; errors: string[] }> = {
      noOrphanRecords: { passed: true, scanned: 0, errors: [] },
      userIdReferences: { passed: true, scanned: 0, errors: [] },
      formKeyReferences: { passed: true, scanned: 0, errors: [] },
      frameIdReferences: { passed: true, scanned: 0, errors: [] },
      quotaLinkedToUsers: { passed: true, scanned: 0, errors: [] },
      transactionsLinkedToUsers: { passed: true, scanned: 0, errors: [] },
      noDuplicateFormKeys: { passed: true, scanned: 0, errors: [] },
      noDuplicateUsernamesOrEmails: { passed: true, scanned: 0, errors: [] },
    };

    // Helper to log errors
    const addError = (check: string, error: string) => {
      auditResults[check].errors.push(error);
      auditResults[check].passed = false;
    };

    // --- Check 7: No duplicate formKey values exist ---
    auditResults.noDuplicateFormKeys.scanned = allUsers.length;
    const formKeysSeen = new Set<string>();
    for (const u of allUsers) {
      if (!u.formKey) {
        addError("noDuplicateFormKeys", `User ${u.uname} (${u._id}) has an empty/missing formKey.`);
      } else if (formKeysSeen.has(u.formKey)) {
        addError("noDuplicateFormKeys", `Duplicate formKey "${u.formKey}" found for user ${u.uname} (${u._id}).`);
      } else {
        formKeysSeen.add(u.formKey);
      }
    }

    // --- Check 8: No duplicate usernames or emails exist ---
    auditResults.noDuplicateUsernamesOrEmails.scanned = allUsers.length;
    const unamesSeen = new Set<string>();
    const emailsSeen = new Set<string>();
    for (const u of allUsers) {
      if (unamesSeen.has(u.uname.toLowerCase())) {
        addError("noDuplicateUsernamesOrEmails", `Duplicate username "${u.uname}" found for user (${u._id}).`);
      } else {
        unamesSeen.add(u.uname.toLowerCase());
      }
      if (emailsSeen.has(u.email.toLowerCase())) {
        addError("noDuplicateUsernamesOrEmails", `Duplicate email "${u.email}" found for user ${u.uname} (${u._id}).`);
      } else {
        emailsSeen.add(u.email.toLowerCase());
      }
    }

    // --- Check 2: All userId references point to valid users ---
    let totalUserIdChecks = 0;
    
    // companyDetails.userId
    for (const cd of companyDetails) {
      totalUserIdChecks++;
      if (!userMap.has(cd.userId)) {
        addError("userIdReferences", `companyDetails record (${cd._id}) has invalid userId reference: ${cd.userId}`);
        addError("noOrphanRecords", `Orphan companyDetails record (${cd._id}): user ${cd.userId} does not exist`);
      }
    }
    // sentLinks.userId
    for (const sl of sentLinks) {
      totalUserIdChecks++;
      if (!userMap.has(sl.userId)) {
        addError("userIdReferences", `sentLinks record (${sl._id}) has invalid userId reference: ${sl.userId}`);
        addError("noOrphanRecords", `Orphan sentLinks record (${sl._id}): user ${sl.userId} does not exist`);
      }
    }
    // transactions.userId
    for (const tx of transactions) {
      totalUserIdChecks++;
      if (!userMap.has(tx.userId)) {
        addError("userIdReferences", `transactions record (${tx._id}) has invalid userId reference: ${tx.userId}`);
        addError("noOrphanRecords", `Orphan transactions record (${tx._id}): user ${tx.userId} does not exist`);
      }
    }
    // quota.byUserId
    for (const q of quota) {
      totalUserIdChecks++;
      if (!userMap.has(q.byUserId)) {
        addError("userIdReferences", `quota record (${q._id}) has invalid byUserId reference: ${q.byUserId}`);
        addError("noOrphanRecords", `Orphan quota record (${q._id}): user ${q.byUserId} does not exist`);
      }
    }
    // websites.userId
    for (const w of websites) {
      totalUserIdChecks++;
      if (!userMap.has(w.userId)) {
        addError("userIdReferences", `websites record (${w._id}) has invalid userId reference: ${w.userId}`);
        addError("noOrphanRecords", `Orphan websites record (${w._id}): user ${w.userId} does not exist`);
      }
    }
    // activity.userId
    for (const a of activity) {
      if (a.userId) {
        totalUserIdChecks++;
        if (!userMap.has(a.userId)) {
          addError("userIdReferences", `activity record (${a._id}) has invalid userId reference: ${a.userId}`);
          addError("noOrphanRecords", `Orphan activity record (${a._id}): user ${a.userId} does not exist`);
        }
      }
    }
    // users.cmpyid (parent company admin reference)
    for (const u of allUsers) {
      if (u.cmpyid) {
        totalUserIdChecks++;
        const parentExists = allUsers.some(p => p._id === u.cmpyid || p._id.toString() === u.cmpyid);
        if (!parentExists) {
          addError("userIdReferences", `user ${u.uname} (${u._id}) has invalid parent cmpyid reference: ${u.cmpyid}`);
        }
      }
    }
    auditResults.userIdReferences.scanned = totalUserIdChecks;

    // --- Check 3: All formKey references resolve correctly ---
    let totalFormKeyChecks = 0;
    // ratings.formKey
    for (const r of ratings) {
      totalFormKeyChecks++;
      if (!formKeyMap.has(r.formKey)) {
        addError("formKeyReferences", `ratings record (${r._id}) has invalid formKey: "${r.formKey}"`);
        addError("noOrphanRecords", `Orphan ratings record (${r._id}): formKey "${r.formKey}" does not exist`);
      }
    }
    // transactions.formKey
    for (const tx of transactions) {
      totalFormKeyChecks++;
      if (!formKeyMap.has(tx.formKey)) {
        addError("formKeyReferences", `transactions record (${tx._id}) has invalid formKey: "${tx.formKey}"`);
        addError("noOrphanRecords", `Orphan transactions record (${tx._id}): formKey "${tx.formKey}" does not exist`);
      } else {
        const owner = formKeyMap.get(tx.formKey);
        if (owner && owner._id !== tx.userId) {
          addError("formKeyReferences", `transactions record (${tx._id}) mismatch: formKey owner ${owner._id} !== userId ${tx.userId}`);
        }
      }
    }
    // quota.byFormKey
    for (const q of quota) {
      totalFormKeyChecks++;
      if (!formKeyMap.has(q.byFormKey)) {
        addError("formKeyReferences", `quota record (${q._id}) has invalid byFormKey: "${q.byFormKey}"`);
        addError("noOrphanRecords", `Orphan quota record (${q._id}): byFormKey "${q.byFormKey}" does not exist`);
      } else {
        const owner = formKeyMap.get(q.byFormKey);
        if (owner && owner._id !== q.byUserId) {
          addError("formKeyReferences", `quota record (${q._id}) mismatch: byFormKey owner ${owner._id} !== byUserId ${q.byUserId}`);
        }
      }
    }
    // websites.formKey
    for (const w of websites) {
      totalFormKeyChecks++;
      if (!formKeyMap.has(w.formKey)) {
        addError("formKeyReferences", `websites record (${w._id}) has invalid formKey: "${w.formKey}"`);
        addError("noOrphanRecords", `Orphan websites record (${w._id}): formKey "${w.formKey}" does not exist`);
      } else {
        const owner = formKeyMap.get(w.formKey);
        if (owner && owner._id !== w.userId) {
          addError("formKeyReferences", `websites record (${w._id}) mismatch: formKey owner ${owner._id} !== userId ${w.userId}`);
        }
      }
    }
    auditResults.formKeyReferences.scanned = totalFormKeyChecks;

    // --- Check 4: All frameId references resolve correctly ---
    let totalFrameIdChecks = 0;
    // websites.frameId
    for (const w of websites) {
      if (w.frameId && w.frameId !== "") {
        totalFrameIdChecks++;
        const owner = userMap.get(w.userId);
        if (!owner) {
          addError("frameIdReferences", `websites record (${w._id}) owner missing for frameId: "${w.frameId}"`);
        } else if (owner.frameId !== w.frameId) {
          addError("frameIdReferences", `websites record (${w._id}) frameId "${w.frameId}" does not match owner ${owner.uname} frameId "${owner.frameId}"`);
        }
      }
    }
    // users.frameId
    for (const u of allUsers) {
      if (u.frameId && u.frameId !== "") {
        totalFrameIdChecks++;
        // Check if there is at least one active website with this frameId
        const hasMatchingWebsite = websites.some(w => w.userId === u._id && w.frameId === u.frameId);
        if (!hasMatchingWebsite) {
          addError("frameIdReferences", `User ${u.uname} has active frameId "${u.frameId}" but no websites associated with it`);
        }
      }
    }
    auditResults.frameIdReferences.scanned = totalFrameIdChecks;

    // --- Check 5: All quota records are linked to existing users ---
    auditResults.quotaLinkedToUsers.scanned = quota.length;
    for (const q of quota) {
      if (!userMap.has(q.byUserId)) {
        addError("quotaLinkedToUsers", `quota record (${q._id}) refers to missing user: ${q.byUserId}`);
      } else {
        const owner = userMap.get(q.byUserId);
        if (owner && owner.formKey !== q.byFormKey) {
          addError("quotaLinkedToUsers", `quota record (${q._id}) formKey mismatch: "${q.byFormKey}" !== user formKey "${owner.formKey}"`);
        }
      }
    }

    // --- Check 6: All transactions are linked to valid users ---
    auditResults.transactionsLinkedToUsers.scanned = transactions.length;
    for (const tx of transactions) {
      if (!userMap.has(tx.userId)) {
        addError("transactionsLinkedToUsers", `transactions record (${tx._id}) refers to missing user: ${tx.userId}`);
      } else {
        const owner = userMap.get(tx.userId);
        if (owner && owner.formKey !== tx.formKey) {
          addError("transactionsLinkedToUsers", `transactions record (${tx._id}) formKey mismatch: "${tx.formKey}" !== user formKey "${owner.formKey}"`);
        }
      }
    }

    // --- Check 1: No orphan records exist ---
    // Let's set scanned count as sum of all child collections
    auditResults.noOrphanRecords.scanned = companyDetails.length + ratings.length + sentLinks.length + transactions.length + quota.length + activity.length + websites.length;

    // Calculate overall status
    const overallPass = Object.values(auditResults).every(r => r.passed);

    return {
      overallPass,
      results: auditResults,
    };
  }
});

export const cleanupOrphanRecords = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const userIds = new Set(allUsers.map(u => u._id));
    const activity = await ctx.db.query("activity").collect();
    let deletedCount = 0;
    for (const act of activity) {
      if (act.userId && !userIds.has(act.userId)) {
        await ctx.db.delete(act._id);
        deletedCount++;
      }
    }
    return { deletedCount };
  }
});

export const debugDump = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const quotas = await ctx.db.query("quota").collect();
    const websites = await ctx.db.query("websites").collect();
    return { users, quotas, websites };
  }
});

export const seedSuperAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const seedSingle = async (email: string, uname: string) => {
      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();
      
      const passwordHash = bcrypt.hashSync("123456", 10);

      if (existing) {
        await ctx.db.patch(existing._id, {
          role: "SUPER_ADMIN",
          sadmin: 1,
          active: 1,
          uname,
        });

        const account = await ctx.db
          .query("authAccounts")
          .withIndex("userIdAndProvider", (q) => q.eq("userId", existing._id).eq("provider", "password"))
          .first();
        if (account) {
          await ctx.db.patch(account._id, {
            secret: passwordHash,
            providerAccountId: email,
          });
        } else {
          await ctx.db.insert("authAccounts", {
            userId: existing._id,
            provider: "password",
            providerAccountId: email,
            secret: passwordHash,
          });
        }
        return existing._id;
      }

      const formKey = uname + Math.floor(Math.random() * 100000);
      const actKeyHash = bcrypt.hashSync("verified", 10);

      const userId = await ctx.db.insert("users", {
        role: "SUPER_ADMIN",
        sadmin: 1,
        admin: 0,
        iscmpy: 0,
        uname,
        fname: uname.toUpperCase(),
        lname: "Admin",
        email,
        mobile: "9999999999",
        active: 1,
        websiteForm: 1,
        sub: 1,
        actKey: actKeyHash,
        formKey,
        frameId: "",
        password: passwordHash,
        latestActivity: new Date().toUTCString(),
      });

      await ctx.db.insert("quota", {
        byUserId: userId,
        smsQuota: 10000,
        emailQuota: 10000,
        whatsappQuota: 10000,
        webQuota: 100,
        byFormKey: formKey,
        balance: 0,
      });

      await ctx.db.insert("authAccounts", {
        userId,
        provider: "password",
        providerAccountId: email,
        secret: passwordHash,
      });

      return userId;
    };

    await seedSingle("ntech@gmail.com", "ntech");
    await seedSingle("nktech@gmail.com", "nktech");

    return { success: true };
  },
});

export const createUserByAdmin = mutation({
  args: {
    fname: v.string(),
    lname: v.string(),
    uname: v.string(),
    email: v.string(),
    mobile: v.string(),
    password: v.string(),
    role: v.string(),
    branchId: v.optional(v.id("branches")),
    active: v.number(),
    cmpyName: v.optional(v.string()),
    cmpyEmail: v.optional(v.string()),
    cmpyMobile: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: caller, role: callerRole } = await enforceRoles(ctx, ["SUPER_ADMIN", "BRANCH_ADMIN"]);
    enforceWriteAccess(caller);
    await enforceActiveSubscriptionOrTrial(ctx, caller);

    if (args.password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    if (callerRole === "BRANCH_ADMIN") {
      if (args.role !== "BRANCH_USER") {
        throw new Error("Forbidden: Branch Admins can only create Branch Users");
      }
      if (!caller.branchId) {
        throw new Error("Forbidden: Caller is not assigned to a branch");
      }
      if (args.branchId !== caller.branchId) {
        throw new Error("Forbidden: You can only create users for your own branch");
      }
    } else {
      if ((args.role === "BRANCH_ADMIN" || args.role === "BRANCH_USER") && !args.branchId) {
        throw new Error("Branch assignment is mandatory for branch roles");
      }
    }

    const dupUname = await ctx.db
      .query("users")
      .withIndex("by_uname", (q) => q.eq("uname", args.uname))
      .first();
    if (dupUname) throw new Error("Username already exists");

    const dupEmail = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    if (dupEmail) throw new Error("Email already exists");

    const dupMobile = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("mobile"), args.mobile))
      .first();
    if (dupMobile) throw new Error("Mobile number already exists");

    if (args.branchId) {
      await checkBranchUserLimit(ctx, args.branchId, undefined, args.active === 1);
    }

    let cmpyIdVal = undefined;
    let cmpyNameVal = args.cmpyName;
    if (callerRole === "BRANCH_ADMIN") {
      cmpyIdVal = caller._id.toString();
      cmpyNameVal = cmpyNameVal || caller.cmpy;
    } else if (args.branchId) {
      const branchUsers = await ctx.db
        .query("users")
        .withIndex("by_branchId", (q: any) => q.eq("branchId", args.branchId))
        .collect();
      const bOwner = branchUsers.find((u: any) => normalizeRole(u.role, u.sadmin, u.admin) === "BRANCH_ADMIN");
      if (bOwner) {
        cmpyIdVal = bOwner._id.toString();
        cmpyNameVal = cmpyNameVal || bOwner.cmpy;
      }
    }

    const unameForm = args.uname.replace(/[\s.,?&]/g, "_").toLowerCase().substring(0, 5);
    const formKey = unameForm + Math.floor(Math.random() * 100000);
    const passwordHash = bcrypt.hashSync(args.password, 10);
    const actKeyHash = bcrypt.hashSync("verified", 10);

    const isCompanyAdmin = args.role === "BRANCH_ADMIN";
    const sub = args.role === "SUPER_ADMIN" ? 1 : 0;

    const userId = await ctx.db.insert("users", {
      role: args.role,
      sadmin: args.role === "SUPER_ADMIN" ? 1 : 0,
      admin: isCompanyAdmin ? 1 : 0,
      iscmpy: cmpyNameVal ? 1 : 0,
      cmpy: cmpyNameVal,
      cmpyid: cmpyIdVal,
      uname: args.uname,
      fname: args.fname,
      lname: args.lname,
      email: args.email,
      mobile: args.mobile,
      active: args.active,
      websiteForm: args.role === "SUPER_ADMIN" ? 1 : 0,
      sub,
      actKey: actKeyHash,
      formKey,
      frameId: "",
      password: passwordHash,
      latestActivity: new Date().toUTCString(),
      branchId: args.branchId,
    });

    await ctx.db.insert("quota", {
      byUserId: userId,
      smsQuota: args.role === "SUPER_ADMIN" ? 10000 : 100,
      emailQuota: args.role === "SUPER_ADMIN" ? 10000 : 100,
      whatsappQuota: args.role === "SUPER_ADMIN" ? 10000 : 100,
      webQuota: args.role === "SUPER_ADMIN" ? 100 : 5,
      byFormKey: formKey,
      balance: 0,
      branchId: args.branchId,
    });

    if (args.cmpyName) {
      await ctx.db.insert("companyDetails", {
        userId,
        cmpyName: args.cmpyName,
        cmpyMobile: args.cmpyMobile || "",
        cmpyEmail: args.cmpyEmail || "",
        cmpyLogo: "",
        branchId: args.branchId,
      });
    }

    await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: args.email,
      secret: passwordHash,
    });

    await ctx.db.insert("activity", {
      userId: caller._id,
      actionType: "USER_CREATE",
      msg: `Created new user [ Username: ${args.uname}, Email: ${args.email}, Role: ${args.role} ]`,
      actTime: new Date().toUTCString(),
      branchId: caller.branchId,
    });

    return userId;
  },
});

export const resetPasswordAdmin = mutation({
  args: { userId: v.id("users"), newPassword: v.string() },
  handler: async (ctx, args) => {
    const { user: caller, role: callerRole } = await enforceRoles(ctx, ["SUPER_ADMIN", "BRANCH_ADMIN"]);
    enforceWriteAccess(caller);

    if (args.newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User not found");

    if (callerRole === "BRANCH_ADMIN") {
      if (targetUser.branchId !== caller.branchId) {
        throw new Error("Forbidden: Cross-branch access denied");
      }
    }

    const passwordHash = bcrypt.hashSync(args.newPassword, 10);
    await ctx.db.patch(args.userId, { password: passwordHash });

    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId).eq("provider", "password"))
      .first();
    if (account) {
      await ctx.db.patch(account._id, { secret: passwordHash });
    }

    await ctx.db.insert("activity", {
      userId: caller._id,
      actionType: "PASSWORD_RESET",
      msg: `Reset password for user [ Username: ${targetUser.uname} ]`,
      actTime: new Date().toUTCString(),
      branchId: caller.branchId,
    });

    return true;
  },
});

export const editUserByAdmin = mutation({
  args: {
    userId: v.id("users"),
    fname: v.string(),
    lname: v.string(),
    uname: v.string(),
    email: v.string(),
    mobile: v.string(),
    role: v.string(),
    branchId: v.optional(v.id("branches")),
    active: v.number(),
    cmpyName: v.optional(v.string()),
    cmpyEmail: v.optional(v.string()),
    cmpyMobile: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: caller, role: callerRole } = await enforceRoles(ctx, ["SUPER_ADMIN", "BRANCH_ADMIN"]);
    enforceWriteAccess(caller);
    await enforceActiveSubscriptionOrTrial(ctx, caller);

    const userToEdit = await ctx.db.get(args.userId);
    if (!userToEdit) throw new Error("User not found");

    if (callerRole === "BRANCH_ADMIN") {
      if (args.role !== "BRANCH_USER") {
        throw new Error("Forbidden: Branch Admins can only manage Branch Users");
      }
      if (userToEdit.role !== "BRANCH_USER") {
        throw new Error("Forbidden: Branch Admins can only manage Branch Users");
      }
      if (!caller.branchId) {
        throw new Error("Forbidden: Caller is not assigned to a branch");
      }
      if (args.branchId !== caller.branchId || userToEdit.branchId !== caller.branchId) {
        throw new Error("Forbidden: You can only manage users in your own branch");
      }
    } else {
      if ((args.role === "BRANCH_ADMIN" || args.role === "BRANCH_USER") && !args.branchId) {
        throw new Error("Branch assignment is mandatory for branch roles");
      }
    }

    if (args.uname !== userToEdit.uname) {
      const dupUname = await ctx.db
        .query("users")
        .withIndex("by_uname", (q) => q.eq("uname", args.uname))
        .first();
      if (dupUname) throw new Error("Username already exists");
    }
    if (args.email !== userToEdit.email) {
      const dupEmail = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.email))
        .first();
      if (dupEmail) throw new Error("Email already exists");
    }
    if (args.mobile !== userToEdit.mobile) {
      const dupMobile = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("mobile"), args.mobile))
        .first();
      if (dupMobile) throw new Error("Mobile number already exists");
    }

    const targetBranchId = args.branchId !== undefined ? args.branchId : userToEdit.branchId;
    if (targetBranchId) {
      await checkBranchUserLimit(ctx, targetBranchId, args.userId, args.active === 1);
    }

    let cmpyIdVal = userToEdit.cmpyid;
    let cmpyNameVal = args.cmpyName || userToEdit.cmpy;
    if (callerRole === "BRANCH_ADMIN") {
      cmpyIdVal = caller._id.toString();
      cmpyNameVal = cmpyNameVal || caller.cmpy;
    } else if (args.branchId && args.branchId !== userToEdit.branchId) {
      const branchUsers = await ctx.db
        .query("users")
        .withIndex("by_branchId", (q: any) => q.eq("branchId", args.branchId))
        .collect();
      const bOwner = branchUsers.find((u: any) => normalizeRole(u.role, u.sadmin, u.admin) === "BRANCH_ADMIN");
      if (bOwner) {
        cmpyIdVal = bOwner._id.toString();
        cmpyNameVal = cmpyNameVal || bOwner.cmpy;
      }
    }

    const updates: any = {
      fname: args.fname,
      lname: args.lname,
      uname: args.uname,
      email: args.email,
      mobile: args.mobile,
      role: args.role,
      active: args.active,
      branchId: args.branchId,
      sadmin: args.role === "SUPER_ADMIN" ? 1 : 0,
      admin: args.role === "BRANCH_ADMIN" ? 1 : 0,
      iscmpy: cmpyNameVal ? 1 : 0,
      cmpy: cmpyNameVal || undefined,
      cmpyid: cmpyIdVal,
    };
    await ctx.db.patch(args.userId, updates);

    const qRecord = await ctx.db
      .query("quota")
      .withIndex("by_userId", (q) => q.eq("byUserId", args.userId))
      .first();
    if (qRecord) {
      await ctx.db.patch(qRecord._id, { branchId: args.branchId });
    }

    if (args.cmpyName) {
      const cmpyDetails = await ctx.db
        .query("companyDetails")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .first();
      if (cmpyDetails) {
        await ctx.db.patch(cmpyDetails._id, {
          cmpyName: args.cmpyName,
          cmpyMobile: args.cmpyMobile || "",
          cmpyEmail: args.cmpyEmail || "",
          branchId: args.branchId,
        });
      } else {
        await ctx.db.insert("companyDetails", {
          userId: args.userId,
          cmpyName: args.cmpyName,
          cmpyMobile: args.cmpyMobile || "",
          cmpyEmail: args.cmpyEmail || "",
          branchId: args.branchId,
        });
      }
    }

    const logMsgs = [];
    if (userToEdit.fname !== args.fname || userToEdit.lname !== args.lname) logMsgs.push("Name Updated");
    if (userToEdit.uname !== args.uname) logMsgs.push("Username Updated");
    if (userToEdit.email !== args.email) logMsgs.push("Email Updated");
    if (userToEdit.mobile !== args.mobile) logMsgs.push("Mobile Updated");
    if (userToEdit.active !== args.active) {
      logMsgs.push(`Status Changed to ${args.active === 1 ? "Active" : "Suspended"}`);
    }
    if (userToEdit.role !== args.role) {
      logMsgs.push(`Role Changed to ${args.role}`);
    }
    if (userToEdit.branchId !== args.branchId) {
      logMsgs.push(`Branch Changed`);
    }

    if (logMsgs.length > 0) {
      await ctx.db.insert("activity", {
        userId: caller._id,
        actionType: "USER_UPDATE",
        msg: `Updated user [ Username: ${args.uname} ] Details: ${logMsgs.join(", ")}`,
        actTime: new Date().toUTCString(),
        branchId: caller.branchId,
      });
    }

    return true;
  },
});

export const cleanupDuplicateAuthAccounts = mutation({
  args: {},
  handler: async (ctx) => {
    const allAccounts = await ctx.db.query("authAccounts").collect();
    const seen = new Map<string, any[]>();

    for (const acc of allAccounts) {
      const key = `${acc.provider}:${acc.providerAccountId}`;
      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key)!.push(acc);
    }

    let deletedCount = 0;
    for (const [key, accounts] of seen.entries()) {
      if (accounts.length > 1) {
        let keepIdx = 0;
        for (let i = 0; i < accounts.length; i++) {
          const userDoc = await ctx.db.get(accounts[i].userId);
          if (userDoc) {
            keepIdx = i;
            break;
          }
        }
        for (let i = 0; i < accounts.length; i++) {
          if (i !== keepIdx) {
            await ctx.db.delete(accounts[i]._id);
            deletedCount++;
          }
        }
      }
    }
    return { success: true, deletedCount };
  },
});

export const upgradeSubscription = mutation({
  args: {
    pricingPackageId: v.id("pricing"),
  },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    enforceWriteAccess(caller);

    const newPkg = await ctx.db.get(args.pricingPackageId);
    if (!newPkg || newPkg.status !== "active") {
      throw new Error("Invalid pricing package selected");
    }

    const owner = await getAccountOwner(ctx, caller);

    if (caller._id !== owner._id) {
      throw new Error("Only the company admin can upgrade the subscription plan");
    }

    // Set new pricing plan and status
    await ctx.db.patch(owner._id, {
      pricingPackageId: newPkg._id,
      sub: 1, // Activate subscription immediately for upgrade
    });

    // Update quota record for the owner
    const quota = await ctx.db
      .query("quota")
      .withIndex("by_userId", (q) => q.eq("byUserId", owner._id))
      .first();

    const nameLower = newPkg.packageName.toLowerCase();
    let smsQuota = 0;
    let emailQuota = 0;
    let whatsappQuota = 0;
    let webQuota = 0;
    
    if (nameLower.includes("plus") || newPkg.price >= 9000) {
      smsQuota = 20;
      emailQuota = 20;
      whatsappQuota = 20;
      webQuota = 20;
    } else if (nameLower.includes("premium") || nameLower.includes("gold") || newPkg.price >= 5000) {
      smsQuota = 10;
      emailQuota = 10;
      whatsappQuota = 10;
      webQuota = 10;
    } else {
      smsQuota = 0;
      emailQuota = 5;
      whatsappQuota = 5;
      webQuota = 5;
    }

    if (quota) {
      await ctx.db.patch(quota._id, {
        smsQuota: quota.smsQuota + smsQuota,
        emailQuota: quota.emailQuota + emailQuota,
        whatsappQuota: quota.whatsappQuota + whatsappQuota,
        webQuota: quota.webQuota + webQuota,
        amount: newPkg.price,
        balance: 0,
      });
    }

    // Log action
    await ctx.db.insert("activity", {
      userId: owner._id,
      actionType: "UPGRADE_PLAN",
      msg: `Upgraded subscription to plan [ ${newPkg.packageName} ]`,
      actTime: new Date().toUTCString(),
      branchId: owner.branchId,
    });

    return { success: true };
  },
});






