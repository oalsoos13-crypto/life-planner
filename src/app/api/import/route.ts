import { restoreAll } from "@/lib/backup";

export async function POST(req: Request) {
  try {
    await restoreAll(await req.json());
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String((e as Error).message) }, { status: 400 });
  }
}
