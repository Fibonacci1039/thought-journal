import { EntryList } from "@/components/EntryList";
import { QuickInput } from "@/components/QuickInput";
import { MemoryLane } from "@/components/MemoryLane";
import { getEntries, getTopics } from "@/lib/storage";
import { getSubscriptionStatus } from "@/lib/subscription";
import { Entry, Topic } from "@/lib/types";
import Link from "next/link";
import { ArrowRight, MessageCircle, PenLine, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

// Calculate streak (consecutive days with entries)
function calculateStreak(entries: Entry[]): number {
  if (entries.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entryDates = entries.map((e) => {
    const d = new Date(e.created_at);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  const uniqueDates = [...new Set(entryDates)].sort((a, b) => b - a);

  let streak = 0;
  let currentDate = today.getTime();

  for (const date of uniqueDates) {
    if (date === currentDate || date === currentDate - 86400000) {
      streak++;
      currentDate = date;
    } else if (date < currentDate - 86400000) {
      break;
    }
  }

  return streak;
}

function getTopicCounts(entries: Entry[], topics: Topic[]) {
  const counts = new Map<string, number>();

  entries.forEach((entry) => {
    entry.topic_ids?.forEach((topicId) => {
      counts.set(topicId, (counts.get(topicId) || 0) + 1);
    });
  });

  return topics
    .map((topic) => ({
      ...topic,
      count: counts.get(topic.id) || 0,
    }))
    .filter((topic) => topic.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function getHomeInsight(entries: Entry[]) {
  const latestWithInsight = entries.find((entry) => {
    const assets = entry.ai_view?.reflection_assets as
      | Record<string, unknown>
      | undefined;
    return (
      typeof assets?.core_concern === "string" ||
      typeof assets?.next_review_question === "string" ||
      typeof assets?.small_next_step === "string"
    );
  });

  const assets = latestWithInsight?.ai_view?.reflection_assets as
    | Record<string, unknown>
    | undefined;

  if (typeof assets?.next_review_question === "string") {
    return assets.next_review_question;
  }

  if (typeof assets?.small_next_step === "string") {
    return `次の一歩: ${assets.small_next_step}`;
  }

  if (typeof assets?.core_concern === "string") {
    return `最近の焦点: ${assets.core_concern}`;
  }

  if (entries.length > 0) {
    return "最近の記録から、繰り返し出てくるテーマを見つけています。";
  }

  return "記録が増えると、ここに流れや問いが表示されます。";
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRecordRhythm(entries: Entry[]) {
  const weekCount = 26;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(today.getDate() - (weekCount - 1) * 7 - today.getDay());

  const counts = new Map<string, number>();
  entries.forEach((entry) => {
    const date = new Date(entry.created_at);
    date.setHours(0, 0, 0, 0);
    const key = toDateKey(date);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const days = Array.from({ length: weekCount * 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toDateKey(date);
    const count = counts.get(key) || 0;
    const isFuture = date.getTime() > today.getTime();
    const level =
      count === 0 || isFuture ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3;

    return {
      key,
      count: isFuture ? 0 : count,
      level,
      label: new Intl.DateTimeFormat("ja-JP", {
        month: "numeric",
        day: "numeric",
        weekday: "short",
      }).format(date),
    };
  });

  const activeDays = days.filter((day) => day.count > 0).length;
  const totalEntries = days.reduce((sum, day) => sum + day.count, 0);
  const maxCount = Math.max(0, ...days.map((day) => day.count));

  return { days, activeDays, totalEntries, maxCount };
}

function getReflectionTakeaway(entries: Entry[]) {
  for (const entry of entries) {
    const assets = entry.ai_view?.reflection_assets as
      | Record<string, unknown>
      | undefined;

    if (typeof assets?.small_next_step === "string") {
      return {
        label: "次の一歩",
        text: assets.small_next_step,
      };
    }

    if (typeof assets?.core_concern === "string") {
      return {
        label: "最近の焦点",
        text: assets.core_concern,
      };
    }
  }

  return null;
}

export default async function Home() {
  let entries: Entry[] = [];
  let topics: Topic[] = [];
  let isPro = false;
  let error = null;

  try {
    const [e, t, sub] = await Promise.all([
      getEntries(),
      getTopics(),
      getSubscriptionStatus(),
    ]);
    entries = e;
    topics = t;
    isPro = sub.isPro;
  } catch (err) {
    console.error("Database Error FULL:", JSON.stringify(err, null, 2));
    if (err instanceof Error) console.error("Error Message:", err.message);
    error = err;
  }

  if (error) {
    return (
      <main>
        <h1>エラー</h1>
        <p style={{ marginTop: "1rem", color: "var(--color-subtle)" }}>
          データベースに接続できませんでした。環境変数
          (SUPABASE_SERVICE_ROLE_KEY) を確認してください。
        </p>
      </main>
    );
  }

  const streak = calculateStreak(entries);
  const topicCounts = getTopicCounts(entries, topics);
  const homeInsight = getHomeInsight(entries);
  const recordRhythm = getRecordRhythm(entries);
  const reflectionTakeaway = getReflectionTakeaway(entries);
  const maxTopicCount = topicCounts[0]?.count || 1;
  const todayLabel = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  return (
    <main className="page-grid animate-enter">
      <section className="page-main">
        <div className="page-topbar">
          <div className="page-date">{todayLabel}</div>
          <div className="page-actions">
            <Link className="icon-button" href="/personal-ai">
              AIに聞く
            </Link>
            <Link className="btn-primary" href="/new">
              記録する
            </Link>
          </div>
        </div>

        <h1 className="page-title">今日をほどく</h1>
        <p className="page-lead">考えごとを少し置いて、次に進める形にする。</p>

        <section className="home-focus-panel" aria-label="今日の記録を始める">
          <div className="home-focus-copy">
            <div className="home-focus-kicker">
              <Sparkles size={14} />
              AI JOURNALING
            </div>
            <h2>話しながら、記録にする</h2>
            <p>
              悩みや違和感をそのまま出すと、AIが問い返して、最後に次の一歩まで整理します。
            </p>
          </div>
          <div className="home-focus-actions">
            <Link className="home-primary-action" href="/new">
              <PenLine size={18} />
              AIと記録する
              <ArrowRight size={16} />
            </Link>
            <Link className="home-secondary-action" href="/personal-ai">
              <MessageCircle size={17} />
              過去の記録に聞く
            </Link>
          </div>
        </section>

        <QuickInput />

        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-value">{entries.length}</span>
            <span className="stat-label">記録数</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{topics.length}</span>
            <span className="stat-label">トピック</span>
          </div>
          <div className="stat-card">
            <span className="stat-value accent">{streak}</span>
            <span className="stat-label">日連続</span>
          </div>
        </div>

        {entries.length > 7 && <MemoryLane entries={entries} isPro={isPro} />}

        <EntryList entries={entries} topics={topics} />
      </section>

      <aside className="insight-rail" aria-label="今日のインサイト">
        <section className="rail-card">
          <div className="rail-title">次の一歩</div>
          {reflectionTakeaway ? (
            <div>
              <div className="takeaway-label">{reflectionTakeaway.label}</div>
              <p className="takeaway-text">{reflectionTakeaway.text}</p>
            </div>
          ) : (
            <p className="rail-empty">
              AI対話や記録が増えると、次に試せる小さな行動がここに残ります。
            </p>
          )}
        </section>

        <section className="rail-card rail-card-accent">
          <div className="rail-title">PERSONAL AI</div>
          <p className="rail-quote">{homeInsight}</p>
          <Link className="rail-link" href="/personal-ai">
            過去の記録に聞く
            <ArrowRight size={13} />
          </Link>
        </section>

        <section className="rail-card">
          <div className="rail-title">記録リズム</div>
          <div className="rhythm-summary">
            <span>{recordRhythm.activeDays}日記録</span>
            <span>{recordRhythm.totalEntries}件</span>
          </div>
          <div className="rhythm-grid" aria-label="直近26週間の記録リズム">
            {recordRhythm.days.map((day) => (
              <span
                className={`rhythm-cell rhythm-level-${day.level}`}
                key={day.key}
                title={`${day.label}: ${day.count}件`}
              />
            ))}
          </div>
          <div className="rhythm-legend" aria-hidden="true">
            <span>少</span>
            <span className="rhythm-cell rhythm-level-0" />
            <span className="rhythm-cell rhythm-level-1" />
            <span className="rhythm-cell rhythm-level-2" />
            <span className="rhythm-cell rhythm-level-3" />
            <span>多</span>
          </div>
        </section>

        <section className="rail-card">
          <div className="rail-title">よく出るテーマ</div>
          {topicCounts.length > 0 ? (
            topicCounts.map((topic) => (
              <Link
                className="topic-meter topic-meter-link"
                href={`/topics/${topic.id}`}
                key={topic.id}
              >
                <span>{topic.name}</span>
                <span className="meter-track" aria-hidden="true">
                  <span
                    className="meter-fill"
                    style={{
                      width: `${Math.max(
                        24,
                        Math.round((topic.count / maxTopicCount) * 100)
                      )}%`,
                    }}
                  />
                </span>
              </Link>
            ))
          ) : (
            <p style={{ color: "var(--color-text-tertiary)", fontSize: "0.875rem" }}>
              まだトピックがありません
            </p>
          )}
        </section>
      </aside>
    </main>
  );
}
