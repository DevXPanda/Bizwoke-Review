import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { validateUser, getBranchFilterId, enforceBranchAccess, enforceWriteAccess } from "./authHelpers";

// Queries
export const getPaymentsList = query({
  handler: async (ctx) => {
    const caller = await validateUser(ctx);
    const branchId = getBranchFilterId(caller);

    const txs = branchId
      ? await ctx.db
          .query("transactions")
          .withIndex("by_branchId", (q) => q.eq("branchId", branchId))
          .collect()
      : await ctx.db.query("transactions").collect();

    const result = [];
    for (const t of txs) {
      const user = await ctx.db.get(t.userId);
      result.push({
        ...t,
        uname: user ? user.uname : "unknown",
      });
    }
    return result;
  },
});

export const getTransactionDetails = query({
  args: { paymentId: v.string(), formKey: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    await enforceBranchAccess(ctx, user.branchId);

    return await ctx.db
      .query("transactions")
      .withIndex("by_paymentId", (q) => q.eq("paymentId", args.paymentId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("formKey"), args.formKey))
      .first();
  },
});

export const checkPaymentExists = query({
  args: { paymentId: v.string() },
  handler: async (ctx, args) => {
    const tx = await ctx.db
      .query("transactions")
      .withIndex("by_paymentId", (q) => q.eq("paymentId", args.paymentId))
      .first();
    return !!tx;
  },
});

// Mutations
export const savePaymentInfo = mutation({
  args: {
    userId: v.id("users"),
    formKey: v.string(),
    paymentId: v.string(),
    orderId: v.string(),
    transactionId: v.optional(v.string()),
    rrn: v.optional(v.string()),
    entity: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    captured: v.string(),
    mop: v.string(),
    cardId: v.optional(v.string()),
    bank: v.optional(v.string()),
    wallet: v.optional(v.string()),
    vpa: v.optional(v.string()),
    description: v.optional(v.string()),
    email: v.string(),
    mobile: v.string(),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    const branchId = user.branchId;

    // Check duplication
    const dup = await ctx.db
      .query("transactions")
      .withIndex("by_paymentId", (q) => q.eq("paymentId", args.paymentId))
      .first();
    if (dup) return false;

    // Save transaction with branchId
    await ctx.db.insert("transactions", {
      ...args,
      branchId,
    });

    // Update user subscription state
    await ctx.db.patch(args.userId, { sub: 1 });

    // Update quota balances
    const isCmpy = user.iscmpy === 1;
    const cmpyId = user.cmpyid;
    const targetUserId = (isCmpy && cmpyId) ? (cmpyId as any) : args.userId;

    const qRecord = await ctx.db
      .query("quota")
      .filter((q) => q.eq(q.field("byUserId"), targetUserId))
      .first();

    if (qRecord) {
      const currentBalance = qRecord.balance || 0;
      await ctx.db.patch(qRecord._id, {
        balance: Math.max(0, currentBalance - args.amount),
      });
    }

    // Log action
    await ctx.db.insert("activity", {
      userId: args.userId,
      actionType: "PAYMENT_SUCCESS",
      msg: `Payment successful [ Username: ${user.uname}, Amount: ${args.amount} ]`,
      actTime: new Date().toUTCString(),
      branchId,
    });

    return true;
  },
});
