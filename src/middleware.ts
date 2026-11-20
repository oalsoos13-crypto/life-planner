import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, isValidToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const ok = await isValidToken(req.cookies.get(COOKIE)?.value);
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/agent|api/wa/webhook|_next|manifest.webmanifest|sw.js|icons|favicon.ico|offline.html).*)"],
};
