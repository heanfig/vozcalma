import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";

const isAuthPageRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export const onRequest = clerkMiddleware((auth, context, next) => {
  const { userId } = auth();

  if (isAuthPageRoute(context.request) && userId) {
    return context.redirect("/", 302);
  }

  return next();
});
