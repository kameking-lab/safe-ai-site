# NETIS catalogue expansion source record — 2026-09-24

## Scope and result

This record documents the source check that expands the on-site safety catalogue from five to ten distinct NETIS registrations. The resulting category coverage is heavy-equipment collision 5, restricted-zone intrusion 3, fall prevention 2, and heat/work environment 2. A registration that appears in two relevant categories is counted once toward the ten-item total.

The NETIS detail pages below were opened in the Codex in-app browser on 2026-09-24. Each page displayed `2026.9.24 現在`; the registration suffix, technology name, abstract, applicability, exclusions, and cautions were read from the rendered page. Provider pages were also opened in the browser, except the provider PDF for HADES, which was opened in the browser PDF viewer and cross-checked against the provider's HTML NETIS list.

## Ten source-checked registrations

The five records already verified in the independent Astra audit remain unchanged apart from adding explicit limitations and per-card check dates:

- [CG-200009-VE — ヒヤリハンター](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=CG-200009), with [Matrix provider information](https://matrix-inc.co.jp/product/hiyarihunter/hiyari-v2.html).
- [KT-180097-VE — 超音波警報センサー・パノラマOプレミアム](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KT-180097), with [つくし工房 provider information](https://www.tukusi.co.jp/commodity/list/631.html).
- [KK-210060-VE — 重機取付型セーフティカメラシステム「ドボレコJK」](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KK-210060), with [岩崎 provider information](https://www.iwasakinet.co.jp/rental/construction-ict-support/xacti-doboleko-jk/).
- [KT-230282-A — 安全帯フックかけ忘れ防止装置「ハーネスノーティファイ」](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KT-230282), with [Ronk provider catalogue](https://ronk-jp.com/wp-content/uploads/2024/08/923a78cb58e3840064f71fca56ccd563.pdf).
- [QS-210006-A — 移動式ネットワークカメラ「MICS AI」](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=QS-210006), with [Assist You provider information](https://assistyou-m.com/mics/mics_ai/).

The five additions were checked directly as follows:

### QS-240022-A — 安全帯フック着脱確認システム「ハーネスアラート」

- Official: [NETIS detail](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=QS-240022).
- Provider: [YKCアミュレット](https://ykc-amulet.net/harnessalert/).
- Verified basis: an area-setting unit and an IC-tag hook holder warn when the hook remains in the holder in a configured high-work area. Applicable examples include scaffold assembly/disassembly, bridges, roofs, and openings.
- Material limitations: the system detects removal from the holder, not correct attachment to a lifeline. NETIS also requires pre-work alarm checks and battery management; the alert can take two to three seconds.

### KT-230099-VE — 熱中対策バンド

- Official: [NETIS detail](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KT-230099).
- Provider: [Sooki product information](https://sooki.co.jp/irental/allproduct/ct15/i-bow-2025/).
- Verified basis: two sensors measure ambient and skin temperature and estimate changes in core temperature, warning the wearer through sound, light, and vibration. NETIS lists all construction and especially severe hot-work environments as applicable.
- Material limitations: the sensor must contact the skin, a wearer should rest whenever unwell regardless of the alert, and the product is not a medical device.

### KT-260019-A — 現場作業員健康管理システム「TECHNO BAND」

- Official: [NETIS detail](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KT-260019).
- Provider: [Techno Craft registration notice](https://www.tecraft.co.jp/topics/2584/).
- Verified basis: WBGT and age-specific heart-rate data produce four heat-risk levels, with notifications to the wearer and management screen. The system also exposes work-health and SOS functions.
- Material limitations: Bluetooth or LTE connectivity is required. Direct sun can trigger protective shutdown of the wearable, and the product is not a medical device.

### KK-210002-VE — 重機接触防止装置、ハッとセンサー

- Official: [NETIS detail](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KK-210002).
- Provider: [Tsucumore product information](https://tsucumore.com/backsensor-hatto/).
- Verified basis: reflective ultrasonic sensors detect people or objects up to five metres away and warn nearby people and the operator with sound, light, and an in-cab distance display. NETIS lists excavation, road, paving, and tunnel work.
- Material limitations: heavy rain and snowfall are outside the stated conditions. Installation space, cable routing, sensor height/direction, power, and pre-work function checks are required.

### KK-200054-A — カメラ式人検知システム

- Official: [NETIS detail](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KK-200054).
- Provider: [Nishio T&M NETIS list](https://www.nishio-tm.co.jp/netis/) and [provider catalogue](https://www.nishio-tm.co.jp/wordpress/wp-content/uploads/2022/09/HADES_%E8%AA%AC%E6%98%8E%E8%B3%87%E6%96%99.pdf).
- Verified basis: up to four camera feeds are analysed for people and can trigger warnings or compatible machine controls. NETIS also permits wall-mounted use for restricted-zone intrusion detection.
- Material limitations: the natural condition requires visibility of two metres. Automatic stopping is machine- and work-condition-dependent; camera angle and sensitivity need adjustment, lenses need cleaning, and ordinary safety checks remain mandatory.

## Image source and rights record

No manufacturer image, logo, screenshot, or external product photo is copied or hotlinked. The explorer reuses four generic portal-owned category illustrations and explicitly says they are hazard diagrams rather than product photographs. The authoritative record is `web/src/data/safety-image-library/generation-ledger.json`.

- Heavy-equipment collision: `/safety-images/library/previews/collision-hazard.webp`; ledger `S040`; source master `public/safety-images/library/originals/collision-hazard.png`; SHA-256 `601625a0702a3afa2c4157cf3da24c1b76b811392fdb75e41dc1460b51860cd1`; OpenAI image generation; rights `portal-owned-commercial-editable`.
- Restricted zone: `/safety-images/library/previews/equipment-swing-zone.webp`; ledger `S042`; source master `public/safety-images/library/originals/equipment-swing-zone.png`; SHA-256 `8de2446ce4cc3c9f6caf1390e24e3e51df7a4742e071cbb62adb438e87dd8251`; OpenAI image generation; rights `portal-owned-commercial-editable`.
- Fall prevention: `/safety-images/library/previews/fall-hazard.webp`; ledger `S031`; source master `public/safety-images/library/originals/fall-hazard.png`; SHA-256 `3058cd3f1d3c3114814d0e7fc719e6d10fa61bfb70d8143a84267d99e139b35e`; OpenAI image generation; rights `portal-owned-commercial-editable`.
- Heat/work environment: `/safety-images/library/previews/wbgt-display.webp`; ledger `S092`; source master `public/safety-images/library/originals/wbgt-display.png`; SHA-256 `09ba03ee0a0b845dd992851596c95f41237d95f9cb144aa05890d30ba0549134`; OpenAI image generation; rights `portal-owned-commercial-editable`.

The UI also exposes the source method, rights status, and generation-ledger ID under “カテゴリ画像の出典・権利を確認”.

## Interpretation boundary

NETIS information is reference information based partly on applicant submissions. Registration does not certify product performance, guarantee suitability for a specific site, or replace statutory controls, induction, exclusion zones, spotters, inspection, or the responsible person's judgment. The site therefore presents a selected catalogue, keeps the official-search fallback, and includes the material limitations alongside every explanation.
