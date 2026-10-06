# Financial News moderation report

Generated from official machine-readable sources at 2026-10-06T18:27:18.902Z.

## Run summary

- Candidates inspected: 3
- Existing open drafts re-evaluated: 3
- New moderation drafts: 0
- Open moderation drafts: 3
- Publication-ready open drafts: 0
- Rejected by the candidate quality gate: 3
- Duplicates: 0
- Content provider: ManualReviewContentProvider

Merging this PR must never publish an incomplete draft. A draft becomes public only after an editor supplies complete EN/SR/RU copy, runs the promotion command, and the publication quality gate passes.

## Open moderation drafts

| Story | Currencies | Category | Editorial type | Sources | Original date | Candidate gate | Publication gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ECB Consumer Expectations Survey results – August 2026 | EUR | Inflation | survey, expectations | [European Central Bank](https://www.ecb.europa.eu/press/pr/date/2026/html/ecb.pr260918~295b3ab978.en.html) | 2026-09-18 | pass | editorial work required |
| Results of the Inflation Expectations Survey | RSD | Inflation | survey, expectations | [National Bank of Serbia](https://www.nbs.rs/en/scripts/showcontent/index.html?id=21729&konverzija=no) | 2026-09-17 | pass | editorial work required |
| Federal Reserve Board and Federal Open Market Committee release economic projections from the September 15-16 FOMC meeting | USD | Economy | projections | [Board of Governors of the Federal Reserve System](https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916b.htm), [Board of Governors of the Federal Reserve System](https://www.federalreserve.gov/monetarypolicy/fomcprojtabl20260916.htm) (data) | 2026-09-16 | pass | editorial work required |

## Rejected candidates

- **Frank Elderson: Effective supervision through timely remediation** — candidate does not contain a supported monetary-policy signal; standalone value is too low for Balkan Converter users
- **Piero Cipollone: Money in the digital age: digital euro, tokenisation and the role of central banks** — candidate does not contain a supported monetary-policy signal; standalone value is too low for Balkan Converter users
- **Philip R. Lane: Interview with Ansa** — candidate does not contain a supported monetary-policy signal; title matches an excluded low-priority content type; standalone value is too low for Balkan Converter users

## Duplicates

None.

## Reviewer checklist

- Open every official source link in `news/data/drafts.json` and verify the facts.
- Treat surveys, expectations, projections, forecasts and forward-looking indicators as attributed source material, never as observed facts or guaranteed outcomes.
- Write original, neutral EN/SR/RU copy; do not paste source excerpts or add forecasts/advice.
- Run `node tools/news/promote-draft.mjs <draft-id>` for each approved draft.
- Run `node tools/news/generate-news.mjs` and `node --test tests/*.test.mjs`.
- Confirm that only promoted stories add public pages and sitemap entries.
