import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { validateUser, enforceWriteAccess, enforceBranchAccess } from "./authHelpers";

// Helper to find target quota record for a user
async function findQuotaRecord(db: any, user: any) {
  const isCmpy = user.iscmpy === 1;
  const cmpyIdStr = user.cmpyid;

  if (isCmpy && cmpyIdStr && cmpyIdStr !== "") {
    const qRecord = await db
      .query("quota")
      .filter((q: any) => q.eq(q.field("byUserId"), cmpyIdStr))
      .first();
    return qRecord;
  } else {
    const qRecord = await db
      .query("quota")
      .withIndex("by_userId", (q: any) => q.eq("byUserId", user._id))
      .filter((q: any) => q.eq(q.field("byFormKey"), user.formKey))
      .first();
    return qRecord;
  }
}

// Queries
export const getUserQuota = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    await enforceBranchAccess(ctx, user.branchId);
    return await findQuotaRecord(ctx.db, user);
  },
});

export const checkQuotaStatus = query({
  args: { formKey: v.string(), quotaType: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_formKey", (q) => q.eq("formKey", args.formKey))
      .unique();
    if (!user) return "not_found";

    if (user.branchId) {
      const branch = await ctx.db.get(user.branchId);
      if (branch?.deleted) {
        return "not_found";
      }
    }

    const qRecord = await findQuotaRecord(ctx.db, user);
    if (!qRecord) return "not_found";

    if (qRecord.balance && qRecord.balance > 0) {
      return "pending_balance";
    }

    if (args.quotaType) {
      const field = args.quotaType as keyof typeof qRecord;
      const val = qRecord[field] as number;
      if (val <= 0) {
        return user.email;
      }
    }

    return "ok";
  },
});

// Mutations
export const deductQuota = mutation({
  args: { userId: v.id("users"), quotaType: v.string(), amount: v.number() },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    enforceWriteAccess(caller);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    await enforceBranchAccess(ctx, user.branchId);

    const qRecord = await findQuotaRecord(ctx.db, user);
    if (!qRecord) throw new Error("Quota record not found");

    const field = args.quotaType;
    const currentVal = (qRecord[field as keyof typeof qRecord] as number) || 0;
    const newVal = Math.max(0, currentVal - args.amount);

    await ctx.db.patch(qRecord._id, {
      [field]: newVal,
    });
    return true;
  },
});

export const addQuota = mutation({
  args: { userId: v.id("users"), quotaType: v.string(), amount: v.number() },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    enforceWriteAccess(caller);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    await enforceBranchAccess(ctx, user.branchId);

    const qRecord = await findQuotaRecord(ctx.db, user);
    if (!qRecord) throw new Error("Quota record not found");

    const field = args.quotaType;
    const currentVal = (qRecord[field as keyof typeof qRecord] as number) || 0;
    const newVal = currentVal + args.amount;

    await ctx.db.patch(qRecord._id, {
      [field]: newVal,
    });
    return true;
  },
});

export const updateQuotaDetails = mutation({
  args: {
    userId: v.id("users"),
    smsQuota: v.number(),
    emailQuota: v.number(),
    whatsappQuota: v.number(),
    webQuota: v.number(),
  },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    enforceWriteAccess(caller);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    await enforceBranchAccess(ctx, user.branchId);

    const qRecord = await findQuotaRecord(ctx.db, user);
    if (!qRecord) throw new Error("Quota record not found");

    await ctx.db.patch(qRecord._id, {
      smsQuota: args.smsQuota,
      emailQuota: args.emailQuota,
      whatsappQuota: args.whatsappQuota,
      webQuota: args.webQuota,
    });
    return true;
  },
});
