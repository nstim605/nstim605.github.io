# Balkan Converter financial news

The news hub is statically generated for English, Serbian, and Russian. Published pages are built from `data/stories.json`; raw official-feed items are cached separately in `data/inbox.json` and are never indexable by default.

## Update pipeline

`node tools/news/fetch-news.mjs` fetches the official ECB and Federal Reserve RSS feeds with timeouts and retries. Each source is isolated, so one unavailable or malformed feed does not remove existing news pages. Candidates are normalized, currency-tagged, categorized, deduplicated, and stored with `status: pending` and `indexable: false`.

`node tools/news/generate-news.mjs` applies the quality gate and generates localized list and story pages, the main sitemap additions, and `news-sitemap.xml`. A story must contain source metadata and substantial EN/SR/RU editorial copy before it can be published and indexed.

The NBS is an approved manual source for the initial release. Its official decision index is used because the current automated source set intentionally contains only stable, verified machine-readable feeds.

## Adding a story

1. Review a candidate and its original source.
2. Add a factual, neutral story to `data/stories.json` with all three translations.
3. Do not forecast exchange-rate direction or provide financial advice.
4. Set `status` to `published` and `indexable` to `true` only after review.
5. Run the generator and `node --test tests/*.test.mjs`.

For local visual QA, run `node tools/news/preview-server.mjs` and open `http://127.0.0.1:4173/news/`.

`NewsContentProvider` is the extension point for a future translation/summarization service. The default provider deliberately returns no generated copy, so no API key or paid service is required and thin feed items cannot become public pages automatically.
