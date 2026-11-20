// دخول بكلمة سر وحدة (APP_PASSWORD). الكوكي فيها توقيع HMAC، بتشتغل بالـ middleware كمان.
export const COOKIE = "lp_session";

async function hmac(message: string): Promise<string> {
  const secret = process.env.AUTH_SECRET || "change-me";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sessionToken(): Promise<string> {
  return hmac("session:" + (process.env.APP_PASSWORD || ""));
}

// مقارنة ثابتة الوقت (ما بتكشف كم حرف صح من سرعة الرد)
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function passwordMatches(pw: string): Promise<boolean> {
  const real = process.env.APP_PASSWORD;
  if (!real) return false;
  // منقارن البصمات مش النص نفسه، فطول كلمة السر ما بيبيّن
  return safeEqual(await hmac("pw:" + pw), await hmac("pw:" + real));
}

// الرمز مشتق من كلمة السر، فلما تبدّلها كل الجلسات القديمة بتسقط لحالها
export async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token || !process.env.APP_PASSWORD) return false;
  return safeEqual(token, await sessionToken());
}
