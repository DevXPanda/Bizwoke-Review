import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { validateUser, enforceRoles, getBranchFilterId } from "./authHelpers";
import { Id } from "./_generated/dataModel";

// Get active questions (Client-facing survey form)
export const getActiveQuestions = query({
  args: {},
  handler: async (ctx) => {
    const questions = await ctx.db.query("surveyQuestions").collect();
    return questions
      .filter((q) => q.active === 1)
      .sort((a, b) => a.orderBy - b.orderBy);
  },
});

// Get all questions (Super Admin settings management)
export const getAllQuestions = query({
  args: {},
  handler: async (ctx) => {
    const caller = await validateUser(ctx);
    if (caller.sadmin !== 1) {
      throw new Error("Forbidden: Super Admin only");
    }
    const questions = await ctx.db.query("surveyQuestions").collect();
    return questions.sort((a, b) => a.orderBy - b.orderBy);
  },
});

// Seed default questions
export const seedSurveyQuestions = mutation({
  args: { forceReset: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.forceReset) {
      const existing = await ctx.db.query("surveyQuestions").collect();
      for (const q of existing) {
        await ctx.db.delete(q._id);
      }
      const answers = await ctx.db.query("surveyAnswers").collect();
      for (const a of answers) {
        await ctx.db.delete(a._id);
      }
    } else {
      const existing = await ctx.db.query("surveyQuestions").collect();
      if (existing.length > 0) return false;
    }

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
    return true;
  },
});

// Create question
export const createQuestion = mutation({
  args: { questionText: v.string() },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    if (caller.sadmin !== 1) {
      throw new Error("Forbidden: Super Admin only");
    }
    const questions = await ctx.db.query("surveyQuestions").collect();
    const maxOrder = questions.reduce((max, q) => q.orderBy > max ? q.orderBy : max, 0);

    return await ctx.db.insert("surveyQuestions", {
      questionText: args.questionText.trim(),
      orderBy: maxOrder + 1,
      active: 1,
    });
  },
});

// Update question
export const updateQuestion = mutation({
  args: {
    id: v.id("surveyQuestions"),
    questionText: v.optional(v.string()),
    orderBy: v.optional(v.number()),
    active: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    if (caller.sadmin !== 1) {
      throw new Error("Forbidden: Super Admin only");
    }
    const question = await ctx.db.get(args.id);
    if (!question) throw new Error("Question not found");

    const patch: any = {};
    if (args.questionText !== undefined) patch.questionText = args.questionText.trim();
    if (args.orderBy !== undefined) patch.orderBy = args.orderBy;
    if (args.active !== undefined) patch.active = args.active;

    await ctx.db.patch(args.id, patch);
    return true;
  },
});

// Reorder questions
export const reorderQuestions = mutation({
  args: {
    orderedIds: v.array(v.id("surveyQuestions")),
  },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    if (caller.sadmin !== 1) {
      throw new Error("Forbidden: Super Admin only");
    }
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], {
        orderBy: i + 1,
      });
    }
    return true;
  },
});

// Delete question
export const deleteQuestion = mutation({
  args: { id: v.id("surveyQuestions") },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    if (caller.sadmin !== 1) {
      throw new Error("Forbidden: Super Admin only");
    }
    
    // 1. Delete the question
    await ctx.db.delete(args.id);
    
    // 2. Cascade delete answers
    const answers = await ctx.db
      .query("surveyAnswers")
      .withIndex("by_questionId", (q) => q.eq("questionId", args.id))
      .collect();
    for (const ans of answers) {
      await ctx.db.delete(ans._id);
    }
    
    return true;
  },
});

// Submit survey answers (Step 2)
export const submitSurvey = mutation({
  args: {
    ratingId: v.id("ratings"),
    answers: v.array(
      v.object({
        questionId: v.id("surveyQuestions"),
        score: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const rating = await ctx.db.get(args.ratingId);
    if (!rating) throw new Error("Rating record not found");

    // Save every answer separately
    for (const ans of args.answers) {
      await ctx.db.insert("surveyAnswers", {
        ratingId: args.ratingId,
        questionId: ans.questionId,
        score: ans.score,
        branchId: rating.branchId,
      });
    }

    // Update rating survey status to completed
    await ctx.db.patch(args.ratingId, {
      surveyCompleted: true,
    });

    return true;
  },
});

// Get Survey Analytics
export const getSurveyAnalytics = query({
  args: {
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const caller = await validateUser(ctx);
    
    // Resolve branch isolation
    let targetBranchId: Id<"branches"> | undefined = undefined;
    
    const branchFilter = getBranchFilterId(caller, args.branchId);
    if (branchFilter) {
      targetBranchId = branchFilter;
    }

    // 1. Fetch questions to map IDs to text
    const questions = await ctx.db.query("surveyQuestions").collect();
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q.questionText]));

    // 2. Fetch answers
    const allAnswers = await (targetBranchId
      ? ctx.db.query("surveyAnswers").withIndex("by_branchId", (q) => q.eq("branchId", targetBranchId)).collect()
      : ctx.db.query("surveyAnswers").collect());

    // 3. Calculate aggregates per question
    const questionStats: Record<string, { totalScore: number; count: number; text: string }> = {};
    for (const q of questions) {
      questionStats[q._id.toString()] = {
        totalScore: 0,
        count: 0,
        text: q.questionText,
      };
    }

    for (const ans of allAnswers) {
      const qIdStr = ans.questionId.toString();
      if (questionStats[qIdStr]) {
        questionStats[qIdStr].totalScore += ans.score;
        questionStats[qIdStr].count += 1;
      }
    }

    const questionAverages = Object.entries(questionStats)
      .map(([id, stats]) => ({
        id,
        text: stats.text,
        average: stats.count > 0 ? Number((stats.totalScore / stats.count).toFixed(2)) : 0,
        count: stats.count,
      }))
      .filter((q) => q.text);

    // 4. Fetch survey completion logs (history)
    const completedRatings = await (targetBranchId
      ? ctx.db.query("ratings").withIndex("by_branchId", (q) => q.eq("branchId", targetBranchId)).filter((q) => q.eq(q.field("surveyCompleted"), true)).collect()
      : ctx.db.query("ratings").filter((q) => q.eq(q.field("surveyCompleted"), true)).collect());

    // Latest 10 completed surveys
    const sortedRatings = completedRatings
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 10);

    const history = [];
    for (const rating of sortedRatings) {
      const ratingAnswers = allAnswers.filter((ans) => ans.ratingId === rating._id);
      const answersDetail = ratingAnswers.map((ans) => ({
        questionId: ans.questionId.toString(),
        questionText: questionMap.get(ans.questionId.toString()) || "Deleted Question",
        score: ans.score,
      }));

      history.push({
        ratingId: rating._id,
        name: rating.name,
        mobile: rating.mobile,
        star: rating.star,
        review: rating.review,
        webName: rating.webName,
        date: rating._creationTime,
        answers: answersDetail,
      });
    }

    // 5. Total overall index
    const totalScore = allAnswers.reduce((sum, ans) => sum + ans.score, 0);
    const totalCount = allAnswers.length;
    const overallAverage = totalCount > 0 ? Number((totalScore / totalCount).toFixed(2)) : 0;

    return {
      questionAverages,
      history,
      overallAverage,
      totalSurveys: completedRatings.length,
    };
  },
});
