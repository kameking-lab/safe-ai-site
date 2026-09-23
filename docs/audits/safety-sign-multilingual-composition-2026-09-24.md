# Safety sign multilingual composition audit — 2026-09-24

Base: `04fd971ae167bb98674cc2da74c879fc7c148b1c` (merged PR #1001). Production inspected at `https://www.anzen-ai-portal.jp/materials/safety-images`; changes verified against the isolated branch's locked Next.js 16.2.11 production build.

## Finding and change

The existing controls already supported Japanese by default, both A4 orientations, and simultaneous Japanese/Vietnamese/Simplified Chinese/English/Indonesian selection for all 100 templates. However, a five-language A4 landscape helmet sign covered the helmet and face with its text band. This was visible in both the production preview and the actual production PDF.

Multilingual signs now allocate separate illustration and text regions: side by side for landscape, stacked for portrait/square. The browser and export renderer use the same composition function. Japanese-only and clean-image outputs retain their original full-canvas layout. No illustrations or translations were regenerated.

The hub's duplicate ten-card showcase was removed; the initial 20 results, six quick filters, and progressive loading remain. The standalone browser smoke script was also updated from the removed language dropdown and old numeric-filter label to the current checkbox controls.

## Validation

- 45 targeted Vitest tests passed, including all 100 templates with five languages in both A4 orientations, all 13 size geometries/three text positions with separate regions, export resource limits, numeric placeholders, and download validation.
- 15/15 library Playwright tests passed against the production build, including search, filtered/deep-list Back and explicit returns, 320–1440px reflow, keyboard selection, all file formats, no-JavaScript fallback, and light/dark/forced-color accessibility checks.
- Targeted ESLint, TypeScript, the complete production build (3,450 generated pages), and the repaired standalone browser smoke passed. Browser smoke recorded zero page/console errors and zero asset failures.
- Independent Chromium checks at 320, 390, and 1440px selected languages using Space in reverse order. Inputs and SVG text remained `ja, vi, zh-CN, en, id`; every text bounding box stayed within its region; horizontal overflow and serious/critical editor axe violations were zero.
- Six real button downloads: JPEG/PNG/PDF for A4 portrait and landscape. Rasters were exactly 2480×3508 or 3508×2480 at 300dpi. PDF MediaBoxes were 595.276×841.890 or 841.890×595.276 points, and each PDF embedded its corresponding downloaded JPEG byte for byte. Both PDF pages were rendered with Poppler and visually inspected: the helmet/face and all five language messages remain visible.

## State and translation boundaries

- Browser Back and the explicit library return restore list controls, expanded results and scroll. A direct hub reload before returning from a detail resets filters; a reload after a restored return retains them. Detail reload starts from Japanese and the recommended size. Custom wording is not placed in a URL or filename. Persistence behavior was inspected and left unchanged.
- Customized printing uses the selected PDF output. The separate no-JavaScript HTML print route remains a Japanese preset and does not carry editor selections.
- All 500 source text records exactly matched the translation registry. That registry marks 24 as officially confirmed and does **not** claim native-speaker review for the remainder. This audit did not add translations or independently certify every foreign-language sentence. Language priority was checked against the [MHLW October 2025 employment report](https://www.mhlw.go.jp/stf/newpage_68794.html): Vietnamese and Chinese are the two largest nationality groups; English remains a shared-language option, not a Filipino translation.

## Performance evidence

At 390px, independent browser snapshots counted 1,060 DOM elements/33 images on production and 906 elements/22 images locally after removing the duplicate showcase; both retained 20 initial result articles. These are diagnostic snapshots of different serving environments, not a controlled before/after timing comparison.

The repository Lighthouse runner hit Windows `chrome-launcher` temporary-directory cleanup `EPERM` failures after collecting reports. Those sessions were not accepted as passing gates. A dedicated Chrome 153 instance was used for a separate three-run mobile diagnostic with Lighthouse 12.8.2 to avoid the failing launcher cleanup. All three CLI runs exited successfully: Performance 91/92/91, TBT 8.5/17.5/30ms (median 17.5ms), accessibility/Best Practices/SEO 100 each, DOM 857, CLS 0. Simulated LCP was 3.45/3.32/3.42s (median 3.42s), above the 3s advisory. These local diagnostics do not replace CI's performance budget or constitute a controlled before/after timing comparison.

Raw scripts, screenshots, downloaded files, build log and Lighthouse JSON stay outside Git in `%TEMP%\astra-sign-multilingual-20260924`. No merge or deployment was performed.
