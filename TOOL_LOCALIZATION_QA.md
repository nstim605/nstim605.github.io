# Web Tool Localization QA

Date: 2026-09-09

## Scope

- 8 existing web tools
- 44 production locale variants
- 43 non-English variants per tool
- 344 newly generated localized tool pages
- Stable English slugs under the existing `/{locale}/{slug}/` routing model

The translation catalog contains 433 source strings per locale. Automated checks require every value to be present and non-empty, preserve placeholders, reject obvious English fallback, and validate the generated HTML rather than only the source catalog.

## Status definition

- **PASS**: automated and linguistic confidence checks passed.
- **LOW CONFIDENCE**: structural, runtime, SEO, and responsive checks passed, but native-level linguistic naturalness has not been independently confirmed.
- **FAIL**: a blocking structural, runtime, SEO, layout, or known linguistic defect remains.

## Locale results

| Locale | Result | Notes |
| --- | --- | --- |
| en | PASS | Source locale; existing production copy and logic preserved. |
| sr | LOW CONFIDENCE | Serbian Cyrillic terminology reviewed and obvious transliterations corrected; native review still recommended. |
| bs | LOW CONFIDENCE | Obvious untranslated tool terms corrected; native review recommended. |
| hr | LOW CONFIDENCE | Automated QA passed; native review recommended. |
| sq | LOW CONFIDENCE | Automated QA passed; native review recommended. |
| mk | LOW CONFIDENCE | Automated QA passed; native review recommended. |
| bg | LOW CONFIDENCE | Automated QA passed; native review recommended. |
| ro | LOW CONFIDENCE | Automated QA passed; native review recommended. |
| hu | LOW CONFIDENCE | Priority terminology corrected; native review recommended. |
| pl | LOW CONFIDENCE | Automated QA passed; native review recommended. |
| cs | LOW CONFIDENCE | Priority terminology corrected; native review recommended. |
| sk | LOW CONFIDENCE | Priority terminology corrected; native review recommended. |
| sl | LOW CONFIDENCE | Automated QA passed; native review recommended. |
| de | LOW CONFIDENCE | Financial terms and long compound headings revised; responsive QA passed. Native review recommended. |
| fr | LOW CONFIDENCE | Priority manual inspection and automated QA passed; native review recommended. |
| it | LOW CONFIDENCE | Automated QA passed; native review recommended. |
| es-ES | LOW CONFIDENCE | Priority manual inspection and automated QA passed; native review recommended. |
| es-419 | LOW CONFIDENCE | Priority manual inspection and automated QA passed; native review recommended. |
| pt-BR | LOW CONFIDENCE | Exchange-markup terminology corrected; native review recommended. |
| pt-PT | LOW CONFIDENCE | Automated QA passed; native review recommended. |
| nl | LOW CONFIDENCE | Long headings revised and responsive QA passed; native review recommended. |
| da | LOW CONFIDENCE | Long heading and navigation terminology revised; native review recommended. |
| sv | LOW CONFIDENCE | Long financial and widget headings revised; native review recommended. |
| nb | LOW CONFIDENCE | Long financial and travel-budget headings revised; native review recommended. |
| fi | LOW CONFIDENCE | Long widget heading revised; native review recommended. |
| is | LOW CONFIDENCE | Long financial and widget headings revised; native review recommended. |
| el | LOW CONFIDENCE | Priority terminology corrected; native review recommended. |
| tr | LOW CONFIDENCE | Automated QA passed; native review recommended. |
| ru | LOW CONFIDENCE | Reference-rate terminology and obvious machine calques corrected; native review recommended. |
| uk | LOW CONFIDENCE | Automated QA passed; native review recommended. |
| ar | LOW CONFIDENCE | RTL render/runtime QA passed and markup terminology corrected; native review recommended. |
| he | LOW CONFIDENCE | RTL render/runtime QA passed and financial terminology corrected; native review recommended. |
| fa | LOW CONFIDENCE | RTL render/runtime QA passed; native review recommended. |
| ur | LOW CONFIDENCE | RTL render/runtime QA passed; native review recommended. |
| hi | LOW CONFIDENCE | Complex-script render QA passed; native review recommended. |
| bn | LOW CONFIDENCE | Complex-script render QA passed; native review recommended. |
| id | LOW CONFIDENCE | Uses the production Android `in` to web `id` mapping; native review recommended. |
| ms | LOW CONFIDENCE | Automated QA passed; native review recommended. |
| th | LOW CONFIDENCE | Complex-script render QA passed; native review recommended. |
| vi | LOW CONFIDENCE | Obvious untranslated UI terms corrected; native review recommended. |
| zh-Hans | LOW CONFIDENCE | CJK render/runtime QA passed; native review recommended. |
| zh-Hant | LOW CONFIDENCE | CJK render/runtime QA passed; native review recommended. |
| ja | LOW CONFIDENCE | CJK render/runtime QA passed; native review recommended. |
| ko | LOW CONFIDENCE | CJK render QA passed; native review recommended. |

Summary: **1 PASS / 43 LOW CONFIDENCE / 0 FAIL**.

## Technical QA

- Static test suite: all 44 locales, 8 tools, catalog completeness, placeholder integrity, `lang`, RTL `dir`, canonical, complete 44-locale hreflang plus `x-default`, localized JSON-LD URLs, localized internal links, one consent template, shared calculator JavaScript, relative assets, sitemap uniqueness, and final-card arrow behavior.
- Browser smoke: 352 pages (44 locales × 8 tools) at 390 px.
- Representative responsive matrix: 256 combinations (en, sr, de, ru, ar, he, ja, zh-Hans × 8 tools × 320/390/768/1440 px).
- Cross-locale calculation regression: en, de, ru, ar, ja produced the same mathematical `100 EUR = 11700 RSD` result with locale-specific display formatting.
- RTL: ar, he, fa, and ur use `dir="rtl"`; automated overflow and runtime checks passed. Currency codes and calculation logic remain shared and unchanged.
- Sitemap: 440 unique URLs (44 locales × homepage, privacy policy, and 8 tools), each with 44 locale alternates and `x-default`.

Browser evidence is stored in `artifacts/tool-localization-browser-qa.json`.

## Translation notes

The initial catalogs were machine-assisted, then checked for missing text, placeholder corruption, obvious English fallback, terminology anomalies, and responsive failures. Targeted overrides correct priority financial terminology and shorten only phrases that caused real layout overflow. This process is not a substitute for native review; therefore every non-English locale remains marked LOW CONFIDENCE even though technical QA is green.
