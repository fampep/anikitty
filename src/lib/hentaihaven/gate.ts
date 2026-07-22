import { NextResponse } from "next/server";

/** Hard gate: adult catalog APIs require `adult=1`. */
export function requireAdultGate(
  searchParams: URLSearchParams,
): NextResponse | null {
  if (searchParams.get("adult") === "1") return null;
  return NextResponse.json(
    { error: "Adult content is disabled. Enable 18+ in Settings." },
    { status: 403 },
  );
}

export function adultJson(
  data: unknown,
  init?: { status?: number; headers?: HeadersInit },
) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: {
      "Cache-Control": "private, no-store",
      ...init?.headers,
    },
  });
}
