import type { APIRoute } from "astro";

export const GET: APIRoute = async (context) => {
  const { userId } = context.locals.auth();
  return new Response(
    JSON.stringify({
      signedIn: !!userId,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
