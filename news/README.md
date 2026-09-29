# Balkan Converter financial news

The news hub is statically generated for English, Serbian, and Russian. Only reviewed records in `data/stories.json` with `status: published` and `indexable: true` can create public pages or sitemap entries. Pending, rejected, duplicate, and draft records remain data-only and non-indexable.

## Moderation pipeline

The scheduled workflow follows this sequence:

`official RSS → normalization → deduplication → currency tagging → candidate quality gate → EN/SR/RU draft → moderation PR → human review → merge → publication`

1. `node tools/news/fetch-news.mjs` fetches official ECB, Federal Reserve, and NBS RSS feeds with size limits, timeouts, retries, and per-source isolation. It never scrapes HTML pages.
2. Normalized items are stored in `data/inbox.json` with stable IDs and `indexable: false`.
3. `node tools/news/prepare-moderation.mjs` rejects stale or low-value material, detects already-published events, and creates stable non-public records in `data/drafts.json`.
4. `data/moderation-state.json` remembers every processed candidate, rejection, and duplicate so repeated runs do not recreate drafts or URLs.
5. The scheduled GitHub workflow updates `automation/news-moderation` and creates or updates a moderation pull request only when worthy drafts exist. It never merges the PR and never pushes generated news directly to `main`.
6. If a run contains only rejected or duplicate material, state may be saved on the automation branch, but no empty PR is opened.

The PR body is generated as `data/moderation-report.md`; the full machine-readable results are in `data/moderation-report.json`. Untrusted feed text is stored as data, Markdown-escaped in the report, and HTML-escaped by the page generator.

## Official sources

- European Central Bank press-release RSS: `https://www.ecb.europa.eu/rss/press.html`
- Federal Reserve monetary-policy RSS: `https://www.federalreserve.gov/feeds/press_monetary.xml`
- National Bank of Serbia official RSS directory: `https://nbs.rs/en/scripts/rss/index.html`
- NBS Executive Board and Monetary Policy category feeds linked by that directory

The NBS feeds are machine-readable official sources, so NBS is now automated without HTML scraping. Its web application firewall requires a browser-compatible, explicitly identified `BalkanConverter-NewsBot` request and the official RSS directory as referrer; any HTML block page is rejected by the XML parser.

## Reviewing and publishing a draft

1. Open every official source link in `data/drafts.json` and verify the facts and date.
2. Fill `translations.en`, `translations.sr`, and `translations.ru` with original, factual, neutral copy. Do not paste source excerpts, forecast exchange rates, or provide financial advice.
3. Run `node tools/news/promote-draft.mjs <draft-id>`. The command refuses incomplete copy and moves only a quality-approved story to `data/stories.json`.
4. Run `node tools/news/generate-news.mjs` and `node --test tests/*.test.mjs`.
5. Review the generated pages and PR checks. Publication happens only when a human merges the reviewed PR.

For local visual QA, run `node tools/news/preview-server.mjs` and open `http://127.0.0.1:4173/news/`.

`NewsContentProvider` remains the extension point for a future translation/summarization service. The default `ManualReviewContentProvider` deliberately returns no generated copy, requires no API key or paid service, and leaves drafts incomplete until an editor supplies safe EN/SR/RU content.
