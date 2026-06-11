"use client";

/**
 * Eラーニング結論カード（柱0・脱テキスト）。
 * 画面最上部の「いまの状態」1メッセージ: 履歴ゼロ=入門から開始（青）/
 * 未完了あり=学習のこりN（青・続きからの44px動線）/ 全テーマ全問正答=緑。
 * 判定は learning-conclusion.ts の純関数（テスト固定）。進捗データは
 * progress.ts の localStorage（端末内のみ）を読むだけで書き込まない。
 */

import { useEffect, useState } from "react";
import { GraduationCap, PlayCircle } from "lucide-react";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { loadProgressList } from "@/lib/elearning/progress";
import {
  buildLearningConclusion,
  type LearningConclusion,
} from "@/lib/elearning/learning-conclusion";

export function ElearningConclusionCard() {
  const [conclusion, setConclusion] = useState<LearningConclusion | null>(null);

  useEffect(() => {
    // localStorage は外部システム — マウント後に読んで初めて描画する（SSR/初回HTML不一致防止）
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回マウントの hydration として正当
    setConclusion(buildLearningConclusion(loadProgressList()));
  }, []);

  if (!conclusion) return null;

  if (conclusion.kind === "start") {
    return (
      <ConclusionCard
        tone="info"
        title="入門から開始"
        description="「初めての安全担当者」コース（4ステップ・全20問）から始められます。"
        icon={PlayCircle}
        action={{
          href: `/e-learning?theme=${conclusion.actionThemeId}#el-quiz`,
          label: "入門から始める",
        }}
        className="mt-4"
      />
    );
  }

  if (conclusion.kind === "resume") {
    return (
      <ConclusionCard
        tone="info"
        value={conclusion.remaining}
        unit="テーマ"
        title="学習のこり"
        description="全問正答に達していないテーマです。続きから再挑戦できます。"
        action={{
          href: `/e-learning?theme=${conclusion.actionThemeId}#el-quiz`,
          label: "続きから",
        }}
        className="mt-4"
      />
    );
  }

  return (
    <ConclusionCard
      tone="safe"
      value={conclusion.completed}
      unit="テーマ"
      title="全問正答"
      description="受講したテーマはすべて全問正答です。新しいテーマにも挑戦できます。"
      icon={GraduationCap}
      className="mt-4"
    />
  );
}
