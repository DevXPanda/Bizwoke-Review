import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { validateUser, getBranchFilterId, enforceRoles, enforceWriteAccess } from "./authHelpers";

// Queries
export const getActivityLogs = query({
  handler: async (ctx) => {
    const caller = await validateUser(ctx);
    const branchId = getBranchFilterId(caller);

    const logs = branchId
      ? await ctx.db
          .query("activity")
          .withIndex("by_branchId", (q) => q.eq("branchId", branchId))
          .order("desc")
          .collect()
      : await ctx.db.query("activity").order("desc").collect();
    return logs;
  },
});

export const getFeedbacksList = query({
  handler: async (ctx) => {
    await enforceRoles(ctx, ["SUPER_ADMIN"]);
    return await ctx.db.query("contact").order("desc").collect();
  },
});

// Mutations
export const logActivity = mutation({
  args: {
    userId: v.optional(v.id("users")),
    actionType: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    msg: v.string(),
  },
  handler: async (ctx, args) => {
    let branchId;
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      branchId = user?.branchId;
    }
    await ctx.db.insert("activity", {
      userId: args.userId,
      ipAddress: args.ipAddress,
      actionType: args.actionType,
      msg: args.msg,
      actTime: new Date().toUTCString(),
      branchId,
    });
    return true;
  },
});

export const clearActivityLogs = mutation({
  handler: async (ctx) => {
    const { user } = await enforceRoles(ctx, ["SUPER_ADMIN"]);
    enforceWriteAccess(user);

    const logs = await ctx.db.query("activity").collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    return true;
  },
});

export const submitContactRequest = mutation({
  args: { name: v.string(), userMail: v.string(), bdy: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("contact", args);
    return true;
  },
});

export const clearFeedbacksList = mutation({
  handler: async (ctx) => {
    const { user } = await enforceRoles(ctx, ["SUPER_ADMIN"]);
    enforceWriteAccess(user);

    const contacts = await ctx.db.query("contact").collect();
    for (const c of contacts) {
      await ctx.db.delete(c._id);
    }
    return true;
  },
});
