import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { enforceRoles } from "./authHelpers";

export const getPricingPackages = query({
  args: {},
  handler: async (ctx) => {
    // Accessible to all logged-in users to fetch pricing packages
    await enforceRoles(ctx, ["SUPER_ADMIN", "BRANCH_ADMIN", "BRANCH_USER"]);
    
    return await ctx.db
      .query("pricing")
      .collect();
  },
});

export const getActivePricingPackages = query({
  args: {},
  handler: async (ctx) => {
    // Public query accessible by anyone (unauthenticated, e.g. during registration)
    const packages = await ctx.db
      .query("pricing")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    return packages.sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

export const createPricingPackage = mutation({
  args: {
    packageName: v.string(),
    category: v.string(),
    price: v.number(),
    billingType: v.string(),
    featuresList: v.array(v.string()),
    displayOrder: v.number(),
    popularBadge: v.boolean(),
    status: v.string(),
    maxUsers: v.number(),
  },
  handler: async (ctx, args) => {
    await enforceRoles(ctx, ["SUPER_ADMIN"]);

    const now = Date.now();
    return await ctx.db.insert("pricing", {
      packageName: args.packageName,
      category: args.category,
      price: args.price,
      billingType: args.billingType,
      featuresList: args.featuresList,
      displayOrder: args.displayOrder,
      popularBadge: args.popularBadge,
      status: args.status,
      maxUsers: args.maxUsers,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePricingPackage = mutation({
  args: {
    id: v.id("pricing"),
    packageName: v.string(),
    category: v.string(),
    price: v.number(),
    billingType: v.string(),
    featuresList: v.array(v.string()),
    displayOrder: v.number(),
    popularBadge: v.boolean(),
    status: v.string(),
    maxUsers: v.number(),
  },
  handler: async (ctx, args) => {
    await enforceRoles(ctx, ["SUPER_ADMIN"]);

    const packageToUpdate = await ctx.db.get(args.id);
    if (!packageToUpdate) {
      throw new Error("Pricing package not found");
    }

    await ctx.db.patch(args.id, {
      packageName: args.packageName,
      category: args.category,
      price: args.price,
      billingType: args.billingType,
      featuresList: args.featuresList,
      displayOrder: args.displayOrder,
      popularBadge: args.popularBadge,
      status: args.status,
      maxUsers: args.maxUsers,
      updatedAt: Date.now(),
    });
  },
});

export const deletePricingPackage = mutation({
  args: {
    id: v.id("pricing"),
  },
  handler: async (ctx, args) => {
    await enforceRoles(ctx, ["SUPER_ADMIN"]);

    const packageToDelete = await ctx.db.get(args.id);
    if (!packageToDelete) {
      throw new Error("Pricing package not found");
    }

    await ctx.db.delete(args.id);
  },
});
