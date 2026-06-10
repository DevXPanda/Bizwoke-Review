"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import nodemailer from "nodemailer";
import { getAuthUserId } from "@convex-dev/auth/server";

async function validateActionCaller(ctx: any, targetUserId: any) {
  const callerId = await getAuthUserId(ctx);
  if (!callerId) {
    throw new Error("Unauthorized: Not logged in");
  }
  const caller = await ctx.runQuery(api.users.getProfile, { userId: callerId });
  if (!caller) {
    throw new Error("Unauthorized: User profile not found");
  }

  // Strictly read-only for BRANCH_USER
  if (caller.role === "BRANCH_USER") {
    throw new Error("Forbidden: Branch users are strictly read-only");
  }

  // Cross-branch validation
  if (caller.role !== "SUPER_ADMIN" && caller.role !== "sadmin") {
    const targetUser = await ctx.runQuery(api.users.getProfile, { userId: targetUserId });
    if (!targetUser || targetUser.branchId !== caller.branchId) {
      throw new Error("Forbidden: Cross-branch access denied");
    }
  }
  return caller;
}

export const sendVerificationEmail = internalAction({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || "no-reply@bizorm.com";

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured. Email not sent.");
      return { sent: false, reason: "missing_smtp_config" };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort || 587),
        secure: Number(smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: smtpFrom,
        to: args.email,
        subject: "Verify Your Bizorm Reviews Account",
        text: `Your account verification code is: ${args.code}\n\nPlease enter this code on the verification screen to activate your account.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #294a63; text-align: center;">Bizorm Reviews</h2>
            <p>Thank you for registering! Please verify your account by using the code below:</p>
            <div style="font-size: 24px; font-weight: bold; text-align: center; padding: 15px; margin: 20px 0; background-color: #f8fafc; border: 1px dashed #cbd5e1; color: #294a63; letter-spacing: 2px;">
              ${args.code}
            </div>
            <p>If you did not request this, you can safely ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b; text-align: center;">&copy; ${new Date().getFullYear()} Bizorm Reviews. All rights reserved.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      return { sent: true };
    } catch (error: any) {
      console.error(`[VERIFICATION EMAIL] Failed to send email: ${error.message}`);
      return { sent: false, error: error.message };
    }
  },
});

export const sendEmailCampaignAction = action({
  args: {
    userId: v.id("users"),
    to: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await validateActionCaller(ctx, args.userId);

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || "no-reply@bizorm.com";

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error("SMTP configuration is missing in environment variables.");
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort || 587),
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions = {
      from: smtpFrom,
      to: args.to,
      subject: args.subject,
      text: args.body,
      html: args.body.replace(/\n/g, "<br>"),
    };

    await transporter.sendMail(mailOptions);

    await ctx.runMutation(api.reviews.logSentLink, {
      userId: args.userId,
      linkFor: "email",
      sentToEmail: args.to,
      subj: args.subject,
      body: args.body,
    });

    await ctx.runMutation(api.quota.deductQuota, {
      userId: args.userId,
      quotaType: "emailQuota",
      amount: 1,
    });

    return { success: true };
  },
});

export const sendSMSCampaignAction = action({
  args: {
    userId: v.id("users"),
    mobile: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await validateActionCaller(ctx, args.userId);

    const smsUser = process.env.SMS_USER || "502893";
    const smsAuthkey = process.env.SMS_AUTHKEY || "926pJyyVe2aK";
    const smsSender = process.env.SMS_SENDER || "SSURVE";
    const smsEntityId = process.env.SMS_ENTITYID || "1001715674475461342";
    const smsTemplateId = process.env.SMS_TEMPLATEID || "1007838850146399750";

    const url = `http://savshka.in/api/pushsms?user=${smsUser}&authkey=${smsAuthkey}&sender=${smsSender}&mobile=${args.mobile}&text=${encodeURIComponent(args.body)}&entityid=${smsEntityId}&templateid=${smsTemplateId}&rpt=0`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`SMS gateway error: HTTP status ${response.status}`);
    }
    const result = await response.json();
    if (result.STATUS === "ERROR") {
      throw new Error(`SMS gateway returned error: ${result.RESPONSE?.INFO || "unknown error"}`);
    }

    await ctx.runMutation(api.reviews.logSentLink, {
      userId: args.userId,
      linkFor: "sms",
      sentToSms: args.mobile,
      body: args.body,
    });

    await ctx.runMutation(api.quota.deductQuota, {
      userId: args.userId,
      quotaType: "smsQuota",
      amount: 1,
    });

    return { success: true };
  },
});

export const sendBulkEmailCampaignAction = action({
  args: {
    userId: v.id("users"),
    emails: v.array(v.string()),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await validateActionCaller(ctx, args.userId);

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || "no-reply@bizorm.com";

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error("SMTP configuration is missing in environment variables.");
    }

    const qRecord = await ctx.runQuery(api.quota.getUserQuota, { userId: args.userId });
    if (!qRecord || qRecord.emailQuota < args.emails.length) {
      throw new Error(`Email quota not enough. Remaining: ${qRecord?.emailQuota ?? 0}, Required: ${args.emails.length}`);
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort || 587),
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    let successCount = 0;
    let failureCount = 0;
    const failures: string[] = [];

    for (const email of args.emails) {
      try {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error("Invalid email format");
        }

        const mailOptions = {
          from: smtpFrom,
          to: email.trim(),
          subject: args.subject,
          text: args.body,
          html: args.body.replace(/\n/g, "<br>"),
        };

        await transporter.sendMail(mailOptions);

        await ctx.runMutation(api.reviews.logSentLink, {
          userId: args.userId,
          linkFor: "email",
          sentToEmail: email.trim(),
          subj: args.subject,
          body: args.body,
        });

        await ctx.runMutation(api.quota.deductQuota, {
          userId: args.userId,
          quotaType: "emailQuota",
          amount: 1,
        });

        successCount++;
      } catch (err: any) {
        failureCount++;
        failures.push(`${email}: ${err.message || "unknown error"}`);
      }
    }

    return { successCount, failureCount, failures };
  },
});

export const sendBulkSMSCampaignAction = action({
  args: {
    userId: v.id("users"),
    mobiles: v.array(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await validateActionCaller(ctx, args.userId);

    const qRecord = await ctx.runQuery(api.quota.getUserQuota, { userId: args.userId });
    if (!qRecord || qRecord.smsQuota < args.mobiles.length) {
      throw new Error(`SMS quota not enough. Remaining: ${qRecord?.smsQuota ?? 0}, Required: ${args.mobiles.length}`);
    }

    const smsUser = process.env.SMS_USER || "502893";
    const smsAuthkey = process.env.SMS_AUTHKEY || "926pJyyVe2aK";
    const smsSender = process.env.SMS_SENDER || "SSURVE";
    const smsEntityId = process.env.SMS_ENTITYID || "1001715674475461342";
    const smsTemplateId = process.env.SMS_TEMPLATEID || "1007838850146399750";

    let successCount = 0;
    let failureCount = 0;
    const failures: string[] = [];

    for (const mobile of args.mobiles) {
      try {
        const phone = mobile.trim();
        if (phone.length !== 10 || !/^\d+$/.test(phone)) {
          throw new Error("Invalid phone number format (must be 10 digits)");
        }

        const url = `http://savshka.in/api/pushsms?user=${smsUser}&authkey=${smsAuthkey}&sender=${smsSender}&mobile=${phone}&text=${encodeURIComponent(args.body)}&entityid=${smsEntityId}&templateid=${smsTemplateId}&rpt=0`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`SMS gateway error: HTTP status ${response.status}`);
        }
        const result = await response.json();
        if (result.STATUS === "ERROR") {
          throw new Error(result.RESPONSE?.INFO || "unknown error");
        }

        await ctx.runMutation(api.reviews.logSentLink, {
          userId: args.userId,
          linkFor: "sms",
          sentToSms: phone,
          body: args.body,
        });

        await ctx.runMutation(api.quota.deductQuota, {
          userId: args.userId,
          quotaType: "smsQuota",
          amount: 1,
        });

        successCount++;
      } catch (err: any) {
        failureCount++;
        failures.push(`${mobile}: ${err.message || "unknown error"}`);
      }
    }

    return { successCount, failureCount, failures };
  },
});
