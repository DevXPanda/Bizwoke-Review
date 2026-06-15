/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as branches from "../branches.js";
import type * as companies from "../companies.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as plans from "../plans.js";
import type * as pricing from "../pricing.js";
import type * as quota from "../quota.js";
import type * as razorpay from "../razorpay.js";
import type * as reviews from "../reviews.js";
import type * as settings from "../settings.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  branches: typeof branches;
  companies: typeof companies;
  email: typeof email;
  http: typeof http;
  plans: typeof plans;
  pricing: typeof pricing;
  quota: typeof quota;
  razorpay: typeof razorpay;
  reviews: typeof reviews;
  settings: typeof settings;
  transactions: typeof transactions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
