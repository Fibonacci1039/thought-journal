/**
 * Feature types that have usage limits in the free tier
 * This file is shared between client and server components
 */
export const USAGE_LIMITS = {
  topic_analysis: 3,
  weekly_review: 2,
  rag_chat: 10,
} as const;

export type FeatureType = keyof typeof USAGE_LIMITS;

export interface UsageCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}
