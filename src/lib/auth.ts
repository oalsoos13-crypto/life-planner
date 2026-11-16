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

export async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token || !process.env.APP_PASSWORD) return false;
  return token === (await sessionToken());
}
