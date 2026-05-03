import Link from "next/link";
import { PAID_MODE } from "@/lib/paid-mode";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {/* CTA: 相談・改善案受付（PAID_MODE時は受託CTA、無料モード時は意見受付） */}
        {PAID_MODE ? (
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 text-center dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-slate-800 sm:flex sm:items-center sm:justify-between sm:text-left">
            <div>
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                業務自動化・安全管理コンサルのご相談を受付中
              </p>
              <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-200/80">
                Excel・KY・安全書類のデジタル化、AI活用の業務効率化、お気軽にご相談ください。
              </p>
            </div>
            <Link
              href="/contact"
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 sm:mt-0"
            >
              ご相談はこちら →
            </Link>
          </div>
        ) : (
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
        )}

        {/* 4カラム構成 */}
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* 主要機能（7目玉） */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              主要機能
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>
                <Link href="/safety-diary" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  安全衛生日誌
                </Link>
              </li>
              <li>
                <Link href="/ky" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  KY簡易作成
                </Link>
              </li>
              <li>
                <Link href="/chemical-ra" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  化学物質RA
                </Link>
              </li>
              <li>
                <Link href="/signage" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  サイネージ
                </Link>
              </li>
              <li>
                <Link href="/laws" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  法改正一覧
                </Link>
              </li>
              <li>
                <Link href="/chatbot" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  安衛法AIチャット
                </Link>
              </li>
              <li>
                <Link href="/accidents" className="hover:text-slate-900 hover:underline dark:hover:text-white">
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
                <Link href="/equipment-finder" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  保護具AIファインダー
                </Link>
              </li>
              <li>
                <Link href="/chemical-database" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  化学物質検索
                </Link>
              </li>
              <li>
                <Link href="/circulars" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  通達・告示
                </Link>
              </li>
              <li>
                <Link href="/risk" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  気象リスク
                </Link>
              </li>
              <li>
                <Link href="/e-learning" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  Eラーニング
                </Link>
              </li>
              <li>
                <Link href="/glossary" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  用語集
                </Link>
              </li>
              <li>
                <Link href="/goods" className="hover:text-slate-900 hover:underline dark:hover:text-white">
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
                <Link href="/features" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                  機能一覧（全機能）
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  研究プロジェクトについて
                </Link>
              </li>
              <li>
                <Link href="/stats" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  利用統計
                </Link>
              </li>
              <li>
                <Link href="/leaflet" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  リーフレット（PDF）
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  ご意見・改善提案
                </Link>
              </li>
              {PAID_MODE && (
                <>
                  <li>
                    <Link href="/services" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                      受託業務
                    </Link>
                  </li>
                  <li>
                    <Link href="/consulting" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                      月額顧問
                    </Link>
                  </li>
                  <li>
                    <Link href="/pricing" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                      料金プラン
                    </Link>
                  </li>
                </>
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
                <Link href="/privacy" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  セキュリティ
                </Link>
              </li>
              <li>
                <Link href="/dpa" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  DPA
                </Link>
              </li>
              <li>
                <Link href="/bcp" className="hover:text-slate-900 hover:underline dark:hover:text-white">
                  BCP
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* コピーライト */}
        <div className="mt-6 flex flex-col items-center gap-1 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © 2026 ANZEN AI ·{" "}
            <Link href="/about" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              運営者情報
            </Link>
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            個人運営の研究プロジェクト
          </p>
        </div>
      </div>
    </footer>
  );
}
