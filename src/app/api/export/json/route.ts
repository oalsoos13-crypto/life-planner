import { dumpAll } from "@/lib/backup";

export async function GET() {
  const data = await dumpAll();
  const name = `khutati-backup-${data.exportedAt.slice(0, 10)}.json`;
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
}
