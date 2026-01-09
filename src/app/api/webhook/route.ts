import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const customerEmail = session.customer_email;

      console.log("✅ Checkout completed:", { userId, customerEmail });

      // Update user to pro status in your database
      if (customerEmail) {
        const { error } = await supabase.from("subscriptions").upsert(
          {
            email: customerEmail,
            plan: "pro",
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            status: "active",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "email",
          }
        );

        if (error) {
          console.error("Failed to update subscription:", error);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log("❌ Subscription canceled:", customerId);

      // Downgrade user back to free
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan: "free",
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);

      if (error) {
        console.error("Failed to update subscription:", error);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const status = subscription.status;

      console.log("🔄 Subscription updated:", { customerId, status });

      // Update status
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);

      if (error) {
        console.error("Failed to update subscription:", error);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
