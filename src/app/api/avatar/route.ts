// موديل الشخصية الخاص (GLB من صور عمر). بيضل بتخزين خاص؛ الرابط والتوكن بمتغيّرات السيرفر بس،
// وهالمسار ورا تسجيل الدخول (middleware). الريبو عام، فما في أي صورة أو موديل فيه.
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.AVATAR_MODEL_URL;
  if (!url) return new Response("no model", { status: 404 });
  const token = process.env.AVATAR_MODEL_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
  const res = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {}, cache: "no-store" });
  if (!res.ok || !res.body) return new Response("model unavailable", { status: 502 });
  return new Response(res.body, {
    headers: { "content-type": "model/gltf-binary", "cache-control": "private, max-age=86400" },
  });
}
