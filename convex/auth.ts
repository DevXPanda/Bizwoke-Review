import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import bcrypt from "bcryptjs";
import { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      validatePasswordRequirements(password: string) {
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long");
        }
      },
      crypto: {
        async hashSecret(secret: string) {
          return bcrypt.hashSync(secret, 10);
        },
        async verifySecret(secret: string, hash: string) {
          return bcrypt.compareSync(secret, hash);
        },
      },
      profile(params) {
        let role = "BRANCH_USER";
        let sadmin = 0;
        let admin = 0;
        if (params.uname === "sadmin") {
          sadmin = 1;
          role = "SUPER_ADMIN";
        } else if (params.isCompanyAdmin === "true" || params.isCompanyAdmin === true) {
          admin = 1;
          role = "BRANCH_ADMIN";
        }
        return {
          email: params.email as string,
          uname: params.uname as string,
          fname: params.fname as string,
          lname: params.lname as string,
          mobile: params.mobile as string,
          role,
          sadmin,
          admin,
          iscmpy: params.cmpy ? 1 : 0,
          cmpy: params.cmpy as string,
          // Temporary fields for quota setup
          tempSmsQuota: Number(params.smsQuota ?? 0),
          tempEmailQuota: Number(params.emailQuota ?? 0),
          tempWhatsappQuota: Number(params.whatsappQuota ?? 0),
          tempWebQuota: Number(params.webQuota ?? 0),
          tempAmount: Number(params.amount ?? 0),
          pricingPackageId: (params.pricingPackageId as string) ?? "",
        };
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx: MutationCtx, args) {
      if (args.existingUserId) {
        return args.existingUserId;
      }

      const profile = args.profile as any;

      // Check username duplicate
      const existingUname = await ctx.db
        .query("users")
        .withIndex("by_uname", (q) => q.eq("uname", profile.uname))
        .first();
      if (existingUname) {
        throw new Error("This username is taken");
      }

      // Check company duplicate
      if (profile.cmpy) {
        const existingCmpy = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("cmpy"), profile.cmpy))
          .first();
        if (existingCmpy) {
          throw new Error("This Company already exists");
        }
      }

      const unameForm = profile.uname.replace(/[\s.,?&]/g, "_").toLowerCase().substring(0, 5);
      const formKey = unameForm + Math.floor(Math.random() * 100000);
      const actKey = Math.floor(Math.random() * 1000000).toString();
      const actKeyHash = bcrypt.hashSync(actKey, 10);

      let smsQuota = profile.tempSmsQuota ?? 0;
      let emailQuota = profile.tempEmailQuota ?? 0;
      let whatsappQuota = profile.tempWhatsappQuota ?? 0;
      let webQuota = profile.tempWebQuota ?? 0;
      let amount = profile.tempAmount ?? 0;
      let parsedPackageId: Id<"pricing"> | undefined = undefined;
      let trialStartDate = undefined;
      let trialEndDate = undefined;
      let trialStatus = undefined;

      const profilePackageId = profile.pricingPackageId;
      if (profilePackageId && typeof profilePackageId === "string" && profilePackageId !== "") {
        try {
          const pkg = await ctx.db.get(profilePackageId as Id<"pricing">);
          if (pkg) {
            amount = pkg.price ?? 0;
            parsedPackageId = pkg._id;
            trialStartDate = Date.now();
            trialEndDate = Date.now() + 3 * 24 * 60 * 60 * 1000;
            trialStatus = "active";

            // Dynamic quota mapping
            const nameLower = pkg.packageName.toLowerCase();
            if (nameLower.includes("plus") || pkg.price >= 9000) {
              smsQuota = 20;
              emailQuota = 20;
              whatsappQuota = 20;
              webQuota = 20;
            } else if (nameLower.includes("premium") || nameLower.includes("gold") || pkg.price >= 5000) {
              smsQuota = 10;
              emailQuota = 10;
              whatsappQuota = 10;
              webQuota = 10;
            } else {
              smsQuota = 0;
              emailQuota = 5;
              whatsappQuota = 5;
              webQuota = 5;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // Create new user in Convex DB
      const userId = await ctx.db.insert("users", {
        email: profile.email,
        uname: profile.uname,
        fname: profile.fname,
        lname: profile.lname,
        mobile: profile.mobile,
        role: profile.role,
        sadmin: profile.sadmin,
        admin: profile.admin,
        iscmpy: profile.iscmpy,
        cmpy: profile.cmpy,
        active: 0, // 0 = Unverified, verified in emailverify view
        websiteForm: 0,
        sub: 0,
        actKey: actKeyHash,
        formKey: formKey,
        frameId: "",
        latestActivity: new Date().toUTCString(),
        pricingPackageId: parsedPackageId,
        trialStartDate,
        trialEndDate,
        trialStatus,
      });

      // Initialize Quota
      await ctx.db.insert("quota", {
        byUserId: userId,
        smsQuota: smsQuota,
        emailQuota: emailQuota,
        whatsappQuota: whatsappQuota,
        webQuota: webQuota,
        byFormKey: formKey,
        amount: amount,
        balance: amount,
      });

      // Create company details if admin
      if (profile.admin === 1 && profile.cmpy) {
        await ctx.db.insert("companyDetails", {
          userId,
          cmpyName: profile.cmpy,
          cmpyMobile: "",
          cmpyEmail: "",
          cmpyLogo: "",
        });
      }

      // Log activity
      await ctx.db.insert("activity", {
        userId,
        actionType: "REGISTER",
        msg: `New user registration [ Username: ${profile.uname}, Email: ${profile.email} ]`,
        actTime: new Date().toUTCString(),
      });

      // Schedule verification email dispatch
      await ctx.scheduler.runAfter(0, internal.email.sendVerificationEmail, {
        email: profile.email,
        code: actKey,
      });

      // Schedule welcome trial email dispatch
      if (parsedPackageId) {
        const pkg = await ctx.db.get(parsedPackageId);
        if (pkg) {
          await ctx.scheduler.runAfter(0, internal.email.sendWelcomeTrialEmail, {
            email: profile.email,
            packageName: pkg.packageName,
            trialEndDate: trialEndDate!,
            smsQuota,
            emailQuota,
            whatsappQuota,
            webQuota,
            maxUsers: pkg.maxUsers,
          });
        }
      }

      return userId;
    },
  },
});
