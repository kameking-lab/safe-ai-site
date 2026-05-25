/**
 * サーバー専用 Supabase クライアント（service_role キー）。
 *
 * 【重要・セキュリティ】
 * このモジュールは API Route（サーバー）からのみ import すること。
 * service_role キーは RLS を貫通する全権キーであり、クライアントコンポーネントや
 * ブラウザに渡してはならない。`server-only` パッケージは本リポジトリ未導入のため、
 * 命名（lib/supabase/server.ts）とこのコメントで運用ガードする。
 *
 * env（NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）が未設定の環境
 * （ローカル開発や未設定の Vercel 環境）では null を返す。呼び出し側の API Route は
 * その場合 503 を返し、ブラウザ側アダプタは localStorage に自動フォールバックする
 * （= クラウド未設定でもサイトは一切壊れない）。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function getServiceSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    cached = null;
    return null;
  }
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** クラウド保管がサーバー側で利用可能か（URL かつ service_role キーが揃っているか）。 */
export function isKyCloudConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}
