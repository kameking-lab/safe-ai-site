'use client';

/**
 * condex のクライアント取得＋着地解決フック（FT-D4 検索統合）。
 *
 * 設計正本: docs/corpus-fulltext-architecture-2026-07-12.md §2-4・§5-2。
 *
 * - condex（軽量索引＝条番号＋見出しのみ）は API（/api/law-fulltext-condex）から**遅延取得**し
 *   モジュール変数にキャッシュする（初回のみ・多重取得を in-flight で 1 本化）。
 *   → クライアントバンドルには何も静的同梱しない（first-load JS 非増加）。全文本文は載らない。
 * - 取得は「条番号クエリで 0 件になった」ときだけ（{@link looksLikeArticleQuery} が真の時）走らせる
 *   ＝通常検索の応答には一切割り込まない（0 件救済にのみ効く）。
 */
import { useEffect, useMemo, useState } from "react";
import {
  looksLikeArticleQuery,
  resolveCondexLanding,
  type CondexLanding,
  type CondexPayload,
} from "@/lib/laws-fulltext/condex";

const CONDEX_ENDPOINT = "/api/law-fulltext-condex";

let cache: CondexPayload | null = null;
let inflight: Promise<CondexPayload | null> | null = null;

/** condex を 1 度だけ取得してキャッシュ（失敗時は null＝呼び出し側は e-Gov フォールバックへ委ねる）。 */
export async function loadCondex(): Promise<CondexPayload | null> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(CONDEX_ENDPOINT, { cache: "force-cache" });
      if (!res.ok) return null;
      const data = (await res.json()) as CondexPayload;
      cache = data;
      return data;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * 条番号クエリの全文条ページ着地先を返すフック。
 * `enabled`（＝通常検索が 0 件）かつクエリが条番号形のときだけ condex を取得し、着地先を解決する。
 * それ以外は null（何もしない）。
 *
 * condex payload はフェッチ後 state に持ち、着地先は payload・query から **useMemo で純導出**する
 * （effect 内の同期 setState を避ける＝cascading render を作らない・react-hooks/set-state-in-effect 準拠。
 *  setState は async な .then コールバック内のみ＝index 構築フックと同型）。
 */
export function useCondexLanding(query: string, enabled: boolean): CondexLanding | null {
  const [payload, setPayload] = useState<CondexPayload | null>(null);
  const shouldResolve = enabled && looksLikeArticleQuery(query);

  useEffect(() => {
    if (!shouldResolve) return;
    let alive = true;
    loadCondex().then((p) => {
      if (alive) setPayload(p);
    });
    return () => {
      alive = false;
    };
  }, [shouldResolve]);

  return useMemo(
    () => (shouldResolve ? resolveCondexLanding(query, payload) : null),
    [shouldResolve, query, payload],
  );
}
