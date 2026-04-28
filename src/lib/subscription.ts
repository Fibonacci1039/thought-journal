import { createClient } from "@/lib/supabase/server";

export type SubscriptionStatus = {
  isPro: boolean;
  plan: "free" | "pro";
};

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  let isPro = process.env.NEXT_PUBLIC_IS_PRO === "true";

  if (process.env.NEXT_PUBLIC_DISABLE_AUTH === "true") {
    return {
      isPro,
      plan: isPro ? "pro" : "free",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email === "yuitofibo@fuji.waseda.jp") {
      isPro = true;
    }
  } catch (e) {
    console.error("Failed to check subscription status:", e);
  }

  return {
    isPro,
    plan: isPro ? "pro" : "free",
  };
}
