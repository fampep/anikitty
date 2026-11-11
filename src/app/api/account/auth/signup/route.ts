import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { buildAuthResponse } from "@/lib/auth/auth-response";
import { jsonWithAuthCookie } from "@/lib/auth/auth-cookie";
import {
  findSignupConflict,
  hashPassword,
} from "@/lib/auth/local-auth";
import {
  generatePassphrase,
  normalizePassphrase,
  passphraseToCredentials,
} from "@/lib/auth/passphrase";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";
import { assertAuthSecretsConfigured } from "@/lib/security/security";
import { isOpenSignupsEnabled, SIGNUPS_CLOSED_MESSAGE } from "@/lib/auth/open-signups";

async function createFromPassphrase(passphrase: string) {
  const { email, password, username } = await passphraseToCredentials(passphrase);
  const conflict = await findSignupConflict(username, email);
  if (conflict) {
    // Same derived identity → treat as already registered (client should sign in).
    if (conflict.email === email) {
      return { conflict: "exists" as const };
    }
    return { conflict: "username" as const };
  }

  const db = getDb();
  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({
      username,
      email,
      passwordHash,
      passwordSetAt: new Date(),
    })
    .returning();

  const { grantWelcomeKittycoins } = await import("@/lib/shop/kittycoins");
  await grantWelcomeKittycoins(db, user.id);

  return { user };
}

export async function POST(req: Request) {
  const misconfigured = assertAuthSecretsConfigured();
  if (misconfigured) {
    return NextResponse.json({ error: misconfigured }, { status: 503 });
  }

  if (!isOpenSignupsEnabled()) {
    return NextResponse.json(
      { error: SIGNUPS_CLOSED_MESSAGE, code: "signups_closed" },
      { status: 403 },
    );
  }

  const ip = getClientIp(req);
  const limited = rateLimit(`signup:${ip}`, 10, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many signups from this IP. Try again in ${limited.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.username || body?.email || body?.password) {
      return NextResponse.json(
        {
          error:
            "Email/password signup is no longer supported. Create a passphrase account instead.",
          code: "passphrase_required",
        },
        { status: 400 },
      );
    }

    const provided =
      typeof body?.passphrase === "string" ? normalizePassphrase(body.passphrase) : "";

    // Server generates the passphrase by default — clients should not invent one.
    let passphrase = provided;
    if (!passphrase) {
      passphrase = generatePassphrase(12);
    } else {
      const words = passphrase.split(" ");
      if (words.length < 8 || words.some((w) => w.length < 3)) {
        return NextResponse.json(
          { error: "Passphrase must be at least 8 words" },
          { status: 400 },
        );
      }
    }

    let result = await createFromPassphrase(passphrase);
    // Extremely rare username collision on different email — regenerate once.
    if ("conflict" in result && result.conflict === "username" && !provided) {
      passphrase = generatePassphrase(12);
      result = await createFromPassphrase(passphrase);
    }

    if ("conflict" in result) {
      if (result.conflict === "exists") {
        return NextResponse.json(
          { error: "An account already exists for that passphrase. Sign in instead.", code: "exists" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: "Could not create account. Try again." }, { status: 409 });
    }

    const authData = await buildAuthResponse(result.user, req);
    return jsonWithAuthCookie(
      {
        ...authData,
        passphrase,
        // Encourage registering a device passkey right after signup.
        suggestPasskey: true,
      },
      authData.token,
    );
  } catch (e) {
    console.error("[signup]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
