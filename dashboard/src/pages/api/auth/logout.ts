import type { APIRoute } from "astro";
import { lucia } from "@/lib/auth";
import { deleteCsrfToken } from "@/lib/csrf";
import { redis } from "@/lib/redis";

export const POST: APIRoute = async ({ locals, cookies }) => {
  if (!locals.session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sessionId = locals.session.id;

  // セッションを無効化
  await lucia.invalidateSession(sessionId);

  // Redisからセッションデータを削除
  await redis.del(`app:session:${sessionId}`);

  // CSRFトークンを削除
  await deleteCsrfToken(sessionId);

  // Cookieをクリア
  const sessionCookie = lucia.createBlankSessionCookie();
  cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

  return Response.redirect(new URL("/", locals.url.origin), 302);
};
