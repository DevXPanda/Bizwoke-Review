import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  branches: defineTable({
    name: v.string(),
    code: v.string(), // Unique branch identifier
    active: v.number(), // 1 = Active, 0 = Inactive
    cmpyName: v.optional(v.string()), // Company branding for the branch
    deleted: v.optional(v.boolean()), // Soft-delete flag
    pricingPackageId: v.optional(v.id("pricing")),
  })
    .index("by_code", ["code"])
    .index("by_deleted", ["deleted"]),

  users: defineTable({
    // Convex Auth fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.string(), // Verified email, required in our app
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    
    // Custom legacy fields
    role: v.string(), // "SUPER_ADMIN" | "BRANCH_ADMIN" | "BRANCH_USER" | "sadmin" | "admin" | "user"
    sadmin: v.number(), // 1 = Super Admin, 0 = Regular/Admin
    admin: v.number(), // 1 = Company Admin, 0 = Regular/Sub-user
    iscmpy: v.number(), // 1 = Company associated, 0 = Standalone
    cmpy: v.optional(v.string()), // Company Name
    cmpyid: v.optional(v.string()), // Parent company admin user ID reference (as string)
    uname: v.string(), // Unique login username
    fname: v.optional(v.string()),
    lname: v.optional(v.string()),
    mobile: v.string(), // String mobile numbers
    gender: v.optional(v.string()),
    dob: v.optional(v.string()),
    active: v.number(), // Status: 1 = Active, 0 = Unverified, 2 = Suspended
    websiteForm: v.number(), // 1 = Setup platform, 0 = Pending
    sub: v.number(), // 1 = Active subscription, 0 = Inactive
    actKey: v.string(), // verification code hash
    formKey: v.string(), // unique client rating URL code
    frameId: v.string(), // current frame config hash
    password: v.optional(v.string()), // hashed password (BCrypt) for legacy validations
    latestActivity: v.string(),
    url: v.optional(v.string()), // legacy redirect URL
    
    // RBAC branch relation
    branchId: v.optional(v.id("branches")),

    // Trial and pricing integration
    pricingPackageId: v.optional(v.id("pricing")),
    trialStartDate: v.optional(v.number()),
    trialEndDate: v.optional(v.number()),
    trialStatus: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_uname", ["uname"])
    .index("by_formKey", ["formKey"])
    .index("by_frameId", ["frameId"])
    .index("by_branchId", ["branchId"]), // Branch relation index

  companyDetails: defineTable({
    userId: v.id("users"), // Owner company admin user ID
    cmpyName: v.string(),
    cmpyMobile: v.optional(v.string()),
    cmpyEmail: v.optional(v.string()),
    cmpyLogo: v.optional(v.string()), // Convex Storage ID pointing to company logo file
    branchId: v.optional(v.id("branches")),
  })
    .index("by_userId", ["userId"])
    .index("by_branchId", ["branchId"]),

  ratings: defineTable({
    userIp: v.string(),
    star: v.number(), // rating 1 to 5
    review: v.optional(v.string()),
    name: v.string(),
    mobile: v.string(), // String mobile numbers
    webName: v.string(),
    webLink: v.string(),
    formKey: v.string(), // references users.formKey
    branchId: v.optional(v.id("branches")),
    surveyCompleted: v.optional(v.boolean()),
  })
    .index("by_formKey", ["formKey"])
    .index("by_branchId", ["branchId"])
    .index("by_formKey_star", ["formKey", "star"]) // Rating analytics index
    .index("by_formKey_webName_star", ["formKey", "webName", "star"]), // Rating analytics index

  sentLinks: defineTable({
    linkFor: v.string(), // "email" | "sms" | "whatsapp"
    sentToSms: v.optional(v.string()),
    sentToEmail: v.optional(v.string()),
    subj: v.optional(v.string()),
    body: v.string(),
    userId: v.id("users"),
    branchId: v.optional(v.id("branches")),
  })
    .index("by_userId", ["userId"])
    .index("by_branchId", ["branchId"]),

  transactions: defineTable({
    userId: v.id("users"),
    formKey: v.string(),
    paymentId: v.string(), // Razorpay payment ID
    orderId: v.string(), // Razorpay order ID
    transactionId: v.optional(v.string()), // Bank txn ID
    rrn: v.optional(v.string()),
    entity: v.optional(v.string()),
    amount: v.number(), // payment amount (INR)
    currency: v.string(),
    status: v.string(),
    captured: v.string(),
    mop: v.string(), // method of payment
    cardId: v.optional(v.string()),
    bank: v.optional(v.string()),
    wallet: v.optional(v.string()),
    vpa: v.optional(v.string()),
    description: v.optional(v.string()),
    email: v.string(),
    mobile: v.string(),
    date: v.number(), // epoch timestamp
    branchId: v.optional(v.id("branches")),
  })
    .index("by_paymentId", ["paymentId"])
    .index("by_userId", ["userId"])
    .index("by_branchId", ["branchId"]),

  plans: defineTable({
    name: v.string(),
    amount: v.string(),
    per: v.string(),
    smsQuota: v.number(), // Numeric quotas
    emailQuota: v.number(), // Numeric quotas
    whatsappQuota: v.number(), // Numeric quotas
    webQuota: v.number(), // Numeric quotas
    orderBy: v.number(),
    active: v.number(), // 1 = Active, 0 = Disabled
  }),

  quota: defineTable({
    byUserId: v.id("users"),
    smsQuota: v.number(),
    emailQuota: v.number(),
    whatsappQuota: v.number(),
    webQuota: v.number(),
    byFormKey: v.string(),
    planId: v.optional(v.number()),
    amount: v.optional(v.number()),
    balance: v.optional(v.number()),
    branchId: v.optional(v.id("branches")),
  })
    .index("by_userId", ["byUserId"])
    .index("by_branchId", ["branchId"]),

  settings: defineTable({
    siteName: v.string(),
    siteTitle: v.string(),
    siteDesc: v.string(),
    siteKeywords: v.string(),
    siteLogo: v.optional(v.string()), // Convex Storage ID
    siteFavIcon: v.optional(v.string()), // Convex Storage ID
    captchaSiteKey: v.string(),
    protocol: v.string(), // e.g. "smtp"
  }),

  contact: defineTable({
    name: v.string(),
    userMail: v.string(),
    bdy: v.string(),
  }),

  activity: defineTable({
    userId: v.optional(v.id("users")), // Improved activity log
    ipAddress: v.optional(v.string()), // Improved activity log
    actionType: v.optional(v.string()), // Improved activity log
    msg: v.string(),
    actTime: v.string(),
    branchId: v.optional(v.id("branches")),
  })
    .index("by_userId", ["userId"])
    .index("by_actionType", ["actionType"])
    .index("by_branchId", ["branchId"]),

  websites: defineTable({
    userId: v.id("users"),
    formKey: v.string(),
    webName: v.string(),
    webLink: v.string(),
    active: v.number(), // 1 = Active, 0 = Inactive
    subject: v.optional(v.string()),
    description: v.optional(v.string()),
    totalRatings: v.number(),
    starRating: v.number(),
    frameId: v.string(),
    icon: v.string(),
    logo: v.optional(v.string()), // Convex Storage ID
    branchId: v.optional(v.id("branches")),
  })
    .index("by_userId", ["userId"])
    .index("by_formKey", ["formKey"])
    .index("by_frameId", ["frameId"])
    .index("by_branchId", ["branchId"]), // FrameId index on websites

  pricing: defineTable({
    packageName: v.string(),
    category: v.string(),
    price: v.number(),
    billingType: v.string(), // e.g. "Monthly" | "Yearly" | "Lifetime"
    featuresList: v.array(v.string()), // dynamic features list
    displayOrder: v.number(),
    popularBadge: v.boolean(),
    status: v.string(), // "active" | "inactive"
    maxUsers: v.number(),
    createdAt: v.number(), // epoch timestamp
    updatedAt: v.number(), // epoch timestamp
  })
    .index("by_status", ["status"])
    .index("by_displayOrder", ["displayOrder"]),

  surveyQuestions: defineTable({
    questionText: v.string(),
    orderBy: v.number(),
    active: v.number(), // 1 = Active, 0 = Inactive
  }),

  surveyAnswers: defineTable({
    ratingId: v.id("ratings"),
    questionId: v.id("surveyQuestions"),
    score: v.number(), // 1 to 5
    branchId: v.optional(v.id("branches")),
  })
    .index("by_ratingId", ["ratingId"])
    .index("by_questionId", ["questionId"])
    .index("by_branchId", ["branchId"]),
});
