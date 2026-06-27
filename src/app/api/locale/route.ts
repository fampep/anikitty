import { NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const locale = body?.locale;

    if (!isLocale(locale)) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true, locale });
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
