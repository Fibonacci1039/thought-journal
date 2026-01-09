"use client";

import { UsageCheckResult, FeatureType, USAGE_LIMITS } from "@/lib/usage-types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  featureType: FeatureType;
  usage: UsageCheckResult;
}

const FEATURE_LABELS: Record<FeatureType, string> = {
  topic_analysis: "トピック分析",
  weekly_review: "週次レビュー",
  rag_chat: "過去との対話",
};

export function UsageLimitModal({
  isOpen,
  onClose,
  featureType,
  usage,
}: Props) {
  if (!isOpen) return null;

  const label = FEATURE_LABELS[featureType];
  const limit = USAGE_LIMITS[featureType];

  // Calculate days until reset (next month)
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysUntilReset = Math.ceil(
    (nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="usage-limit-overlay" onClick={onClose}>
      <div className="usage-limit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="usage-limit-icon">📊</div>
        <h2 className="usage-limit-title">今月の{label}回数に達しました</h2>

        <div className="usage-limit-stats">
          <div className="usage-stat">
            <span className="usage-stat-value">{usage.used}</span>
            <span className="usage-stat-separator">/</span>
            <span className="usage-stat-limit">{limit}回</span>
            <span className="usage-stat-label">使用済み</span>
          </div>
        </div>

        <div className="usage-limit-promo">
          <div className="promo-badge">Pro</div>
          <div className="promo-content">
            <p className="promo-title">Pro にアップグレードして無制限に</p>
            <p className="promo-description">
              全ての分析機能が使い放題。変化ダッシュボードも利用可能に。
            </p>
          </div>
          <button className="promo-button" disabled>
            Coming Soon
          </button>
        </div>

        <p className="usage-limit-reset">
          {daysUntilReset}日後（来月1日）にリセットされます
        </p>

        <button className="usage-limit-close" onClick={onClose}>
          閉じる
        </button>

        <style jsx>{`
          .usage-limit-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
            animation: fadeIn 0.2s ease;
          }

          .usage-limit-modal {
            background: var(--color-bg-tertiary);
            border: 1px solid var(--color-border);
            border-radius: 16px;
            padding: 2rem;
            max-width: 400px;
            width: 100%;
            text-align: center;
            animation: slideUp 0.3s ease;
          }

          .usage-limit-icon {
            font-size: 2.5rem;
            margin-bottom: 1rem;
          }

          .usage-limit-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--color-text-primary);
            margin-bottom: 1.5rem;
          }

          .usage-limit-stats {
            display: flex;
            justify-content: center;
            margin-bottom: 1.5rem;
          }

          .usage-stat {
            display: flex;
            align-items: baseline;
            gap: 0.25rem;
          }

          .usage-stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--color-accent);
          }

          .usage-stat-separator {
            font-size: 1.5rem;
            color: var(--color-text-tertiary);
          }

          .usage-stat-limit {
            font-size: 1.25rem;
            color: var(--color-text-secondary);
          }

          .usage-stat-label {
            font-size: 0.875rem;
            color: var(--color-text-tertiary);
            margin-left: 0.5rem;
          }

          .usage-limit-promo {
            background: linear-gradient(
              135deg,
              rgba(255, 159, 10, 0.1),
              rgba(159, 209, 57, 0.1)
            );
            border: 1px solid rgba(255, 159, 10, 0.3);
            border-radius: 12px;
            padding: 1rem;
            margin-bottom: 1.5rem;
          }

          .promo-badge {
            display: inline-block;
            background: linear-gradient(
              135deg,
              var(--color-accent),
              var(--color-accent-secondary)
            );
            color: white;
            font-size: 0.75rem;
            font-weight: 700;
            padding: 0.25rem 0.75rem;
            border-radius: 99px;
            margin-bottom: 0.75rem;
          }

          .promo-content {
            margin-bottom: 0.75rem;
          }

          .promo-title {
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--color-text-primary);
            margin-bottom: 0.25rem;
          }

          .promo-description {
            font-size: 0.8rem;
            color: var(--color-text-secondary);
          }

          .promo-button {
            background: var(--color-bg-secondary);
            color: var(--color-text-tertiary);
            border: 1px solid var(--color-border);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 500;
            cursor: not-allowed;
          }

          .usage-limit-reset {
            font-size: 0.85rem;
            color: var(--color-text-tertiary);
            margin-bottom: 1.5rem;
          }

          .usage-limit-close {
            background: transparent;
            border: 1px solid var(--color-border);
            color: var(--color-text-secondary);
            padding: 0.6rem 1.5rem;
            border-radius: 8px;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .usage-limit-close:hover {
            background: var(--color-bg-primary);
            border-color: var(--color-border-hover);
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
