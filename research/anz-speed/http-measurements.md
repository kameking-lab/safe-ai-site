# HTTP measurements

Times are milliseconds. Production after-change timings are unmeasured: no deployment was performed.

## production-before

Base: https://www.anzen-ai-portal.jp
At: 2026-11-14T00:16:01.555Z

| Path | Native | Sample | Status | Headers ms | First text ms | Total ms | Region |
|---|---|---:|---:|---:|---:|---:|---|
| /api/auth/session | False | 0 | 200 | 364 | n/a | 366 | hnd1::iad1::fmzxm-1794615354051-f3311c25f25f |
| /api/auth/session | False | 1 | 200 | 251 | n/a | 252 | hnd1::iad1::n4dzt-1794615354384-e62a44417514 |
| /api/auth/session | False | 2 | 200 | 215 | n/a | 215 | hnd1::iad1::pv429-1794615354611-a1b4c3b2b970 |
| /api/me/entitlements | False | 0 | 401 | 220 | n/a | 221 | hnd1::iad1::x66gp-1794615354825-044d8c39ab90 |
| /api/me/entitlements | False | 1 | 401 | 276 | n/a | 276 | hnd1::iad1::x66gp-1794615355101-e23fc3ad31fc |
| /api/me/entitlements | False | 2 | 401 | 203 | n/a | 203 | hnd1::iad1::pv429-1794615355323-6d7e459e3d68 |
| /api/mobile/v1/capabilities | False | 0 | 401 | 219 | n/a | 219 | hnd1::iad1::vbthc-1794615355528-3057eaf59fd8 |
| /api/mobile/v1/capabilities | False | 1 | 401 | 216 | n/a | 216 | hnd1::iad1::fmzxm-1794615355745-bf486600bc76 |
| /api/mobile/v1/capabilities | False | 2 | 401 | 205 | n/a | 205 | hnd1::iad1::cn9ql-1794615355961-acd9386acbea |
| /api/mobile/v1/capabilities | True | 0 | 200 | 2664 | n/a | 2664 | hnd1::iad1::fmzxm-1794615356167-2469c5784157 |
| /api/mobile/v1/capabilities | True | 1 | 200 | 894 | n/a | 894 | hnd1::iad1::5vsfv-1794615358830-a01107cf279a |
| /api/mobile/v1/capabilities | True | 2 | 200 | 868 | n/a | 869 | hnd1::iad1::q2nww-1794615359724-88ee82ee4b93 |
| /api/mobile/v1/billing/config | False | 0 | 200 | 565 | n/a | 567 | hnd1::iad1::q2nww-1794615360593-9102f986614c |
| /api/mobile/v1/billing/config | False | 1 | 200 | 440 | n/a | 440 | hnd1::iad1::rt7t4-1794615361160-e96bf749f41c |
| /api/mobile/v1/billing/config | False | 2 | 200 | 426 | n/a | 426 | hnd1::iad1::btls9-1794615361601-1678fcfab141 |

## production-chat-before

Base: https://www.anzen-ai-portal.jp
At: 2026-11-14T00:26:00.948Z

| Path | Native | Sample | Status | Headers ms | First text ms | Total ms | Region |
|---|---|---:|---:|---:|---:|---:|---|
| n/a | False | n/a | 429 | 2707 | None | 2708 | hnd1::iad1::fxxzm-1794615958115-addaf9126bcf |
| n/a | True | n/a | 429 | 688 | None | 688 | hnd1::iad1::tn4s6-1794615960766-61a1869e70d5 |

## local-api-before

Base: http://127.0.0.1:3221
At: 2026-11-14T00:17:27.017Z

| Path | Native | Sample | Status | Headers ms | First text ms | Total ms | Region |
|---|---|---:|---:|---:|---:|---:|---|
| /api/auth/session | False | 0 | 503 | 128 | n/a | 130 | None |
| /api/auth/session | False | 1 | 503 | 7 | n/a | 8 | None |
| /api/auth/session | False | 2 | 503 | 7 | n/a | 7 | None |
| /api/me/entitlements | False | 0 | 401 | 595 | n/a | 595 | None |
| /api/me/entitlements | False | 1 | 401 | 31 | n/a | 31 | None |
| /api/me/entitlements | False | 2 | 401 | 15 | n/a | 15 | None |
| /api/mobile/v1/capabilities | False | 0 | 401 | 250 | n/a | 250 | None |
| /api/mobile/v1/capabilities | False | 1 | 401 | 32 | n/a | 32 | None |
| /api/mobile/v1/capabilities | False | 2 | 401 | 15 | n/a | 15 | None |
| /api/mobile/v1/capabilities | True | 0 | 503 | 12 | n/a | 12 | None |
| /api/mobile/v1/capabilities | True | 1 | 503 | 11 | n/a | 11 | None |
| /api/mobile/v1/capabilities | True | 2 | 503 | 12 | n/a | 12 | None |
| /api/mobile/v1/billing/config | False | 0 | 200 | 193 | n/a | 193 | None |
| /api/mobile/v1/billing/config | False | 1 | 200 | 21 | n/a | 21 | None |
| /api/mobile/v1/billing/config | False | 2 | 200 | 12 | n/a | 12 | None |

