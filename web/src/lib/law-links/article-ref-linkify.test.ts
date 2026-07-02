import { describe, expect, it } from 'vitest';
import { LAW_METADATA } from '@/data/law-metadata';
import { allLawArticles, mhlwLawArticles } from '@/data/laws';
import {
  linkifyArticleReferences,
  type ArticleRefLink,
  type ArticleRefSegment,
} from './article-ref-linkify';

/** 内部リンク解決の独立オラクル（リンカーと同じ read-only ソースから再構築）。 */
const mhlwSet = new Set<unknown>(mhlwLawArticles);
const curated = allLawArticles.filter((a) => !mhlwSet.has(a));
const corpusKeys = new Set(curated.map((a) => `${a.law}|${a.articleNum}`));
const egovIds = new Set(
  Object.values(LAW_METADATA)
    .map((m) => m.egovLawId)
    .filter((x): x is string => Boolean(x)),
);

/** セグメントのうちリンク（href 付き）だけを取り出す型ガード。 */
function links(segs: ArticleRefSegment[]): ArticleRefLink[] {
  return segs.filter((s): s is ArticleRefLink => 'href' in s);
}

/** 内部深リンクの href → `${正式名称}|${条番号}` が収録集合に存在するか。 */
function internalKey(href: string): string {
  const q = href.slice(href.indexOf('?') + 1);
  const params = new URLSearchParams(q);
  return `${params.get('law')}|${params.get('art')}`;
}

const EGOV_RE = /^https:\/\/laws\.e-gov\.go\.jp\/law\/([^#]+)#Mp-At_(\d+)$/;

describe('linkifyArticleReferences（O18 条文参照リンカー）', () => {
  it('裸の「第N条」は表示中法令の条文へ内部深リンクする', () => {
    const a = curated.find((x) => /^第\d+条$/.test(x.articleNum));
    expect(a).toBeDefined();
    if (!a) return;
    const segs = linkifyArticleReferences(`本規定は${a.articleNum}に定める。`, a.law);
    const ls = links(segs);
    expect(ls).toHaveLength(1);
    expect(ls[0].external).toBe(false);
    expect(ls[0].href).toBe(
      `/law-search?law=${encodeURIComponent(a.law)}&art=${encodeURIComponent(a.articleNum)}`,
    );
    expect(corpusKeys.has(internalKey(ls[0].href))).toBe(true);
  });

  it('略称接頭「安衛則第N条」は別法令を表示中でも当該法令へ解決する', () => {
    const a = curated.find((x) => x.lawShort === '安衛則' && /^第\d+条$/.test(x.articleNum));
    expect(a).toBeDefined();
    if (!a) return;
    // 表示中の文脈法令はあえて別法令にする（接頭が優先される）
    const segs = linkifyArticleReferences(`${a.lawShort}${a.articleNum}を準用する。`, '労働基準法');
    const ls = links(segs);
    expect(ls).toHaveLength(1);
    expect(internalKey(ls[0].href)).toBe(`${a.law}|${a.articleNum}`);
  });

  it('漢数字の条番号を算用数字へ正規化して解決する', () => {
    const segs = linkifyArticleReferences('本条は第六十一条による。', '労働安全衛生法');
    const ls = links(segs);
    expect(ls).toHaveLength(1);
    // 内部なら art=第61条、e-Gov フォールバックなら Mp-At_61 ＝ いずれも 61 条を指す
    if (ls[0].external) {
      expect(ls[0].href).toMatch(/#Mp-At_61$/);
    } else {
      expect(new URLSearchParams(ls[0].href.split('?')[1]).get('art')).toBe('第61条');
    }
  });

  it('収録外の基条参照は e-Gov 条アンカーへ外部リンクする', () => {
    const segs = linkifyArticleReferences('安衛法第99999条を参照。', '労働安全衛生法');
    const ls = links(segs);
    expect(ls).toHaveLength(1);
    expect(ls[0].external).toBe(true);
    const mt = ls[0].href.match(EGOV_RE);
    expect(mt).not.toBeNull();
    expect(mt && egovIds.has(mt[1])).toBe(true);
    expect(mt && mt[2]).toBe('99999');
  });

  it('「令第N条」など別法令を示す助詞が直前の参照はリンクしない（誤リンク回避）', () => {
    const text = '事業者は、令第6条で定める作業について措置を講じなければならない。';
    const segs = linkifyArticleReferences(text, '労働安全衛生法');
    expect(links(segs)).toHaveLength(0);
    expect(segs.map((s) => s.text).join('')).toBe(text);
  });

  it('「同法第N条」もリンクしない（参照先法令が一意でない）', () => {
    const segs = linkifyArticleReferences('同法第20条の規定を準用する。', '労働安全衛生法');
    expect(links(segs)).toHaveLength(0);
  });

  it('収録外の枝番参照は e-Gov 条アンカーが基条しか指せないためリンクしない', () => {
    const segs = linkifyArticleReferences('安衛則第99999条の2による。', '労働安全衛生規則');
    expect(links(segs)).toHaveLength(0);
  });

  it('未知の法令名接頭はリンクしない', () => {
    const segs = linkifyArticleReferences('民法第709条による。', '労働安全衛生法');
    expect(links(segs)).toHaveLength(0);
  });

  it('セグメントの text を連結すると必ず入力文字列に一致する（欠落・重複なし）', () => {
    const samples = [
      '第61条及び第62条、令第6条、安衛則第518条を参照。同法第20条も見よ。',
      '',
      'リンク対象のない普通の本文です。',
      curated[0]?.text ?? '',
    ];
    for (const s of samples) {
      const segs = linkifyArticleReferences(s, '労働安全衛生法');
      expect(segs.map((seg) => seg.text).join('')).toBe(s);
    }
  });

  it('複数参照を含む文で各参照が独立にリンク化される', () => {
    const text = '第518条及び第519条に定める作業床について。';
    const segs = linkifyArticleReferences(text, '労働安全衛生規則');
    const ls = links(segs);
    expect(ls.length).toBeGreaterThanOrEqual(1); // 収録状況に依存するが少なくとも 1 件は着地
    expect(segs.map((s) => s.text).join('')).toBe(text);
  });

  it('コーパス全文で生成リンクの解決率が 100%（幽霊リンク 0）', () => {
    let total = 0;
    for (const a of curated) {
      if (!a.text) continue;
      const segs = linkifyArticleReferences(a.text, a.law);
      // 欠落・重複なし（表示の健全性）
      expect(segs.map((s) => s.text).join('')).toBe(a.text);
      for (const l of links(segs)) {
        total += 1;
        if (l.external) {
          const mt = l.href.match(EGOV_RE);
          expect(mt, `不正な e-Gov リンク: ${l.href}`).not.toBeNull();
          if (mt) {
            expect(egovIds.has(mt[1]), `未知の e-Gov 法令番号: ${mt[1]}`).toBe(true);
            expect(Number(mt[2]) > 0).toBe(true);
          }
        } else {
          expect(
            corpusKeys.has(internalKey(l.href)),
            `収録外への内部リンク（幽霊リンク）: ${l.href}`,
          ).toBe(true);
        }
      }
    }
    // 非空虚性: コーパス本文から実際に一定数のリンクが生成されること
    expect(total).toBeGreaterThan(20);
  });
});
