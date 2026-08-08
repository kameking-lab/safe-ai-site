import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HEAT_ILLNESS_KNOWLEDGE_CHECK } from "@/data/heat-illness-learning/questions";
import HeatIllnessElearningPage, { metadata } from "./page";

describe("HeatIllnessElearningPage", () => {
  it("全7問をfieldsetとlegendで構造化し、回答を保存・送信しない境界を表示する", () => {
    const { container } = render(<HeatIllnessElearningPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "熱中症対策・出典付き理解度確認",
      }),
    ).toBeDefined();
    expect(screen.getAllByRole("group")).toHaveLength(
      HEAT_ILLNESS_KNOWLEDGE_CHECK.length,
    );
    expect(screen.getByText(/保存・送信しません/)).toBeDefined();
    expect(screen.getByText(/法定教育、資格判定、医学的診断/)).toBeDefined();
    expect(container.querySelectorAll("fieldset")).toHaveLength(7);
    expect(container.querySelectorAll("legend")).toHaveLength(7);
  });

  it("未回答をエラー要約とaria-invalidで示し、各設問へ戻れる", () => {
    render(<HeatIllnessElearningPage />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "選択内容を公式根拠と照合",
      }),
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("未回答が7項目あります");
    expect(
      screen.getAllByText(/この項目は未回答です/),
    ).toHaveLength(7);
    expect(
      screen.getAllByRole("group").every(
        (group) => group.getAttribute("aria-invalid") === "true",
      ),
    ).toBe(true);
    expect(
      within(alert).getByRole("link", { name: "問1へ移動" }).getAttribute(
        "href",
      ),
    ).toBe("#question-two-statutory-duties");
  });

  it("全問の選択内容を照合し、能力・安全判定に変換せず根拠を表示する", () => {
    const { container } = render(<HeatIllnessElearningPage />);

    for (const question of HEAT_ILLNESS_KNOWLEDGE_CHECK) {
      const fieldset = screen.getByRole("group", {
        name: `問${question.number}. ${question.legend}`,
      });
      const correctOption = question.options.find(
        (option) => option.id === question.correctOptionId,
      );
      if (!correctOption) {
        throw new Error(`正答選択肢がありません: ${question.id}`);
      }
      fireEvent.click(
        within(fieldset).getByRole("radio", {
          name: correctOption.label,
        }),
      );
    }

    fireEvent.click(
      screen.getByRole("button", {
        name: "選択内容を公式根拠と照合",
      }),
    );

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("7項目すべてを公式根拠と照合");
    expect(status.textContent).toContain("能力や作業の安全を判定する結果ではありません");
    expect(
      container.querySelectorAll("[data-answer-state='confirmed']"),
    ).toHaveLength(7);
    expect(
      screen.getAllByRole("link", { name: /基発0318第1号/ }).length,
    ).toBeGreaterThan(0);
  });

  it("誤った救急分岐を要訂正として表示し、119と無理な飲水禁止へ戻す", () => {
    render(<HeatIllnessElearningPage />);

    const emergencyQuestion = HEAT_ILLNESS_KNOWLEDGE_CHECK.find(
      (question) => question.id === "unclear-consciousness",
    );
    if (!emergencyQuestion) {
      throw new Error("緊急設問がありません");
    }
    const fieldset = screen.getByRole("group", {
      name: `問${emergencyQuestion.number}. ${emergencyQuestion.legend}`,
    });
    fireEvent.click(
      within(fieldset).getByRole("radio", {
        name: "意識がはっきりするまで、口から水を飲ませ続ける",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "選択内容を公式根拠と照合",
      }),
    );

    expect(fieldset.textContent).toContain(
      "要訂正: 緊急時の分岐を確認してください",
    );
    expect(fieldset.textContent).toContain("ただちに救急隊を要請");
    expect(fieldset.textContent).toContain("口から無理に水分を与えず");
  });

  it("44px操作、reduced motion、forced colors、リセットを備える", () => {
    render(<HeatIllnessElearningPage />);

    const progress = screen.getByRole("progressbar", {
      name: "回答進捗 0/7",
    });
    expect(progress.getAttribute("aria-valuemin")).toBe("0");
    expect(progress.getAttribute("aria-valuemax")).toBe("7");
    expect(progress.getAttribute("aria-valuenow")).toBe("0");
    expect(progress.getAttribute("aria-valuetext")).toBe(
      "7問中0問を回答済み",
    );

    const firstRadio = screen.getAllByRole("radio")[0];
    const firstLabel = firstRadio.closest("label");
    expect(firstLabel?.className).toContain("min-h-[44px]");
    expect(firstLabel?.className).toContain("motion-reduce:transition-none");
    expect(firstLabel?.className).toContain("forced-colors:");

    fireEvent.click(firstRadio);
    expect((firstRadio as HTMLInputElement).checked).toBe(true);
    expect(progress.getAttribute("aria-valuenow")).toBe("1");
    expect(progress.getAttribute("aria-valuetext")).toBe(
      "7問中1問を回答済み",
    );

    const reset = screen.getByRole("button", { name: "選択をやり直す" });
    expect(reset.className).toContain("min-h-[44px]");
    expect(reset.className).toContain("min-w-[44px]");
    expect(reset.className).toContain("forced-colors:");
    fireEvent.click(reset);
    expect((firstRadio as HTMLInputElement).checked).toBe(false);
  });

  it("canonical、絶対日付、公式教材の時点注意を表示する", () => {
    render(<HeatIllnessElearningPage />);

    expect(metadata.alternates?.canonical).toBe(
      "/heat-illness-prevention/elearning",
    );
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(screen.getByText("2026年7月24日")).toBeDefined();
    expect(document.body.textContent).toContain("AI支援で作成した未監修教材");
    expect(document.body.textContent).toContain(
      "外部法務レビュー待ち",
    );
    expect(screen.getByText(/令和2年時点の情報を基にした動画/)).toBeDefined();
    const official = screen.getByRole("link", {
      name: /厚生労働省の公式e-learningを開く/,
    });
    expect(official.getAttribute("href")).toBe(
      "https://neccyusho.mhlw.go.jp/study/",
    );
    expect(official.getAttribute("target")).toBe("_blank");
    expect(
      screen
        .getByRole("link", { name: "料金・受付状況を見る" })
        .getAttribute("href"),
    ).toBe("/services/automation");
  });
});
