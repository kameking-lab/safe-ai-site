import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ALL_ELEARNING_QUESTIONS } from "@/data/e-learning";
import { ELearningClient } from "./e-learning-client";

export const metadata: Metadata = {
  title: "Eラーニング | 災害の型別学習",
  description: "厚労省分類の20種の災害の型ごとに問題を解いて、労働安全の知識を確認できます。",
};

export default function ELearningPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Eラーニング"
        description="災害の型別に問題を解いて知識を確認しましょう（全20分野）"
        icon={GraduationCap}
        iconColor="emerald"
      />
      <ELearningClient questions={ALL_ELEARNING_QUESTIONS} />
    </div>
  );
}
