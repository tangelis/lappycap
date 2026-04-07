import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Protect dashboard routes only. Public routes (e.g. /login, /visualizer) stay reachable without a session.
 */
export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.warn("[middleware] AUTH_SECRET / NEXTAUTH_SECRET missing; allowing request (dev misconfiguration).");
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret });
  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
