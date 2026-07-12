/**
 * 無償教材デッキの登録（curriculum_id を宣言したデッキのみ網羅ゲート対象）。
 * 既存 PPTX サンプル（data/seminars/*.yaml）は宣言なし＝非対象で共存（企画 02章§4 ratchet）。
 */

import type { EduDeck } from "./types";
import { FULLHARNESS_DECK } from "./fullharness";
import { NECCHU_DECK } from "./necchu";
import { DUST_DECK } from "./dust";
import { TEIATSU_DECK } from "./teiatsu";
import { OXYGEN_1_DECK } from "./oxygen-1";
import { OXYGEN_2_DECK } from "./oxygen-2";

export type { EduDeck, EduSlide } from "./types";

export const EDUCATION_DECKS: readonly EduDeck[] = [
  FULLHARNESS_DECK,
  NECCHU_DECK,
  DUST_DECK,
  TEIATSU_DECK,
  OXYGEN_1_DECK,
  OXYGEN_2_DECK,
];

const BY_SLUG = new Map(EDUCATION_DECKS.map((d) => [d.slug, d]));

export function getDeck(slug: string): EduDeck | undefined {
  return BY_SLUG.get(slug);
}
