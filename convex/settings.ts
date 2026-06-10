import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Queries
export const getSettings = query({
  handler: async (ctx) => {
    const s = await ctx.db.query("settings").first();
    if (!s) {
      // Return default parameters if empty
      return {
        siteName: "Bizorm Reviews",
        siteTitle: "Bizorm Reviews Management SaaS",
        siteDesc: "Review and Feedback management system",
        siteKeywords: "reviews, feedback, stars, ratings",
        siteLogo: "",
        siteFavIcon: "",
        captchaSiteKey: "6Lec4E4aAAAAAJT5safjmk0rJsc27feWrQgFwq50",
        protocol: "smtp",
      };
    }
    return s;
  },
});

// Mutations
export const updateSettings = mutation({
  args: {
    siteName: v.string(),
    siteTitle: v.string(),
    siteDesc: v.string(),
    siteKeywords: v.string(),
    siteLogo: v.optional(v.string()), // Convex Storage ID
    siteFavIcon: v.optional(v.string()), // Convex Storage ID
    captchaSiteKey: v.string(),
    protocol: v.string(),
  },
  handler: async (ctx, args) => {
    const s = await ctx.db.query("settings").first();

    if (!s) {
      await ctx.db.insert("settings", args);
    } else {
      await ctx.db.patch(s._id, {
        siteName: args.siteName,
        siteTitle: args.siteTitle,
        siteDesc: args.siteDesc,
        siteKeywords: args.siteKeywords,
        siteLogo: args.siteLogo || s.siteLogo,
        siteFavIcon: args.siteFavIcon || s.siteFavIcon,
        captchaSiteKey: args.captchaSiteKey,
        protocol: args.protocol,
      });
    }
    return true;
  },
});

export const createContact = mutation({
  args: {
    name: v.string(),
    userMail: v.string(),
    bdy: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("contact", {
      name: args.name,
      userMail: args.userMail,
      bdy: args.bdy,
    });
    return true;
  },
});
