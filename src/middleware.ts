import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";
import { requireAdminPage } from "./lib/admin-auth";

const isAuthPageRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export const onRequest = clerkMiddleware((auth, context, next) => {
  const { userId } = auth();

  if (isAuthPageRoute(context.request) && userId) {
    return context.redirect("/", 302);
  }

  const url = new URL(context.request.url);
  const pathname = url.pathname;
  const isAdminPage =
    pathname.startsWith("/admin") && !pathname.startsWith("/api/admin");
  if (isAdminPage) {
    const gate = requireAdminPage(context.cookies, pathname);
    if (gate.redirect) {
      return context.redirect(gate.redirect, 302);
    }
  }

  return next();
});
