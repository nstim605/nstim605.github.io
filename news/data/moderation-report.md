# Financial News moderation report

Generated from official machine-readable sources at 2026-09-29T10:13:41.060Z.

## Run summary

- Candidates inspected: 70
- New moderation drafts: 7
- Open moderation drafts: 7
- Publication-ready open drafts: 0
- Rejected by the candidate quality gate: 62
- Duplicates: 9
- Content provider: ManualReviewContentProvider

Merging this PR must never publish an incomplete draft. A draft becomes public only after an editor supplies complete EN/SR/RU copy, runs the promotion command, and the publication quality gate passes.

## Open moderation drafts

| Story | Currencies | Category | Sources | Original date | Candidate gate | Publication gate |
| --- | --- | --- | --- | --- | --- | --- |
| ECB amends monetary policy implementation guidelines as part of regular review | EUR | Central Banks | [European Central Bank](https://www.ecb.europa.eu//press/pr/date/2026/html/ecb.pr260929~050089e922.en.html) | 2026-09-29 | pass | editorial work required |
| ECB Consumer Expectations Survey results – August 2026 | EUR | Central Banks | [European Central Bank](https://www.ecb.europa.eu//press/pr/date/2026/html/ecb.pr260918~295b3ab978.en.html) | 2026-09-18 | pass | editorial work required |
| Results of the Inflation Expectations Survey | RSD | Inflation | [National Bank of Serbia](https://www.nbs.rs/en/scripts/showcontent/index.html?id=21729&konverzija=no) | 2026-09-17 | pass | editorial work required |
| Federal Reserve Board and Federal Open Market Committee release economic projections from the September 15-16 FOMC meeting | USD | Central Banks | [Board of Governors of the Federal Reserve System](https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916b.htm) | 2026-09-16 | pass | editorial work required |
| ECB wage tracker at 2.7% in H1 2027, pointing to a modest uptick in negotiated wage growth | EUR | Central Banks | [European Central Bank](https://www.ecb.europa.eu//press/pr/date/2026/html/ecb.pr260916~7bc58ebef4.en.html) | 2026-09-16 | pass | editorial work required |
| Inflation movements in August 2026 | RSD | Inflation | [National Bank of Serbia](https://www.nbs.rs/en/scripts/showcontent/index.html?id=21723&konverzija=no) | 2026-09-14 | pass | editorial work required |
| Key policy rate kept unchanged | RSD | Interest Rates | [National Bank of Serbia](https://www.nbs.rs/en/scripts/showcontent/index.html?id=21715&konverzija=no) | 2026-09-10 | pass | editorial work required |

## Rejected candidates

- **Christine Lagarde: Hearing of the Committee on Economic and Monetary Affairs of the European Parliament** — title does not contain a supported monetary-policy signal; title matches an excluded low-priority content type
- **ECB Executive Board member Isabel Schnabel to resign to take senior role at IMF** — title does not contain a supported monetary-policy signal; title matches an excluded low-priority content type
- **Philip R. Lane: The outlook for the euro area economy** — title does not contain a supported monetary-policy signal
- **The digitalisation of money, payments and finance** — title does not contain a supported monetary-policy signal; title matches an excluded low-priority content type
- **Almost ten million people took part in ECB survey on new euro banknotes** — title does not contain a supported monetary-policy signal; title matches an excluded low-priority content type
- **Philip R. Lane: Interview with Le Temps** — title does not contain a supported monetary-policy signal; title matches an excluded low-priority content type
- **ECB to invest part of own funds in tokenised securities, with settlement via Pontes** — title does not contain a supported monetary-policy signal; title matches an excluded low-priority content type
- **Eurosystem brings central bank money to tokenised finance** — title does not contain a supported monetary-policy signal
- **Boris Vujčić: Interview with Reuters** — title does not contain a supported monetary-policy signal; title matches an excluded low-priority content type
- **Christine Lagarde: A new age of capital: growth, sovereignty and AI** — title does not contain a supported monetary-policy signal
- **Piero Cipollone: The future of euro cash: trusted today, designed for tomorrow** — title does not contain a supported monetary-policy signal; title matches an excluded low-priority content type
- **Long-standing higher profitability of dinar savings** — candidate is older than 21 days; title does not contain a supported monetary-policy signal
- **Minutes of the Board's discount rate meetings on July 20 and July 29, 2026** — candidate is older than 21 days; title does not contain a supported monetary-policy signal
- **Results of the Inflation Expectations Survey** — candidate is older than 21 days
- **Minutes of the Federal Open Market Committee, July 28–29, 2026** — candidate is older than 21 days; title does not contain a supported monetary-policy signal
- **Introductory speech by Governor Jorgovanka Tabaković at the presentation of the Inflation Report – August 2026** — candidate is older than 21 days; title matches an excluded low-priority content type; source host www.nbs.rshttps is not approved
- **Inflation Report – August 2026** — candidate is older than 21 days; source host www.nbs.rshttps is not approved
- **Key policy rate kept unchanged** — candidate is older than 21 days
- **Inflation movements in July 2026** — candidate is older than 21 days
- **Federal Reserve issues FOMC statement** — candidate is older than 21 days
- …and 42 more (see the JSON report for details).

## Duplicates

- **Philip R. Lane: The outlook for the euro area economy** — collapsed into candidate 4738b8000d5e94ec817e3487
- **Federal Reserve issues FOMC statement** — same event as fed-rates-2026-09-16
- **Key policy rate kept unchanged** — collapsed into candidate c46d29bce1c4a68d30d5d769
- **Key policy rate kept unchanged** — collapsed into candidate ae2179f0bbd9ceec6b18bae2
- **Key policy rate kept unchanged** — collapsed into candidate 161240b1483a0b7b7f228443
- **Key policy rate kept unchanged** — collapsed into candidate 4b94a629eb6b361b1b75a2ad
- **Key policy rate kept unchanged** — collapsed into candidate 992090355767e6c7257aa6c2
- **Key policy rate kept unchanged** — collapsed into candidate 1dd89e48fdfacacd424c42f8
- **Key policy rate kept on hold** — collapsed into candidate 960aa649ed4647ec64180bd6

## Reviewer checklist

- Open every official source link in `news/data/drafts.json` and verify the facts.
- Write original, neutral EN/SR/RU copy; do not paste source excerpts or add forecasts/advice.
- Run `node tools/news/promote-draft.mjs <draft-id>` for each approved draft.
- Run `node tools/news/generate-news.mjs` and `node --test tests/*.test.mjs`.
- Confirm that only promoted stories add public pages and sitemap entries.
