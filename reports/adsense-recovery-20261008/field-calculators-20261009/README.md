# Field calculator release evidence (2026-10-09)

Existing 12 routes now start with blank numeric fields, offer an explicit example, pair units and numbered diagrams with inputs, and update local estimates. Partial example edits remain marked as examples. Explicit calculation retains local history and Copy/CSV/PDF. Five additional tools cover polygon area, curing sheets, boards, paint and mesh. Deformed rebar uses the checked JFE table for 12 sizes; round steel remains geometric.

Source implementation commit: 35fd609d46d072e3a3da164a95fcb5cf9e44de9a. The subsequent citation correction only changes the product title to Hiビニレックスエコ70 for the same official URL and consumption values.

Validation: standard npm build before and after passed; full ESLint passed (0 errors, 32 warnings); 210 targeted unit tests passed; 11 Chrome E2E tests passed, including retained offline/export/history/no-JS/accessibility/responsive checks. All 17 routes passed empty input to explicit example calculation and history; 390px overflow and console errors were zero. Independent reviewer checks: 25 for new formulas and 46 for rebar. Separate UX review passed dedicated units, example edit/reset, semantic dimensions, original polygon numbering, keyboard focus and 44px tap targets.

Full before/after facts, 24 screenshots, validation JSON and source hashes are retained in the shared control-plane workspace: C:/Users/kanet/20260522/note-automation/reports/adsense-recovery-20261008/field-calculators-20261009. Raw evidence is kept outside the deployment Git tree to preserve the existing storage budget. before.json firstInputY was measured after calculation and must not be interpreted as initial viewport placement.

Official sources: [JFE nominal mass table, PDF p70 / printed 2-12](https://www.jfe-steel.co.jp/products/kennavi/assets/pdf/kennavi_all.pdf), [JFE Bars crosscheck, PDF p5](https://www.jfe-bs.co.jp/files/size_concrete.pdf), [Yoshino board standard sizes](https://yoshino-gypsum.com/tpc/list_spec), [Nippon Paint consumption per coat and package](https://www.nipponpaint.co.jp/products/building/68/).

Remaining priority tools follow separately after this release: pipe trench quantities, curb/channel lengths, sealant containers, slope area, and foundation gravel/blinding concrete. Merge and production publication are handled serially by the parent.

## Source manifest

- web/e2e/ai-training-construction-calculators.spec.ts : 0fc62aae5b60ea835fd48180f554291b4be3027a7deea5932a27cd948ce55049
- web/e2e/field-calculators-inputs.spec.ts : b2505586fbbb3e937f6aa88a68ea96c6fb9ca3a52cee2bc6e9a330a347e4ea97
- web/src/app/(main)/tools/construction-calculators/[slug]/page.tsx : cabe6469e825dcd50e574b4eaaa1f18609acedb5ba2b258656e9b95ba1cff7dd
- web/src/app/(main)/tools/construction-calculators/page.test.tsx : b89430d4d3ea23e3453692b1810a735f99b769b39367200da0aeeaf8496106be
- web/src/app/(main)/tools/construction-calculators/page.tsx : befffbee11201779b1b5f834930cebccbf2181946e9d7c06bd385b70f251c756
- web/src/app/sitemap.ai-training-construction-calculators.test.ts : 7139ef39dfd0737ee019ea78e7a9d6e7745f3866362a82caa867b026ffcd4c95
- web/src/components/construction-calculators/construction-calculator-client.test.tsx : 1042734b88eb028a854d67afb0884924f4544541959467fcd698975a67ac70b0
- web/src/components/construction-calculators/construction-calculator-client.tsx : ad6808ecec02c288522dd451e17a52823170bc3d72c4e76e5b9f5d56e28c5a4f
- web/src/components/construction-calculators/calculator-input-guide.test.tsx : 0a2fa16ff1bf631323b8cbb4e39509f85ac0e50d12429ff5d741a2b9f3576756
- web/src/components/construction-calculators/calculator-input-guide.tsx : 0fd0a0d9945791d0c0ddb66710c458580777f5dab01a001c5b9cb14d1bb98ec2
- web/src/components/construction-calculators/construction-calculator-directory.tsx : f22e86cb601ad59af1df91cfe259004cebef015cb1a8d2bffa23c45624991a36
- web/src/data/construction-calculators/coming-soon.ts : e5d77ca98270701182104b92ee384560e78e54fe7b35d000002bb356f166a875
- web/src/data/construction-calculators/formula-registry.ts : 849faf699c60f1d94f8d59b787e97dfe85e9dcef47a98582ff4c0cdb75e17a0b
- web/src/data/construction-calculators/input-guide-copy.ts : 48290e103edd99b81a2bc929d04bdf74a152a4479143dde19901d8969bf4eb48
- web/src/data/features-catalog.ts : 81fe0ea00787acc9473f58fde63039ca5dc8b6e05e36960a53db569e21a5ee76
- web/src/lib/construction-calculators/construction-calculators.test.ts : d1dec5eacc43fb01f19c3f6c69084b3b77813086d1898312494660c3b0671962
- web/src/lib/construction-calculators/rebar-spacing.ts : a0c1e36dd686acbeea578cf06b747cd7b8815656e2790e2c336db357b697c1f1
- web/src/lib/construction-calculators/rebar-weight.ts : 71390e0c54b90af4d94cb51ad7729b3e6a3ba7f29b53c8738f56c6c41ab5f007
- web/src/lib/construction-calculators/types.ts : 5454e835b51522dbce482925140ee44d00be797d3aee1e1d757deaaa48d81e6c
- web/src/lib/construction-calculators/additional-quantity.ts : 5abf1263b3e4a76f12c1fb6947d6f279635fcfedb488ba9d785dd63daa1066d3
- web/src/lib/construction-calculators/additional-quantity.test.ts : dd7dd14011c26f2e0cf37e01dae8fcffc07e9289fa59dfe37426f98fcb1720fc

## Validation facts

{
  "baseline": {
    "standardNpmBuild": "pass",
    "dependencies": "npm ci --ignore-scripts + npm exec prisma generate; no dependency changes"
  },
  "final": {
    "standardNpmBuild": "pass",
    "lint": {
      "errors": 0,
      "warnings": 32
    },
    "targetTests": {
      "passed": 210,
      "failed": 0,
      "files": 9
    },
    "browserE2E": {
      "newTests": 5,
      "existingSmokeTests": 6,
      "passed": 11,
      "failed": 0,
      "channel": "Chrome headless"
    },
    "browserRoutes": {
      "routes": 17,
      "initialNumbersBlank": 17,
      "explicitExampleCalculation": 17,
      "historySaved": 17,
      "horizontalOverflow": [],
      "consoleErrors": []
    },
    "independentFormulaReview": {
      "firstFiveChecks": 25,
      "rebarChecks": 46,
      "reportedBy": "field_formula_review"
    }
  },
  "limitations": [
    "Rectangular whole-sheet layout compares two uniform orientations; does not optimize mixed directions, cuts, obstacles or openings.",
    "Paint consumption is per coat, from the actual product specification; not an automatic waterproofing system design.",
    "Polygon inputs use local planar metres, not geographic degrees.",
    "Rebar nominal mass is an estimate and does not include real tolerance or cutting loss."
  ]
}
