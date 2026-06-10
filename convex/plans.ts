import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Queries
export const getPlans = query({
  handler: async (ctx) => {
    const plans = await ctx.db
      .query("plans")
      .filter((q) => q.eq(q.field("active"), 1))
      .collect();
    return plans.sort((a, b) => a.orderBy - b.orderBy);
  },
});

export const getAllPlans = query({
  handler: async (ctx) => {
    const plans = await ctx.db.query("plans").collect();
    return plans.sort((a, b) => a.orderBy - b.orderBy);
  },
});

export const getPlanDetails = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.planId);
  },
});

// Mutations
export const updatePlan = mutation({
  args: {
    planId: v.id("plans"),
    name: v.string(),
    amount: v.string(),
    per: v.string(),
    smsQuota: v.number(),
    emailQuota: v.number(),
    whatsappQuota: v.number(),
    webQuota: v.number(),
    orderBy: v.number(),
    active: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.planId, {
      name: args.name,
      amount: args.amount,
      per: args.per,
      smsQuota: args.smsQuota,
      emailQuota: args.emailQuota,
      whatsappQuota: args.whatsappQuota,
      webQuota: args.webQuota,
      orderBy: args.orderBy,
      active: args.active,
    });
    return true;
  },
});

export const addPlan = mutation({
  args: {
    name: v.string(),
    amount: v.string(),
    per: v.string(),
    smsQuota: v.number(),
    emailQuota: v.number(),
    whatsappQuota: v.number(),
    webQuota: v.number(),
    orderBy: v.number(),
    active: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("plans", {
      name: args.name,
      amount: args.amount,
      per: args.per,
      smsQuota: args.smsQuota,
      emailQuota: args.emailQuota,
      whatsappQuota: args.whatsappQuota,
      webQuota: args.webQuota,
      orderBy: args.orderBy,
      active: args.active,
    });
    return true;
  },
});

export const seedPlans = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete existing plans to allow clean seeding/re-seeding
    const existing = await ctx.db.query("plans").collect();
    for (const plan of existing) {
      await ctx.db.delete(plan._id);
    }

    const defaultPlans = [
      {
        name: "Essential",
        amount: "955",
        per: "+ GST Per Year",
        smsQuota: 0,
        emailQuota: 5,
        whatsappQuota: 5,
        webQuota: 5,
        orderBy: 1,
        active: 1,
      },
      {
        name: "Premium Plan",
        amount: "5550",
        per: "+ GST Per Year",
        smsQuota: 10,
        emailQuota: 10,
        whatsappQuota: 10,
        webQuota: 10,
        orderBy: 2,
        active: 1,
      },
      {
        name: "Premium Plus",
        amount: "9550",
        per: "+ GST Per Year",
        smsQuota: 20,
        emailQuota: 20,
        whatsappQuota: 20,
        webQuota: 20,
        orderBy: 3,
        active: 1,
      },
    ];

    for (const plan of defaultPlans) {
      await ctx.db.insert("plans", plan);
    }
    return { success: true, count: defaultPlans.length };
  },
});

export const seedDefaultPlans = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("plans").collect();
    if (existing.length === 0) {
      const defaultPlans = [
        {
          name: "Essential",
          amount: "955",
          per: "+ GST Per Year",
          smsQuota: 0,
          emailQuota: 5,
          whatsappQuota: 5,
          webQuota: 5,
          orderBy: 1,
          active: 1,
        },
        {
          name: "Premium Plan",
          amount: "5550",
          per: "+ GST Per Year",
          smsQuota: 10,
          emailQuota: 10,
          whatsappQuota: 10,
          webQuota: 10,
          orderBy: 2,
          active: 1,
        },
        {
          name: "Premium Plus",
          amount: "9550",
          per: "+ GST Per Year",
          smsQuota: 20,
          emailQuota: 20,
          whatsappQuota: 20,
          webQuota: 20,
          orderBy: 3,
          active: 1,
        },
      ];

      for (const plan of defaultPlans) {
        await ctx.db.insert("plans", plan);
      }
      return { seeded: true, count: defaultPlans.length };
    }
    return { seeded: false, count: existing.length };
  },
});
