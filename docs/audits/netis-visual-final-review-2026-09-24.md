# NETIS visual browser final review — 2026-09-24

Acceptance: **FAIL — official product photographs remain missing. Keep PR #1003 draft.**

The incoming remote head was `060207d527181cc94f6f6acc2a715b5c10e617d9`.
Latest main `04fd971ae167bb98674cc2da74c879fc7c148b1c` (sign library #1001) was merged without conflicts before verification. NETIS edits do not overlap the sign library files.

## Corrected during review

- Re-selecting the active category now focuses and scrolls to its results without inserting duplicate history. Reduced-motion preference is respected.
- Category controls form a named ARIA group. Existing pressed state, result announcements, Enter/Space activation, query preservation, reload/Back restoration, and provider/NETIS links remain.
- Removed the repeated safety-sign art from product cards. It was a category diagram, not an actual picture of the named product.
- Explicitly label the remaining category imagery as diagrams rather than product photos. Keep full diagrams visible and show all four categories in one desktop row; show the WBGT instrument instead of cropping it out.
- Added browser coverage for repeated selection, the two restricted-zone products, unknown category fallback, unrelated query preservation, scoped axe checks, and every visible NETIS control's 44px dimensions.

## Product-image provenance and unmet requirement

All five original technologies, registration numbers, descriptions, and provider links are preserved. No product or official-image claim was invented. The category assets remain the repository-owned `public/safety-images/library/previews/` illustrations; they do not satisfy the requested product-image acceptance criterion.

Official/provider pages checked:

- Hiyari Hunter: <https://matrix-inc.co.jp/product/hiyarihunter/hiyari-v2.html>. Real product imagery exists on the provider page; no embedding/republication permission was established from the page or <https://matrix-inc.co.jp/info/privacy.html>.
- Panorama 0 Premium: <https://www.tukusi.co.jp/commodity/list/631.html>. <https://www.tukusi.co.jp/info/regulation.php> states that copying/reposting beyond legally permitted use requires prior written permission. No such permission record is present in this branch.
- Doboreco JK: <https://www.iwasakinet.co.jp/rental/construction-ict-support/xacti-doboleko-jk/>. <https://www.iwasakinet.co.jp/terms-of-use/> requires prior permission for reproduction/transmission of website content outside permitted legal use. No such permission record is present. The manufacturer's site <https://xacti-co.com/> did not establish an alternative image license.
- Harness Notify: <https://ronk-jp.com/wp-content/uploads/2024/08/923a78cb58e3840064f71fca56ccd563.pdf>. The existing catalog link is retained; a reusable image license was not established.
- MICS AI: <https://assistyou-m.com/mics/mics_ai/>. The product page and <https://assistyou-m.com/privacy-policy/> did not establish embedding/republication permission.

NETIS detail access was unavailable to the research fetch. NETIS listing alone is not treated as permission to redistribute a supplier's images. No prohibited images were downloaded, committed, or hotlinked. Image availability and image reuse permission are separate facts.

To pass acceptance, supply official image files with an applicable reuse license or permission record for these five products, record source/rights provenance, render those images on the technology cards, and repeat visual checks. Public source links and honest category illustrations alone do not complete that requirement.

## Verification scope

- Unit tests: NETIS, safety goods, and the recently merged sign-library editor/data/renderer.
- Full ESLint, TypeScript no-emit check, and production build with the project's deployment/public-identity/storage guards.
- Chromium: NETIS and complete sign-library E2E suites, 320/390/1280px NETIS geometry and screenshots, keyboard/ARIA, URL state and clear zero results.
- Final command outcomes and exact pushed head are reported with the review handoff. No ready-for-review transition, main merge, or production deployment is authorized by this review.
