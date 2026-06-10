import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

import { logger } from "@/utils/logger";

const isSignInPage = createRouteMatcher(["/login", "/register"]);
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/platform(.*)",
  "/share(.*)",
  "/report(.*)",
  "/account(.*)",
  "/admin(.*)",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const startTime = Date.now();
  const isAuthenticated = await convexAuth.isAuthenticated();

  let response;
  let status = 200;

  if (isSignInPage(request) && isAuthenticated) {
    status = 307;
    response = nextjsMiddlewareRedirect(request, "/dashboard");
  } else if (isProtectedRoute(request) && !isAuthenticated) {
    status = 307;
    response = nextjsMiddlewareRedirect(request, "/login");
  }

  const duration = Date.now() - startTime;
  logger.request(request.method, request.nextUrl.pathname, status, duration);

  return response;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
