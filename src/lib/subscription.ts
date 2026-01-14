export type SubscriptionStatus = {
  isPro: boolean;
  plan: "free" | "pro";
};

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  // TODO: Replace with actual DB/Stripe check
  // For now, check functionality by toggling this return
  // Or link to user_profiles table if 'plan' column exists

  // Checking environment variable for dev/demo purposes
  // Set NEXT_PUBLIC_IS_PRO=true in .env.local to test Pro features
  const isPro = process.env.NEXT_PUBLIC_IS_PRO === "true";

  return {
    isPro,
    plan: isPro ? "pro" : "free",
  };
}
