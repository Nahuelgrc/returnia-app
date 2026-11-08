import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "./auth.config"

const { auth } = NextAuth(authConfig)

const isDev = process.env.NODE_ENV !== "production"

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ")
}

export default auth(async (req) => {
  const authorized = await authConfig.callbacks.authorized({
    request: req,
    auth: req.auth,
  })

  if (authorized instanceof Response) {
    return authorized
  }

  if (!authorized) {
    const signInUrl = req.nextUrl.clone()
    signInUrl.pathname = "/login"
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href)
    return NextResponse.redirect(signInUrl)
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-nonce", nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", buildCsp(nonce))
  return response
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
