import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe lazily to avoid build-time errors
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key, {
    apiVersion: "2025-12-15.clover",
  });
}

// Pro plan price ID (set this in your Stripe dashboard)
const PRO_PLAN_PRICE_ID =
  process.env.STRIPE_PRO_PRICE_ID || "price_PLACEHOLDER";

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured. Please contact support." },
        { status: 503 }
      );
    }

    const stripe = getStripe();

    // Get user email from request (in a real app, get from session/auth)
    const body = await request.json();
    const { email, userId } = body;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email || undefined,
      line_items: [
        {
          price: PRO_PLAN_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/settings?success=true`,
      cancel_url: `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/settings?canceled=true`,
      metadata: {
        userId: userId || "anonymous",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
