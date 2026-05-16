import Link from "next/link";
import { PAID_MODE } from "@/lib/paid-mode";
import { Mascot } from "@/components/mascot";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {/* CTA: 相談・改善案受付（PAID_MODE時は受託CTA、無料モード時は意見受付） */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 text-center dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-slate-800 sm:flex sm:items-center sm:justify-between sm:text-left">
          <div>
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              改善提案・データ誤りの指摘を募集中
            </p>
            <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-200/80">
              個人運営の研究プロジェクトです。気付いた点・追加してほしい機能など、お気軽にお寄せください。
            </p>
          </div>
          <Link
            href="/contact"
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 sm:mt-0"
          >
            ご意見を送る →
          </Link>
        </div>

        {/* 4カラム構成 */}
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* 主要機能（7目玉） */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              主要機能
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>
                <Link href="/safety-diary" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  安全衛生日誌
                </Link>
              </li>
              <li>
                <Link href="/ky" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  KY簡易作成
                </Link>
              </li>
              <li>
                <Link href="/chemical-ra" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  化学物質RA
                </Link>
              </li>
              <li>
                <Link href="/signage" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  サイネージ
                </Link>
              </li>
              <li>
                <Link href="/laws" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  法改正一覧
                </Link>
              </li>
              <li>
                <Link href="/chatbot" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  安衛法AIチャット
                </Link>
              </li>
              <li>
                <Link href="/accidents" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  重大事故ニュース
                </Link>
              </li>
            </ul>
          </div>

          {/* 関連データ */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              関連データ
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>
                <Link href="/equipment-finder" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  保護具AIファインダー
                </Link>
              </li>
              <li>
                <Link href="/chemical-database" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  化学物質検索
                </Link>
              </li>
              <li>
                <Link href="/circulars" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  通達・告示
                </Link>
              </li>
              <li>
                <Link href="/risk" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  気象リスク
                </Link>
              </li>
              <li>
                <Link href="/e-learning" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  Eラーニング
                </Link>
              </li>
              <li>
                <Link href="/glossary" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  用語集
                </Link>
              </li>
              <li>
                <Link href="/faq" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  FAQ 200問
                </Link>
              </li>
              <li>
                <Link href="/ky-examples" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  KY事例データベース
                </Link>
              </li>
              <li>
                <Link href="/mental-health-management" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  メンタルヘルス対策
                </Link>
              </li>
              <li>
                <Link href="/foreign-workers" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  外国人労働者支援
                </Link>
              </li>
              <li>
                <Link href="/goods" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  安全用品カタログ
                </Link>
              </li>
            </ul>
          </div>

          {/* プロジェクト */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              プロジェクト
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>
                <Link href="/features" className="inline-flex min-h-[44px] items-center font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                  機能一覧（全機能）
                </Link>
              </li>
              <li>
                <Link href="/about" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  研究プロジェクトについて
                </Link>
              </li>
              <li>
                <Link href="/stats" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  利用統計
                </Link>
              </li>
              <li>
                <Link href="/leaflet" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  リーフレット（PDF）
                </Link>
              </li>
              <li>
                <Link href="/contact" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  ご意見・改善提案
                </Link>
              </li>
              {PAID_MODE && (
                <li>
                  <Link href="/pricing" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                    料金プラン
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* 規約・運営 */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              規約・運営
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>
                <Link href="/privacy" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/terms" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="/security" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  セキュリティ
                </Link>
              </li>
              <li>
                <Link href="/dpa" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  DPA
                </Link>
              </li>
              <li>
                <Link href="/bcp" className="inline-flex min-h-[44px] items-center hover:text-slate-900 hover:underline dark:hover:text-white">
                  BCP
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* コピーライト */}
        <div className="mt-6 flex flex-col items-center gap-1 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Mascot size="sm" alt="安全AIポータル マスコット" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              © 2026 安全AIポータル ·{" "}
              <Link href="/about" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
                運営者情報
              </Link>
            </p>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            個人運営の研究プロジェクト
          </p>
        </div>
      </div>
    </footer>
  );
}
