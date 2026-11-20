// اللابتوب بيبلّغ: جاهز للموافقة، خلص، أو ما زبط. الملخّص بينحفظ بدون أرقام.
import { agentUseCases as A } from "@/modules/agent/server";

export const dynamic = "force-dynamic";
const REPORTS = ["READY_FOR_APPROVAL", "DONE", "FAILED"] as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!A.tokenOk(req.headers.get("authorization"))) return new Response("unauthorized", { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { report?: string; summary?: string } | null;
  const r = REPORTS.find((x) => x === body?.report);
  if (!r) return Response.json({ error: "report must be READY_FOR_APPROVAL | DONE | FAILED" }, { status: 400 });
  const res = await A.report(id, r, body?.summary);
  return res.ok ? Response.json(res.value) : Response.json({ error: res.message }, { status: 409 });
}
