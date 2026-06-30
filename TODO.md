# ProxyBro — Status

Chrome (MV3) extension: a **proxy manager built around identities** — each identity pairs a proxy
with a coherent, country-matched browser fingerprint + WebRTC-leak protection. Free = 1 identity;
Pro ($5/mo · $30/yr) = unlimited identities + the advanced fingerprint editor. Privacy-first,
sequential one-account-at-a-time (not a full anti-detect browser).

**Chrome Web Store: v1.19.4 LIVE** · Edge Add-ons in review.
**`main`: v1.21.0** — rating prompt, private feedback funnel, vectorized hi-res icon — built + zipped (`proxybro-v1.21.0.zip`), ready to upload when you choose.
Site: https://proxybro.app · Releases: https://github.com/humanperzeus/ProxyBro/releases

## Done (shipped / live)
- Profile-first UI, country-matched fingerprints, WebRTC-leak protection, diagnostics, bulk-import
- **Pro via Creem** licence keys (server-validated by the Cloudflare Worker; secret never in the extension); re-validation, 5-device limit, release / auto-free-on-uninstall
- Landing page (proxybro.app): Revolut hero, freemium pricing, legal pages, **Add to Chrome** button, **SEO/AI pass** (OG + Twitter cards, JSON-LD, robots/sitemap/llms.txt) + **OG banner**
- **Server-side TEST↔LIVE flip** = `CREEM_MODE` Cloudflare dashboard var, preserved via `--keep-vars`
- **In-app rating prompt** (👍 → store, 👎 → private feedback) + **feedback funnel** (`/feedback` → D1) + password-locked **admin dashboard** (`/admin/feedback`, delete + Export JSON)
- **Vectorized white-bg hi-res icon** (16/32/48/128 + 512 + self-contained `icon.svg`) — visible on dark toolbars

## Next
- [ ] Upload **v1.21.0** to Chrome + Edge when ready
- [ ] Edge Add-ons approval → wire the **Add to Edge** button
- [ ] Creem re-review (store link now live) → then go-live: `CREEM_MODE`→live + wire Pro buttons + verify live key

## Install
**Recommended:** the Chrome Web Store (live) / Edge Add-ons (pending).
**Developers:** download the latest [release](https://github.com/humanperzeus/ProxyBro/releases) zip → `chrome://extensions` → Developer mode → **Load unpacked**.

## License
MIT — see [LICENCE](LICENCE).
