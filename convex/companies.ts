import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Queries
export const getCompanyInfo = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("companyDetails")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getCompanyBrandingByFormKey = query({
  args: { formKey: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_formKey", (q) => q.eq("formKey", args.formKey))
      .unique();
    if (!user) return null;

    const targetUserId = (user.iscmpy === 1 && user.cmpyid)
      ? (user.cmpyid as any)
      : user._id;

    return await ctx.db
      .query("companyDetails")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
      .first();
  },
});

// Mutations
export const updateCompanyDetails = mutation({
  args: {
    userId: v.id("users"),
    cmpyName: v.string(),
    cmpyMobile: v.string(),
    cmpyEmail: v.string(),
    cmpyLogo: v.optional(v.string()), // Convex Storage ID or URL
  },
  handler: async (ctx, args) => {
    let logoUrl = args.cmpyLogo;
    if (args.cmpyLogo && !args.cmpyLogo.startsWith("http")) {
      logoUrl = (await ctx.storage.getUrl(args.cmpyLogo)) || "";
    }

    const comp = await ctx.db
      .query("companyDetails")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!comp) {
      // Create new if not exist
      await ctx.db.insert("companyDetails", {
        userId: args.userId,
        cmpyName: args.cmpyName,
        cmpyMobile: args.cmpyMobile,
        cmpyEmail: args.cmpyEmail,
        cmpyLogo: logoUrl,
      });
    } else {
      // Update existing
      await ctx.db.patch(comp._id, {
        cmpyName: args.cmpyName,
        cmpyMobile: args.cmpyMobile,
        cmpyEmail: args.cmpyEmail,
        cmpyLogo: logoUrl || comp.cmpyLogo,
      });
    }

    // Update all users of this company
    const adminUser = await ctx.db.get(args.userId);
    if (adminUser) {
      // Update admin user
      await ctx.db.patch(args.userId, { cmpy: args.cmpyName });

      // Update all company sub-users
      const subUsers = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("cmpyid"), args.userId.toString()))
        .collect();
      
      for (const u of subUsers) {
        await ctx.db.patch(u._id, { cmpy: args.cmpyName });
      }
    }

    return true;
  },
});

// Generate upload url for logos
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});
