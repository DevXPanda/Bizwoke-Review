import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { enforceRoles, enforceWriteAccess } from "./authHelpers";

export const getBranches = query({
  args: {},
  handler: async (ctx) => {
    const { user, role } = await enforceRoles(ctx, ["SUPER_ADMIN", "BRANCH_ADMIN", "BRANCH_USER"]);
    
    if (role === "SUPER_ADMIN") {
      return await ctx.db
        .query("branches")
        .withIndex("by_deleted", (q) => q.eq("deleted", undefined))
        .collect();
    } else {
      if (!user.branchId) {
        return [];
      }
      const myBranch = await ctx.db.get(user.branchId);
      return myBranch && !myBranch.deleted ? [myBranch] : [];
    }
  },
});

export const getBranchById = query({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => {
    const { user, role } = await enforceRoles(ctx, ["SUPER_ADMIN", "BRANCH_ADMIN", "BRANCH_USER"]);
    if (role !== "SUPER_ADMIN" && user.branchId !== args.id) {
      throw new Error("Forbidden: Cross-branch access denied");
    }
    const branch = await ctx.db.get(args.id);
    if (!branch || branch.deleted) {
      throw new Error("Branch not found");
    }
    return branch;
  },
});

export const createBranch = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    active: v.number(),
    cmpyName: v.optional(v.string()),
    pricingPackageId: v.optional(v.id("pricing")),
  },
  handler: async (ctx, args) => {
    const { user } = await enforceRoles(ctx, ["SUPER_ADMIN"]);
    enforceWriteAccess(user);

    // Check duplicate code
    const existing = await ctx.db
      .query("branches")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    
    if (existing && !existing.deleted) {
      throw new Error("A branch with this code already exists");
    }

    // Reuse soft-deleted branch or create new
    if (existing && existing.deleted) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        active: args.active,
        cmpyName: args.cmpyName,
        pricingPackageId: args.pricingPackageId,
        deleted: undefined, // Restore
      });
      return existing._id;
    }

    return await ctx.db.insert("branches", {
      name: args.name,
      code: args.code,
      active: args.active,
      cmpyName: args.cmpyName,
      pricingPackageId: args.pricingPackageId,
    });
  },
});

export const updateBranch = mutation({
  args: {
    id: v.id("branches"),
    name: v.string(),
    code: v.string(),
    active: v.number(),
    cmpyName: v.optional(v.string()),
    pricingPackageId: v.optional(v.id("pricing")),
  },
  handler: async (ctx, args) => {
    const { user } = await enforceRoles(ctx, ["SUPER_ADMIN"]);
    enforceWriteAccess(user);

    const branch = await ctx.db.get(args.id);
    if (!branch || branch.deleted) {
      throw new Error("Branch not found");
    }

    // Check duplicate code if changed
    if (branch.code !== args.code) {
      const existing = await ctx.db
        .query("branches")
        .withIndex("by_code", (q) => q.eq("code", args.code))
        .first();
      if (existing && !existing.deleted) {
        throw new Error("A branch with this code already exists");
      }
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      code: args.code,
      active: args.active,
      cmpyName: args.cmpyName,
      pricingPackageId: args.pricingPackageId,
    });
  },
});

export const deleteBranch = mutation({
  args: {
    id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const { user } = await enforceRoles(ctx, ["SUPER_ADMIN"]);
    enforceWriteAccess(user);

    const branch = await ctx.db.get(args.id);
    if (!branch || branch.deleted) {
      throw new Error("Branch not found");
    }

    // Soft delete
    await ctx.db.patch(args.id, {
      deleted: true,
      active: 0, // Inactivate soft-deleted branch
    });
  },
});

export const getBranchDashboardSummary = query({
  args: {},
  handler: async (ctx) => {
    await enforceRoles(ctx, ["SUPER_ADMIN"]);

    const allBranches = await ctx.db
      .query("branches")
      .withIndex("by_deleted", (q) => q.eq("deleted", undefined))
      .collect();

    const summary = [];

    for (const branch of allBranches) {
      const users = await ctx.db
        .query("users")
        .withIndex("by_branchId", (q) => q.eq("branchId", branch._id))
        .collect();

      const platforms = await ctx.db
        .query("websites")
        .withIndex("by_branchId", (q) => q.eq("branchId", branch._id))
        .collect();
      const activePlatforms = platforms.filter(p => p.active === 1).length;

      const ratings = await ctx.db
        .query("ratings")
        .withIndex("by_branchId", (q) => q.eq("branchId", branch._id))
        .collect();

      const totalReviews = ratings.length;
      const averageRating = totalReviews > 0 
        ? parseFloat((ratings.reduce((sum, r) => sum + r.star, 0) / totalReviews).toFixed(1))
        : 0;

      const pricingPackage = branch.pricingPackageId
        ? await ctx.db.get(branch.pricingPackageId)
        : null;

      summary.push({
        branchId: branch._id,
        branchName: branch.name,
        branchCode: branch.code,
        totalReviews,
        averageRating,
        activePlatforms,
        totalUsers: users.length,
        status: branch.active === 1 ? "Active" : "Inactive",
        pricingPackageId: branch.pricingPackageId,
        planName: pricingPackage?.packageName || "No Plan",
        maxUsers: pricingPackage?.maxUsers,
      });
    }

    return summary;
  },
});

export const getBranchFullDetails = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    await enforceRoles(ctx, ["SUPER_ADMIN"]);

    const branch = await ctx.db.get(args.branchId);
    if (!branch || branch.deleted) {
      throw new Error("Branch not found or deleted");
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_branchId", (q) => q.eq("branchId", args.branchId))
      .collect();

    const platforms = await ctx.db
      .query("websites")
      .withIndex("by_branchId", (q) => q.eq("branchId", args.branchId))
      .collect();

    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_branchId", (q) => q.eq("branchId", args.branchId))
      .collect();

    const sortedRatings = [...ratings].sort((a, b) => b._creationTime - a._creationTime);

    const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      const star = r.star as 1 | 2 | 3 | 4 | 5;
      if (starCounts[star] !== undefined) {
        starCounts[star]++;
      }
    });

    const totalReviews = ratings.length;
    const averageRating = totalReviews > 0
      ? parseFloat((ratings.reduce((sum, r) => sum + r.star, 0) / totalReviews).toFixed(1))
      : 0;

    const campaigns = await ctx.db
      .query("sentLinks")
      .withIndex("by_branchId", (q) => q.eq("branchId", args.branchId))
      .collect();

    const emailCampaignCount = campaigns.filter(c => c.linkFor === "email").length;
    const smsCampaignCount = campaigns.filter(c => c.linkFor === "sms").length;
    const whatsappCampaignCount = campaigns.filter(c => c.linkFor === "whatsapp").length;

    const logs = await ctx.db
      .query("activity")
      .withIndex("by_branchId", (q) => q.eq("branchId", args.branchId))
      .collect();
    const sortedLogs = [...logs].sort((a, b) => b._creationTime - a._creationTime);

    const quotas = await ctx.db
      .query("quota")
      .withIndex("by_branchId", (q) => q.eq("branchId", args.branchId))
      .collect();

    const pricingPackage = branch.pricingPackageId
      ? await ctx.db.get(branch.pricingPackageId)
      : null;

    return {
      overview: {
        id: branch._id,
        name: branch.name,
        code: branch.code,
        createdTime: branch._creationTime,
        active: branch.active === 1,
        cmpyName: branch.cmpyName || "",
        pricingPackageId: branch.pricingPackageId,
        planName: pricingPackage?.packageName || "No Plan",
        maxUsers: pricingPackage?.maxUsers,
      },
      analytics: {
        totalReviews,
        averageRating,
        starCounts,
      },
      platforms: platforms.map(p => ({
        id: p._id,
        name: p.webName,
        link: p.webLink,
        active: p.active === 1,
        totalRatings: p.totalRatings,
        starRating: p.starRating,
      })),
      users: users.map(u => ({
        id: u._id,
        fname: u.fname || "",
        lname: u.lname || "",
        uname: u.uname,
        email: u.email,
        mobile: u.mobile,
        role: u.role,
        active: u.active,
        latestActivity: u.latestActivity || "",
      })),
      campaigns: {
        total: campaigns.length,
        emailCount: emailCampaignCount,
        smsCount: smsCampaignCount,
        whatsappCount: whatsappCampaignCount,
        list: campaigns.map(c => ({
          id: c._id,
          type: c.linkFor,
          sentTo: c.sentToEmail || c.sentToSms || "—",
          subject: c.subj || "",
          body: c.body,
          creationTime: c._creationTime,
        })),
      },
      reviews: sortedRatings.map(r => ({
        id: r._id,
        name: r.name,
        star: r.star,
        review: r.review || "",
        webName: r.webName,
        webLink: r.webLink,
        creationTime: r._creationTime,
      })),
      logs: sortedLogs.map(l => ({
        id: l._id,
        actionType: l.actionType || "LOG",
        msg: l.msg,
        actTime: l.actTime,
        creationTime: l._creationTime,
      })),
      quota: quotas.map(q => ({
        id: q._id,
        smsQuota: q.smsQuota,
        emailQuota: q.emailQuota,
        whatsappQuota: q.whatsappQuota,
        webQuota: q.webQuota,
        balance: q.balance || 0,
      }))[0] || { smsQuota: 0, emailQuota: 0, whatsappQuota: 0, webQuota: 0, balance: 0 },
    };
  },
});
