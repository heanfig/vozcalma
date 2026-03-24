import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);
const isAuthPageRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export const onRequest = clerkMiddleware((auth, context, next) => {
  const { userId, redirectToSignIn } = auth();

  if (isAuthPageRoute(context.request) && userId) {
    return Response.redirect(new URL("/app", context.request.url), 302);
  }

  if (!isProtectedRoute(context.request)) {
    return next();
  }
  if (!userId) {
    return redirectToSignIn();
  }
  return next();
});
