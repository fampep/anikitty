import { NextResponse } from "next/server";
import { MONTHLY_DONATION_GOAL_EUR } from "@/lib/social/donation-config";
import {
  fetchKofiFeedPayments,
  kofiPageIdConfigured,
} from "@/lib/social/kofi-feed";

function startOfUtcMonth(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function GET() {
  const goalEur = MONTHLY_DONATION_GOAL_EUR;
  const configured = kofiPageIdConfigured();

  if (!configured) {
    return NextResponse.json({
      configured: false,
      goalEur,
      raisedEur: 0,
      percent: 0,
    });
  }

  try {
    const payments = await fetchKofiFeedPayments();
    const monthStart = startOfUtcMonth();

    const raisedEur = payments.reduce((sum, payment) => {
      if (!payment.createdAt || payment.createdAt < monthStart) return sum;
      if (payment.amount < 0.01) return sum;
      const currency = payment.currency.toUpperCase();
      if (currency === "EUR") return sum + payment.amount;
      if (currency === "USD" || currency === "GBP") return sum + payment.amount * 0.92;
      return sum + payment.amount;
    }, 0);

    const percent = goalEur > 0 ? Math.min(100, Math.round((raisedEur / goalEur) * 100)) : 0;

    return NextResponse.json({
      configured: true,
      goalEur,
      raisedEur: Math.round(raisedEur * 100) / 100,
      percent,
    });
  } catch (err) {
    console.error("[kofi/goal]", err);
    return NextResponse.json({
      configured: true,
      goalEur,
      raisedEur: 0,
      percent: 0,
    });
  }
}
