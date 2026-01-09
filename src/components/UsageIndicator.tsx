"use client";

import { UsageCheckResult, FeatureType } from "@/lib/usage-types";

interface Props {
  featureType: FeatureType;
  usage: UsageCheckResult | null;
  compact?: boolean;
}

const FEATURE_LABELS: Record<FeatureType, string> = {
  topic_analysis: "分析",
  weekly_review: "レビュー",
  rag_chat: "対話",
};

export function UsageIndicator({ featureType, usage, compact = false }: Props) {
  if (!usage) return null;

  const label = FEATURE_LABELS[featureType];
  const isNearLimit = usage.remaining <= 1;
  const isAtLimit = usage.remaining <= 0;

  if (compact) {
    return (
      <span
        className={`usage-indicator-compact ${
          isAtLimit ? "at-limit" : isNearLimit ? "near-limit" : ""
        }`}
      >
        (残り{usage.remaining}回)
        <style jsx>{`
          .usage-indicator-compact {
            font-size: 0.8rem;
            color: var(--color-text-tertiary);
            margin-left: 0.5rem;
          }
          .usage-indicator-compact.near-limit {
            color: var(--color-accent);
          }
          .usage-indicator-compact.at-limit {
            color: #ff453a;
          }
        `}</style>
      </span>
    );
  }

  return (
    <div
      className={`usage-indicator ${
        isAtLimit ? "at-limit" : isNearLimit ? "near-limit" : ""
      }`}
    >
      <span className="usage-label">{label}</span>
      <span className="usage-count">
        {usage.used}/{usage.limit}
      </span>
      <div className="usage-bar">
        <div
          className="usage-bar-fill"
          style={{ width: `${(usage.used / usage.limit) * 100}%` }}
        />
      </div>

      <style jsx>{`
        .usage-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--color-text-tertiary);
          padding: 0.4rem 0.75rem;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
        }

        .usage-indicator.near-limit {
          border-color: rgba(255, 159, 10, 0.3);
        }

        .usage-indicator.at-limit {
          border-color: rgba(255, 69, 58, 0.3);
        }

        .usage-label {
          font-weight: 500;
        }

        .usage-count {
          font-variant-numeric: tabular-nums;
        }

        .usage-bar {
          width: 40px;
          height: 4px;
          background: var(--color-bg-tertiary);
          border-radius: 2px;
          overflow: hidden;
        }

        .usage-bar-fill {
          height: 100%;
          background: var(--color-accent-secondary);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .near-limit .usage-bar-fill {
          background: var(--color-accent);
        }

        .at-limit .usage-bar-fill {
          background: #ff453a;
        }
      `}</style>
    </div>
  );
}
