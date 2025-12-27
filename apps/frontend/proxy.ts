import { NextResponse, type NextRequest } from "next/server";

const USER = process.env.FRONTEND_AUTH_USER || "root";
const PASS = process.env.FRONTEND_AUTH_PASS || "root";

const PUBLIC_PATHS = ["/favicon.ico", "/robots.txt", "/sitemap.xml"];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/public")) return true;
  return false;
}

export function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": "Basic realm=\"Film Queue\"",
      },
    });
  }

  const base64 = authHeader.slice("Basic ".length).trim();
  const decoded = Buffer.from(base64, "base64").toString("utf8");
  const [user, pass] = decoded.split(":");

  if (user !== USER || pass !== PASS) {
    return new NextResponse("Invalid credentials", {
      status: 401,
      headers: {
        "WWW-Authenticate": "Basic realm=\"Film Queue\"",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
