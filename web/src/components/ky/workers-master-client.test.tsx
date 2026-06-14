import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { WorkersMasterClient } from "./workers-master-client";

/**
 * 柱0（無読テスト回帰ガード）: 作業員マスター入口の結論カード。
 *
 * 「初めて開く職長」が本文を読まず3秒で「いまの状態」と「次にやること」を読めること。
 * - 0名（空）: 結論カードが「登録なし」＋次アクション「作業員を追加」(#add-worker, 44px) を出す。
 *   以前は次アクションが説明文に埋もれ、空状態カードにボタンが無かった（/ky/list との非対称）。
 * - 登録済み: 結論カードが「N名 登録済み」＋次アクション「KY用紙で使う」(/ky/paper) を出す。
 */

const WORKERS_STORAGE_KEY = "safe-ai:ky-workers:v1";

type Seed = {
  id: string;
  name: string;
  affiliation: "self" | "coop1" | "coop2" | "coop3";
  company: string;
  qualNo: string;
  isRegular: boolean;
  hidden: boolean;
  createdAt: number;
};

function seed(entries: Seed[]) {
  window.localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(entries));
}

const TARO: Seed = {
  id: "w-1",
  name: "山田 太郎",
  affiliation: "self",
  company: "",
  qualNo: "1",
  isRegular: true,
  hidden: false,
  createdAt: 1_700_000_000_000,
};

describe("WorkersMasterClient 結論カード（無読テスト）", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("0名のとき『登録なし』＋次アクション『作業員を追加』を結論カードに出す", () => {
    render(<WorkersMasterClient />);
    const status = screen.getByRole("status", { name: /いまの状態/ });
    expect(within(status).getByText("登録なし")).toBeTruthy();
    const cta = within(status).getByRole("link", { name: /作業員を追加/ });
    expect(cta.getAttribute("href")).toBe("#add-worker");
    // 44px以上のタップ標的（柱0）
    expect(cta.className).toMatch(/min-h-\[44px\]/);
  });

  it("空状態の次アクションが指す #add-worker フォームが存在する", () => {
    render(<WorkersMasterClient />);
    expect(document.getElementById("add-worker")).not.toBeNull();
  });

  it("登録済みのとき『N名 登録済み』＋次アクション『KY用紙で使う』を結論カードに出す", () => {
    seed([TARO]);
    render(<WorkersMasterClient />);
    const status = screen.getByRole("status", { name: /いまの状態/ });
    expect(within(status).getByText("1")).toBeTruthy();
    expect(within(status).getByText("登録済み")).toBeTruthy();
    const cta = within(status).getByRole("link", { name: /KY用紙で使う/ });
    expect(cta.getAttribute("href")).toBe("/ky/paper");
    expect(cta.className).toMatch(/min-h-\[44px\]/);
  });

  it("退職（hidden）のみのときは登録0名扱いで空状態カードを出す", () => {
    seed([{ ...TARO, hidden: true }]);
    render(<WorkersMasterClient />);
    const status = screen.getByRole("status", { name: /いまの状態/ });
    expect(within(status).getByText("登録なし")).toBeTruthy();
  });
});
