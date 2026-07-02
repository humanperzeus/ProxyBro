# ProxyBro — Status

Chrome (MV3) extension: a **proxy manager built around identities** — each identity pairs a proxy
with a coherent, country-matched browser fingerprint + WebRTC-leak protection. Free = 1 identity;
Pro ($5/mo · $30/yr) = unlimited identities + the advanced fingerprint editor. Privacy-first,
sequential one-account-at-a-time (not a full anti-detect browser).

**Chrome Web Store: v1.19.4 live** · Edge Add-ons in review.
**`main`: v1.23.1** — leak-proof `document_start` fingerprint injection, fail-closed activation,
advanced leak diagnostics, and a one-time "Allow user scripts" setup card. Built + zipped, ready to upload.
Site: https://proxybro.app · Releases: https://github.com/humanperzeus/ProxyBro/releases/latest

## Done (shipped / live)
- Profile-first UI, country-matched fingerprints, WebRTC-leak protection, diagnostics, bulk-import
- **Reliable fingerprint protection** — injected at `document_start` so it always applies before any page script; activation **fails closed** if it can't run (needs Chrome's "Allow user scripts" toggle)
- **Advanced leak diagnostics** — exit IP, real WebRTC probe, timezone/language ↔ country coherence, a plain-language verdict + an expert breakdown
- Pro unlock via license key (Free = 1 identity · Pro = unlimited + advanced editor)
- Landing page (proxybro.app): hero, freemium pricing, legal pages, **Add to Chrome**, SEO/AI pass (OG + Twitter cards, JSON-LD, robots/sitemap/llms.txt), OG banner, and a free **/check** leak-test page
- In-app rating prompt + private feedback
- Vectorized white-bg hi-res icon (16/32/48/128 + 512 + self-contained `icon.svg`)

## Next
- [ ] Upload **v1.23.1** to Chrome + Edge when ready (paste the `userScripts` permission justification)
- [ ] Edge Add-ons approval → wire the **Add to Edge** button

## Install
**Recommended:** the Chrome Web Store (live) / Edge Add-ons (pending).
**Developers:** download the latest [release](https://github.com/humanperzeus/ProxyBro/releases/latest) zip → unzip → `chrome://extensions` → Developer mode → **Load unpacked** → open the extension's **Details** and enable **"Allow user scripts"**.

## License
MIT — see [LICENCE](LICENCE).
