"use server";

import "server-only";
import { createClient } from "./supabase/server";
import { USAGE_LIMITS, FeatureType, UsageCheckResult } from "./usage-types";

/**
 * Get the current month's usage count for a feature
 */
export async function getMonthlyUsage(feature: FeatureType): Promise<number> {
  const supabase = await createClient();

  // Calculate the start of the current month in UTC
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  // RLS ensures we only count current user's logs
  const { count, error } = await supabase
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("feature_type", feature)
    .gte("used_at", monthStart.toISOString());

  if (error) {
    console.error("Error fetching usage:", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Check if the user can use a feature (hasn't exceeded limit)
 * Returns usage info including remaining count
 */
export async function checkUsageLimit(
  feature: FeatureType
): Promise<UsageCheckResult> {
  // Developer Mode Bypass
  if (process.env.NEXT_PUBLIC_IS_DEV_MODE === "true") {
    return {
      allowed: true,
      used: 0,
      limit: 9999,
      remaining: 9999,
    };
  }

  // Admin User Bypass
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ADMIN_EMAILS = ["yuitofibo@fuji.waseda.jp"];
  if (user?.email && ADMIN_EMAILS.includes(user.email)) {
    return {
      allowed: true,
      used: 0,
      limit: 9999,
      remaining: 9999,
    };
  }

  const used = await getMonthlyUsage(feature);
  const limit = USAGE_LIMITS[feature];
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    used,
    limit,
    remaining,
  };
}

/**
 * Record a usage event for a feature
 * Call this AFTER a successful operation
 */
export async function recordUsage(
  feature: FeatureType,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn("Attempted to record usage for unauthenticated user");
    return;
  }

  const { error } = await supabase.from("usage_logs").insert({
    user_id: user.id,
    feature_type: feature,
    metadata,
  });

  if (error) {
    console.error("Error recording usage:", error);
    // Don't throw - we don't want to fail the main operation
    // just because usage tracking failed
  }
}

/**
 * Get usage stats for all features (for UI display)
 */
export async function getAllUsageStats(): Promise<
  Record<FeatureType, UsageCheckResult>
> {
  const features = Object.keys(USAGE_LIMITS) as FeatureType[];

  const results = await Promise.all(
    features.map(async (feature) => {
      const stats = await checkUsageLimit(feature);
      return [feature, stats] as const;
    })
  );

  return Object.fromEntries(results) as Record<FeatureType, UsageCheckResult>;
}
