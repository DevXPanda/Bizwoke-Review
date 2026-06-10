"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import crypto from "crypto";

export const createRazorpayOrder = action({
  args: {
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Razorpay configuration missing in environment variables.");
    }

    const amountInPaisa = Math.round(args.amount * 100);
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountInPaisa,
        currency: args.currency,
        receipt: `rcpt_${Date.now()}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Razorpay Order creation failed: ${errorText}`);
    }

    const order = await response.json();
    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  },
});

export const verifyRazorpayPayment = action({
  args: {
    userId: v.id("users"),
    formKey: v.string(),
    razorpayPaymentId: v.string(),
    razorpayOrderId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Razorpay configuration missing in environment variables.");
    }

    // 1. Verify signature
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(`${args.razorpayOrderId}|${args.razorpayPaymentId}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== args.razorpaySignature) {
      throw new Error("Invalid Razorpay payment signature.");
    }

    // 2. Fetch payment details
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1/payments/${args.razorpayPaymentId}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Razorpay Payment fetch failed: ${errorText}`);
    }

    const payment = await response.json();

    // 3. Save payment info inside Convex DB using mutation
    const paymentData = {
      userId: args.userId,
      formKey: args.formKey,
      paymentId: payment.id,
      orderId: payment.order_id,
      entity: payment.entity || "payment",
      amount: payment.amount / 100, // back to INR
      currency: payment.currency,
      status: payment.status,
      captured: payment.captured ? "true" : "false",
      mop: payment.method || "unknown",
      cardId: payment.card_id || undefined,
      bank: payment.bank || undefined,
      wallet: payment.wallet || undefined,
      vpa: payment.vpa || undefined,
      description: payment.description || undefined,
      email: payment.email || "",
      mobile: payment.contact || "",
      date: payment.created_at || Math.floor(Date.now() / 1000),
    };

    const success = await ctx.runMutation(api.transactions.savePaymentInfo, paymentData);
    return { success };
  },
});
