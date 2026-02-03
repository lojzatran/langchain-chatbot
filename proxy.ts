import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/:path*"],
};

export function proxy(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  console.log("Middleware IP:", ip);
  const url = req.nextUrl;

  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const basicAuth = req.headers.get("authorization");

  if (basicAuth) {
    try {
      const authValue = basicAuth.split(" ")[1];
      const decoded = atob(authValue || "");
      const [user, pwd] = decoded.split(":");

      const validUser = process.env.BASIC_AUTH_USER;
      const validPassWord = process.env.BASIC_AUTH_PASSWORD;

      if (
        validUser &&
        validPassWord &&
        user === validUser &&
        pwd === validPassWord
      ) {
        return NextResponse.next();
      }
    } catch (e) {
      console.error("Auth error:", e);
    }
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Restricted Area"',
    },
  });
}
