# Website instructions

- Apply every authorized user-visible change to all website languages in `site-locales.json`, unless the user explicitly requests a language-limited change. Checking EN/RU first is not a scope exception.
- Before publishing or reporting completion, validate complete locale coverage, localized copy, consistent factual meaning, locale-preserving links and text direction. Report the verified count against the manifest. A partial language update is unfinished work.
- Preserve explicit task exclusions, including unchanged screenshots or deferred stores. Google Play-specific features and terms must remain explicitly scoped to Google Play in every translation.
- Homepage shopping/access copy is maintained in `tools/homepage-marketing-copy.json`; apply it with `node tools/sync-homepage-marketing.mjs`. The old `sync-v1603-homepage.mjs` is a historical migration and must not replace current copy with archived store listings.
- Homepage search/social metadata is maintained in `tools/homepage-seo-copy.json`; apply it with `node tools/sync-homepage-seo.mjs` and validate all locales with `node tools/sync-homepage-seo.mjs --check`. Use the same title in HTML/Open Graph/Twitter and the same description there and in the application's JSON-LD.
