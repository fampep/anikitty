import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { requireUser, unauthorized } from "@/lib/auth/require-user";
import { toggleReviewLike } from "@/lib/reviews/reviews";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; reviewId: string }> },
) {
  const { reviewId } = await params;
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const result = await toggleReviewLike(getDb(), user.id, reviewId);
  if (!result) {
    return NextResponse.json({ error: "Cannot like this review." }, { status: 400 });
  }
  return NextResponse.json(result);
}
