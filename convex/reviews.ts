import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { validateUser, enforceRoles, enforceWriteAccess, getBranchFilterId, enforceBranchAccess, getAccountOwner, enforceActiveSubscriptionOrTrial } from "./authHelpers";
import { Id } from "./_generated/dataModel";

// Platform Queries & Mutations
export const getWebsites = query({
  args: { userId: v.id("users"), formKey: v.string() },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    const branchId = getBranchFilterId(caller);
    if (branchId) {
      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser || targetUser.branchId !== branchId) {
        throw new Error("Forbidden: Cross-branch access denied");
      }
    }
    return await ctx.db
      .query("websites")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("formKey"), args.formKey))
      .collect();
  },
});

export const getPlatformsByKey = query({
  args: { formKey: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_formKey", (q) => q.eq("formKey", args.formKey))
      .first();
    if (user && user.branchId) {
      const branch = await ctx.db.get(user.branchId);
      if (branch?.deleted) {
        return [];
      }
    }
    return await ctx.db
      .query("websites")
      .withIndex("by_formKey", (q) => q.eq("formKey", args.formKey))
      .filter((q) => q.eq(q.field("active"), 1))
      .collect();
  },
});

export const getWebsiteDetails = query({
  args: { id: v.id("websites") },
  handler: async (ctx, args) => {
    const web = await ctx.db.get(args.id);
    if (!web) return null;
    await enforceBranchAccess(ctx, web.branchId);
    return web;
  },
});

export const createWebsite = mutation({
  args: {
    userId: v.id("users"),
    formKey: v.string(),
    webName: v.string(),
    webLink: v.string(),
    subject: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.string(),
    logo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    enforceWriteAccess(caller);
    await enforceActiveSubscriptionOrTrial(ctx, caller);
    const branchId = getBranchFilterId(caller);
    
    if (branchId) {
      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser || targetUser.branchId !== branchId) {
        throw new Error("Forbidden: Cross-branch access denied");
      }
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Fetch quota record
    const isCmpy = user.iscmpy === 1;
    const cmpyId = user.cmpyid;
    const targetUserId = (isCmpy && cmpyId) ? (cmpyId as any) : args.userId;

    const qRecord = await ctx.db
      .query("quota")
      .filter((q) => q.eq(q.field("byUserId"), targetUserId))
      .first();

    if (!qRecord || qRecord.webQuota <= 0) {
      return { success: false, error: "Web Quota exceeded" };
    }

    // Check duplicate name
    const dupName = await ctx.db
      .query("websites")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("formKey"), args.formKey))
      .filter((q) => q.eq(q.field("webName"), args.webName))
      .first();
    if (dupName) return { success: false, error: `You have an existing platform with the name [${args.webName}]` };

    // Check duplicate link
    const dupLink = await ctx.db
      .query("websites")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("formKey"), args.formKey))
      .filter((q) => q.eq(q.field("webLink"), args.webLink))
      .first();
    if (dupLink) return { success: false, error: `You have an existing platform with the link [${args.webLink}]` };

    // Deduct quota
    await ctx.db.patch(qRecord._id, {
      webQuota: qRecord.webQuota - 1,
    });

    let logoUrl = args.logo;
    if (args.logo && !args.logo.startsWith("http")) {
      logoUrl = (await ctx.storage.getUrl(args.logo)) || "";
    }

    const targetBranchId = branchId || user.branchId;

    const webId = await ctx.db.insert("websites", {
      userId: args.userId,
      formKey: args.formKey,
      webName: args.webName,
      webLink: args.webLink,
      active: 1,
      subject: args.subject || "",
      description: args.description || "",
      totalRatings: 0,
      starRating: 0,
      frameId: "",
      icon: args.icon,
      logo: logoUrl || "",
      branchId: targetBranchId,
    });

    await ctx.db.insert("activity", {
      userId: args.userId,
      actionType: "PLATFORM_CREATE",
      msg: `New Platform created [ Username: ${user.uname}, Platform: ${args.webName}, Link: ${args.webLink} ]`,
      actTime: new Date().toUTCString(),
      branchId: targetBranchId,
    });

    return { success: true, webId };
  },
});

export const updateWebsite = mutation({
  args: {
    id: v.id("websites"),
    active: v.number(),
    subject: v.string(),
    description: v.string(),
    icon: v.string(),
    logo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    enforceWriteAccess(caller);
    
    const web = await ctx.db.get(args.id);
    if (!web) throw new Error("Platform not found");
    await enforceBranchAccess(ctx, web.branchId);

    let logoUrl = args.logo;
    if (args.logo && !args.logo.startsWith("http")) {
      logoUrl = (await ctx.storage.getUrl(args.logo)) || "";
    }

    await ctx.db.patch(args.id, {
      active: args.active,
      subject: args.subject,
      description: args.description,
      icon: args.icon,
      logo: logoUrl || web.logo,
    });

    const user = await ctx.db.get(web.userId);
    if (user) {
      await ctx.db.insert("activity", {
        userId: web.userId,
        actionType: "PLATFORM_UPDATE",
        msg: `Platform Updated [ Username: ${user.uname}, PlatformID: ${args.id} ]`,
        actTime: new Date().toUTCString(),
        branchId: web.branchId,
      });
    }
    return true;
  },
});

export const removeWebsite = mutation({
  args: { userId: v.id("users"), webId: v.id("websites"), webName: v.string(), webLink: v.string() },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    enforceWriteAccess(caller);

    const web = await ctx.db.get(args.webId);
    if (!web) throw new Error("Platform not found");
    await enforceBranchAccess(ctx, web.branchId);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Delete
    await ctx.db.delete(args.webId);

    // Recredit quota
    const isCmpy = user.iscmpy === 1;
    const cmpyId = user.cmpyid;
    const targetUserId = (isCmpy && cmpyId) ? (cmpyId as any) : args.userId;

    const qRecord = await ctx.db
      .query("quota")
      .filter((q) => q.eq(q.field("byUserId"), targetUserId))
      .first();

    if (qRecord) {
      await ctx.db.patch(qRecord._id, {
        webQuota: qRecord.webQuota + 1,
      });
    }

    await ctx.db.insert("activity", {
      userId: args.userId,
      actionType: "PLATFORM_DELETE",
      msg: `Deleted Platform [ Username: ${user.uname}, Platform: ${args.webName}, Link: ${args.webLink} ]`,
      actTime: new Date().toUTCString(),
      branchId: web.branchId,
    });

    return true;
  },
});

// Client Reviews Submission Flow
export const saveRating = mutation({
  args: {
    userIp: v.string(),
    star: v.number(),
    review: v.optional(v.string()),
    name: v.string(),
    mobile: v.string(),
    webId: v.id("websites"),
    webName: v.string(),
    webLink: v.string(),
    formKey: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_formKey", (q) => q.eq("formKey", args.formKey))
      .first();
    if (user && user.branchId) {
      const branch = await ctx.db.get(user.branchId);
      if (branch?.deleted) {
        throw new Error("Branch is deleted");
      }
    }
    const branchId = user?.branchId;

    // Auto-seed default survey questions if they don't exist yet
    const existingQuestions = await ctx.db.query("surveyQuestions").collect();
    if (existingQuestions.length === 0) {
      const defaultQuestions = [
        "Did our food satisfy your taste buds?.",
        "Did you enjoy the beverages?.",
        "Did we take your order on time?.",
        "Did we serve you on time?.",
        "Were our staff member friendly?..",
        "Do you like our restaurant?....",
        "Do you like our menu selections/variety?.",
        "We care-did it show?.",
      ];
      for (let i = 0; i < defaultQuestions.length; i++) {
        await ctx.db.insert("surveyQuestions", {
          questionText: defaultQuestions[i],
          orderBy: i + 1,
          active: 1,
        });
      }
    }

    // 1. Insert review
    const ratingId = await ctx.db.insert("ratings", {
      userIp: args.userIp,
      star: args.star,
      review: args.review || "",
      name: args.name,
      mobile: args.mobile,
      webName: args.webName,
      webLink: args.webLink,
      formKey: args.formKey,
      branchId,
      surveyCompleted: false,
    });

    // 2. Increment platform review count
    const web = await ctx.db.get(args.webId);
    if (web) {
      await ctx.db.patch(args.webId, {
        totalRatings: web.totalRatings + 1,
        starRating: web.starRating + args.star,
      });
    }

    // 3. Log activity
    await ctx.db.insert("activity", {
      actionType: "FEEDBACK_RECORD",
      msg: `Feedback recorded [ Platform: ${args.webName}, Form Key: ${args.formKey} ]`,
      actTime: new Date().toUTCString(),
      branchId,
    });

    // Resolve if active questions exist
    const activeQuestionsList = await ctx.db.query("surveyQuestions").collect();
    const hasActiveQuestions = activeQuestionsList.some(q => q.active === 1);

    return {
      ratingId,
      hasActiveQuestions,
    };
  },
});

// Reporting & Analytics
export const getUserRatings = query({
  args: { formKey: v.string() },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    const branchId = getBranchFilterId(caller);
    
    if (branchId) {
      return await ctx.db
        .query("ratings")
        .withIndex("by_branchId", (q) => q.eq("branchId", branchId))
        .filter((q) => q.eq(q.field("formKey"), args.formKey))
        .collect();
    } else {
      return await ctx.db
        .query("ratings")
        .withIndex("by_formKey", (q) => q.eq("formKey", args.formKey))
        .collect();
    }
  },
});

export const getAllRatingsSadmin = query({
  handler: async (ctx) => {
    await enforceRoles(ctx, ["SUPER_ADMIN"]);
    return await ctx.db.query("ratings").collect();
  },
});

export const getSentLinks = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    const branchId = getBranchFilterId(caller);
    if (branchId) {
      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser || targetUser.branchId !== branchId) {
        throw new Error("Forbidden: Cross-branch access denied");
      }
    }
    return await ctx.db
      .query("sentLinks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getAllSentLinksSadmin = query({
  handler: async (ctx) => {
    await enforceRoles(ctx, ["SUPER_ADMIN"]);
    return await ctx.db.query("sentLinks").collect();
  },
});

export const logSentLink = mutation({
  args: {
    userId: v.id("users"),
    linkFor: v.string(),
    sentToSms: v.optional(v.string()),
    sentToEmail: v.optional(v.string()),
    subj: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    enforceWriteAccess(caller);
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User not found");
    await enforceBranchAccess(ctx, targetUser.branchId);

    await ctx.db.insert("sentLinks", {
      userId: args.userId,
      linkFor: args.linkFor,
      sentToSms: args.sentToSms || "",
      sentToEmail: args.sentToEmail || "",
      subj: args.subj || "",
      body: args.body,
      branchId: targetUser.branchId,
    });
    return true;
  },
});

export const getDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const caller = await validateUser(ctx);
    const owner = await getAccountOwner(ctx, caller);
    const branchId = getBranchFilterId(caller);

    let quotaRecord = null;
    let websites = [];
    let ratings = [];

    if (branchId) {
      quotaRecord = await ctx.db
        .query("quota")
        .withIndex("by_branchId", (q) => q.eq("branchId", branchId))
        .first();
      
      if (!quotaRecord) {
        quotaRecord = await ctx.db
          .query("quota")
          .withIndex("by_userId", (q) => q.eq("byUserId", caller._id))
          .first();
      }

      websites = await ctx.db
        .query("websites")
        .withIndex("by_branchId", (q) => q.eq("branchId", branchId))
        .collect();

      ratings = await ctx.db
        .query("ratings")
        .withIndex("by_branchId", (q) => q.eq("branchId", branchId))
        .collect();
    } else {
      const isCmpy = caller.iscmpy === 1;
      const cmpyIdStr = caller.cmpyid;
      if (isCmpy && cmpyIdStr && cmpyIdStr !== "") {
        quotaRecord = await ctx.db
          .query("quota")
          .filter((q: any) => q.eq(q.field("byUserId"), cmpyIdStr))
          .first();
      } else {
        quotaRecord = await ctx.db
          .query("quota")
          .withIndex("by_userId", (q: any) => q.eq("byUserId", caller._id))
          .filter((q: any) => q.eq(q.field("byFormKey"), caller.formKey))
          .first();
      }

      websites = await ctx.db
        .query("websites")
        .withIndex("by_userId", (q) => q.eq("userId", caller._id))
        .filter((q) => q.eq(q.field("formKey"), caller.formKey))
        .collect();

      ratings = await ctx.db
        .query("ratings")
        .withIndex("by_formKey", (q) => q.eq("formKey", caller.formKey))
        .collect();
    }

    const totalReviews = ratings.length;
    const sumRatings = ratings.reduce((sum, r) => sum + r.star, 0);
    const averageRating = totalReviews > 0 ? Number((sumRatings / totalReviews).toFixed(1)) : 0;

    const starDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      const star = r.star as 1 | 2 | 3 | 4 | 5;
      if (starDistribution[star] !== undefined) {
        starDistribution[star]++;
      }
    });

    const platformSummary = websites.map((web) => {
      const webRatings = ratings.filter(
        (r) => r.webName === web.webName && r.webLink === web.webLink
      );
      const webStars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      webRatings.forEach((r) => {
        const star = r.star as 1 | 2 | 3 | 4 | 5;
        if (webStars[star] !== undefined) {
          webStars[star]++;
        }
      });

      return {
        id: web._id,
        webName: web.webName,
        webLink: web.webLink,
        active: web.active,
        totalRatings: webRatings.length,
        averageRating: webRatings.length > 0
          ? Number((webRatings.reduce((sum, r) => sum + r.star, 0) / webRatings.length).toFixed(1))
          : 0,
        stars: webStars,
      };
    });

    const recentReviews = [...ratings]
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 5);

    const monthNames = ["Jan", "Feb", "Mar", "April", "May", "June", "July", "August", "Sep", "Oct", "Nov", "Dec"];
    const monthlyRatings = monthNames.map((name, index) => {
      const count = ratings.filter((r) => {
        const date = new Date(r._creationTime);
        return date.getMonth() === index;
      }).length;
      return { month: name, count };
    });

    // Plan & Seat Usage calculations
    const branch = branchId ? await ctx.db.get(branchId) : null;
    const pkgId = (branch?.pricingPackageId || owner.pricingPackageId) as Id<"pricing"> | undefined;
    const pkg = pkgId ? await ctx.db.get(pkgId) : null;

    const maxUsers = pkg?.maxUsers ?? 0;
    const planName = pkg?.packageName || "Trial / Default Plan";

    let usedUsers = 0;
    if (owner) {
      const ownerIdStr = owner._id.toString();
      const allUsers = await ctx.db.query("users").collect();
      const activeCompanyUsers = allUsers.filter((u: any) => {
        if (u.active !== 1) return false;
        const isOwner = u._id === owner._id;
        const isChildOfOwner = u.cmpyid === ownerIdStr;
        return isOwner || isChildOfOwner;
      });
      usedUsers = activeCompanyUsers.length;
    } else {
      if (branchId) {
        const users = await ctx.db
          .query("users")
          .withIndex("by_branchId", (q: any) => q.eq("branchId", branchId))
          .collect();
        usedUsers = users.filter((u: any) => u.active === 1).length;
      }
    }

    return {
      totalReviews,
      averageRating,
      starDistribution,
      platformSummary,
      recentReviews,
      currentPlanName: planName,
      userUsage: {
        used: usedUsers,
        max: maxUsers,
      },
      quota: quotaRecord ? {
        smsQuota: quotaRecord.smsQuota,
        emailQuota: quotaRecord.emailQuota,
        whatsappQuota: quotaRecord.whatsappQuota,
        webQuota: quotaRecord.webQuota,
        balance: quotaRecord.balance,
        planId: quotaRecord.planId,
      } : null,
      user: {
        uname: caller.uname,
        email: caller.email,
        sub: caller.sub,
        formKey: caller.formKey,
        frameId: caller.frameId,
        id: caller._id,
        trialStatus: owner.trialStatus,
        trialStartDate: owner.trialStartDate,
        trialEndDate: owner.trialEndDate,
        pricingPackageId: owner.pricingPackageId,
      },
      monthlyRatings,
    };
  },
});

export const generateFrame = mutation({
  args: {
    userId: v.id("users"),
    formKey: v.string(),
    platforms: v.array(v.id("websites")),
  },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    enforceWriteAccess(caller);
    
    const user = await ctx.db.get(args.userId);
    if (!user || user.formKey !== args.formKey) throw new Error("Unauthorized");
    await enforceBranchAccess(ctx, user.branchId);

    const frameId = Math.floor(Math.random() * 100000000).toString(16);

    const allWebs = await ctx.db
      .query("websites")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("formKey"), args.formKey))
      .collect();

    for (const web of allWebs) {
      await ctx.db.patch(web._id, { frameId: "" });
    }

    await ctx.db.patch(args.userId, { frameId });

    for (const pid of args.platforms) {
      await ctx.db.patch(pid, { frameId });
    }

    await ctx.db.insert("activity", {
      userId: args.userId,
      actionType: "FRAME_CREATE",
      msg: `Frame created [ Username: ${user.uname}, FrameID: ${frameId} ]`,
      actTime: new Date().toUTCString(),
      branchId: user.branchId,
    });

    return { success: true, frameId };
  },
});

export const getWebsitesByFrameId = query({
  args: { frameId: v.string() },
  handler: async (ctx, args) => {
    if (!args.frameId || args.frameId === "") return [];
    const websites = await ctx.db
      .query("websites")
      .withIndex("by_frameId", (q) => q.eq("frameId", args.frameId))
      .filter((q) => q.eq(q.field("active"), 1))
      .collect();

    const filteredWebsites = [];
    for (const web of websites) {
      if (web.branchId) {
        const branch = await ctx.db.get(web.branchId);
        if (branch?.deleted) {
          continue;
        }
      }
      filteredWebsites.push(web);
    }
    return filteredWebsites;
  },
});
