# ProxyBro — Status

Chrome (MV3) extension: a **proxy manager built around identities** — each identity pairs a proxy
with a coherent, country-matched browser fingerprint + WebRTC-leak protection. Free = 1 identity;
Pro ($5/mo · $30/yr) = unlimited identities + the advanced fingerprint editor. Privacy-first,
sequential one-account-at-a-time (not a full anti-detect browser).

**Chrome Web Store: v1.23.4 live** (v1.23.5–v1.23.8 built, upload pending) · **Edge Add-ons: in review**.
**`main`: v1.23.8** — leak-proof `document_start` fingerprint injection, fail-closed activation, instant
activate/turn-off, **timezone/language self-heal** (always-coherent fingerprints), **DNS-leak hardening**
(DoH + prefetch-off while proxied), **any-format proxy import**, and a proxy-type picker. GitHub release v1.23.8 latest.
Site: https://proxybro.app · Releases: https://github.com/humanperzeus/ProxyBro/releases/latest

## Done (shipped / live)
- Profile-first UI, country-matched fingerprints, WebRTC-leak protection, diagnostics, bulk-import
- **Reliable fingerprint protection** — injected at `document_start` so it always applies before any page script; activation **fails closed** if it can't run (needs Chrome's "Allow user scripts" toggle)
- **Advanced leak diagnostics** — exit IP, real WebRTC probe, timezone/language ↔ country coherence, a plain-language verdict + an expert breakdown
- Pro unlock via license key (Free = 1 identity · Pro = unlimited + advanced editor)
- Landing page (proxybro.app): hero, freemium pricing, legal pages, **Add to Chrome**, SEO/AI pass (OG + Twitter cards, JSON-LD, robots/sitemap/llms.txt), OG banner, and a free **/check** leak-test page
- In-app rating prompt + private feedback
- Vectorized white-bg hi-res icon (16/32/48/128 + 512 + self-contained `icon.svg`)
- **Timezone/language self-heal** — identities become fully coherent (7/7) from the real exit country
- **DNS-leak hardening** — DoH + DNS-prefetch off while proxied; SOCKS4 warning; HTTP/SOCKS5 resolve via proxy
- **Any-format proxy import** — auto-detects host:port, user:pass@host, comma/space/tab, scheme-prefixed lists
- Website trust: **open-source banner**, **vs-comparison** table, **About/maker**, **Product Hunt** badge, demo video

## Next
- [x] Chrome Web Store: **v1.23.4 live** ✅
- [ ] Upload **v1.23.8** to Chrome + Edge (supersedes 1.23.4; 1.23.5–1.23.8 built)
- [ ] Set YouTube promo-video URL in Chrome + Edge store listings
- [ ] Edge Add-ons approval → wire the **Add to Edge** button
- [ ] Grow users → real reviews / social proof (the one honest trust-signal gap left)

## Install
**Recommended:** the Chrome Web Store (live) / Edge Add-ons (pending).
**Developers:** download the latest [release](https://github.com/humanperzeus/ProxyBro/releases/latest) zip → unzip → `chrome://extensions` → Developer mode → **Load unpacked** → open the extension's **Details** and enable **"Allow user scripts"**.

## License
MIT — see [LICENCE](LICENCE).
