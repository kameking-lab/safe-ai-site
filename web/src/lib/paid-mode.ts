/**
 * 課金UI表示制御フラグ。
 *
 * 研究・実証プロジェクト期間中は完全無料公開のためデフォルト false。
 * M6 で課金事業を再開する際、環境変数 NEXT_PUBLIC_PAID_MODE=true を
 * 設定するだけで全ての課金UI（料金表示・Pro/Business・Stripe導線等）が復活する設計。
 *
 * NOTE: クライアント・サーバー両方から参照可能（NEXT_PUBLIC_ プレフィックス）。
 */
export const PAID_MODE: boolean = process.env.NEXT_PUBLIC_PAID_MODE === "true";
