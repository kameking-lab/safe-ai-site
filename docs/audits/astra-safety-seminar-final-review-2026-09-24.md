# Astra final review — OSH safety seminar — 2026-09-24

Reviewed starting head: `bf8adac75f8fe2b6bf858d558f2344d28bb9c342`, PR [#1006](https://github.com/kameking-lab/safe-ai-site/pull/1006). Scope is PR1's existing 12-slide OSH course. No merge or deployment is authorized in this review.

## Findings and fixes

- **P1 fixed: denied browser storage crashed the whole course.** In real Chromium, replacing Storage getItem/setItem/removeItem with SecurityError caused the page error boundary. Read/write/reset now tolerate denial and quota failures. Invalid queues, response values, duplicates and inconsistent saved progress are rejected. Empty progress does not produce a resume prompt.
- **P2 fixed: quiz semantics did not match keyboard behavior.** The choices claimed radio roles without radio arrow-key navigation. They are now native instant-answer buttons with aria-pressed, operable by Tab, Enter and Space. Feedback retains status semantics and receives focus.
- **P2 fixed: retry progress was always out of five.** Incorrect-only attempts now show their actual question count, including the saved-progress prompt and progressbar maximum.
- **P2 fixed: images could exceed their intended width.** The site-wide image max-width rule won over the utility class. An explicit intrinsic-width cap prevents enlargement beyond the original asset width or 280 CSS pixels.
- **P2 fixed: downloadable files were stale despite an available renderer.** The existing PowerPoint COM exporter worked on this host. It now accepts an optional PDF output, and both public files are synchronized. The builder preserves image aspect ratio, increases caveat contrast and uses an isolated finalizer directory on each run. Detailed content and citations remain in editable PPTX notes.
- **P2 fixed: the article 28-2 evidence detoured through unverified text.** The internal navigator explicitly labels its text as not verified for citation. The e-Gov branch anchor was tested live and is now the primary course/quiz/PPTX-note destination. This follows Fable's exception permitting a branch anchor after actual landing verification.
- **CI hygiene fixed without policy relaxation.** The full Fable receipt duplicated the committed plan and took repository non-runtime JSON/image count from 125 to 126. It was retained outside the repo. Receipt SHA-256: `91f8c0b4f64ed8619005dc50fab28785327b47656443a728dc93ab65dc5997a9`. The plan itself remains committed.

## UX judgment

The short slide headline and three points are easy to scan. Full narration remains available in one disclosure, while five stage controls give clear previous/play/next/list/fullscreen actions. The 12 poses are visually different and their props match each topic: detective, law book, scales, coordination megaphone, planning book, KY sheet, meter, PPE, pointing, first aid and closing salute. They are illustrative cues, not evidence photographs.

At 320/390px the title can wrap across lines, but stays readable and within the stage. Desktop projection has clear title/point hierarchy. No cropped text or overlapping elements were found in the complete PPTX/PDF render. Small source footers supplement the full source URLs in notes; they are not a substitute for the course's clickable references. The 12-slide/unchanged-audio constraint keeps this an introductory module, not a comprehensive treatment of all OSH duties.

## Legal and destination review

All public registry sources remain e-Gov or MHLW. No personal Drive material is used as public authority.

- Live Chromium opened e-Gov anchors for [article 1](https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_1), [3](https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_3), [4](https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_4), [28-2](https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_28_2), [29](https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_29), [30](https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_30), [59](https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_59) and [61](https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_61). Each target heading landed at y=143–144px in a fresh tab. e-Gov displayed the current 2026-04-01 revision. Its actual chapter-qualified DOM IDs differ from the short URL fragments; absence of a literal fragment ID alone is not a broken-link finding.
- [MHLW risk-assessment guidance](https://www.mhlw.go.jp/web/t_doc?dataId=00tb3050&dataType=1&pageNo=1) supports hazard identification, risk estimation, priority, reduction and recording/sharing; its order puts elimination/change before engineering, administrative and PPE measures. Quiz reasons remain introductory paraphrases, not new legal duties.
- [MHLW OSHMS guidance](https://www.mhlw.go.jp/content/11200000/000591670.pdf) supports the planning/implementation/check/improvement cycle.
- The [2025 amendment, supplementary article 1](https://www.mhlw.go.jp/content/11300000/001497670.pdf) distinguishes the general 2026-04-01 commencement and the listed 2027-04-01 education provisions. Future-effective content, article 30 applicability and non-substitution for statutory training remain visible caveats.

Local landing evidence is `../seminar-review-evidence/egov-{1,3,4,28-2,29,30,59,61}.png`; `internal-28-2.png` records why the direct-primary link was preferable. Screenshots are retained locally rather than adding raw evidence images to Git.

## Validation

- Focused Vitest: four files, 30 tests passed. Includes narration hashes, stage limits, assets, source refs, answer secrecy, grading, retry, resume, denied storage and corrupt storage.
- Focused ESLint and TypeScript checks passed.
- Production build and source/public-identity/storage/built-route guards passed; 3,450 static pages.
- Production Playwright: 13 tests passed. Includes 320/390/1440 geometry, five controls, 44px targets, ten-tap completion, no-JS fallback, answer/feedback semantics, retry/resume/back, denied/corrupt storage and light/dark axe at 320/390/768/1440.
- Before a choice, a real accessibility snapshot contained only the question and four choices, with no answer/explanation node. Correctness and reasons are not rendered until grading.
- PPTX/PDF: 12 slides/pages, 12 notes, all per-page headlines, title metadata and primary article anchors passed. All final PDF page pixels match the visually reviewed renders after the note-only primary-link update. Exact public file hashes and conversion steps: [artifact record](../training/safety-management-basics-osh-law-artifacts.md).
- No voice-choice UI or player voice credits were reintroduced. No routes or new legal claims were added. Narration and audio remain unchanged.

## Release decision

**Local UX and implementation: PASS after fixes. Draft remains pending the owner rationale review and the final head's GitHub checks.** CI outcomes must be read at the exact pushed head; earlier successful checks are not a substitute.

The unavailable bundled presentation renderer and missing manual e-Gov screenshots are no longer blockers. Remaining human scope is the labor-safety consultant's approval of the static rationale table in the PR. Actual-phone use, projected slide-show testing and production Lighthouse are post-merge verification rather than evidence claimed here. No merge, production deployment or Draft removal was performed.
