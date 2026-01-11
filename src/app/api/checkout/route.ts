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

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRO_PRICE_ID;

    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY is missing");
      return NextResponse.json(
        { error: "Stripe is not configured. Please set STRIPE_SECRET_KEY." },
        { status: 503 }
      );
    }

    if (!priceId) {
      console.error("STRIPE_PRO_PRICE_ID is missing");
      return NextResponse.json(
        {
          error: "Price ID is not configured. Please set STRIPE_PRO_PRICE_ID.",
        },
        { status: 503 }
      );
    }

    const stripe = getStripe();

    // Get user email from request (optional)
    let email: string | undefined;
    let userId: string | undefined;

    try {
      const body = await request.json();
      email = body.email;
      userId = body.userId;
    } catch {
      // Body is empty, that's fine
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email || undefined,
      line_items: [
        {
          price: priceId,
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create checkout session: ${errorMessage}` },
      { status: 500 }
    );
  }
}
