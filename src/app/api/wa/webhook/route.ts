// Webhook واتساب بزنس (Meta Cloud API). برّا تسجيل الدخول لأنه Meta بتناديه، بس كل طلب لازم توقيعه صح.
import { outreachUseCases as O } from "@/modules/outreach/server";
import { parseWaWebhook } from "@/modules/outreach";

export const dynamic = "force-dynamic";

/** تحقّق Meta وقت ربط الـ webhook */
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (!O.verifyChallenge(u.searchParams.get("hub.mode"), u.searchParams.get("hub.verify_token"))) return new Response("forbidden", { status: 403 });
  return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!O.signatureOk(raw, req.headers.get("x-hub-signature-256"))) return new Response("bad signature", { status: 401 });
  let body: unknown = null;
  try { body = JSON.parse(raw); } catch { return new Response("ok"); }
  await O.handleIncoming(parseWaWebhook(body));
  return new Response("ok");
}
