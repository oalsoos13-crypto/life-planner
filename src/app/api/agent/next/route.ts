// اللابتوب بيسأل عن المهمة الجاية. توكن AGENT_TOKEN بس (بمتغيّرات السيرفر وعلى اللابتوب)، مش كوكي الدخول.
import { agentUseCases as A } from "@/modules/agent/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!A.tokenOk(req.headers.get("authorization"))) return new Response("unauthorized", { status: 401 });
  const job = await A.claimNext();
  return Response.json({ job });
}
