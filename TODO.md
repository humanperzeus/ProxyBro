# ProxyBro — Status

Chrome (MV3) extension: a **proxy manager built around identities** — each identity pairs a proxy
with a coherent, country-matched browser fingerprint + WebRTC-leak protection. Free = 1 identity;
Pro ($5/mo · $30/yr) = unlimited identities + the advanced fingerprint editor. Privacy-first,
sequential one-account-at-a-time (not a full anti-detect browser).

**Current: v1.19.4** — submitted to the **Chrome Web Store** and **Microsoft Edge Add-ons** (both in review).
Site + docs: https://proxybro.app · Releases: https://github.com/humanperzeus/ProxyBro/releases

## Done
- Profile-first UI — identity cards, one-click switch, 3-tab bottom nav (Home · Diagnostics · Settings)
- Coherent **country-matched fingerprints** (UA, platform, Client Hints, WebGL, canvas, timezone, language); Windows-only / Diverse mode; unique per-identity canvas seed
- **WebRTC leak protection**; in-app **diagnostics** (exit IP, WebRTC, fingerprint coherence) with plain + expert views
- Bulk-import proxies → identities
- **Pro via Creem** licence keys (validated server-side by a Cloudflare Worker; the secret never ships in the extension)
- Subscription **re-validation** (a lapsed/cancelled plan reverts to Free; extra identities lock, never deleted) + **5-device** limit with release / auto-free-on-uninstall
- Landing page: hero, freemium pricing, legal (/privacy /terms /refunds), install section + release download

## Next
- [ ] Chrome + Edge store approval → wire the "Add to Chrome / Add to Edge" buttons on the site
- [ ] Go-live: switch payments test → live, enable the Pro buy buttons
- [ ] (optional) Proxy-Seller affiliate card for free users

## Install
**Recommended:** the Chrome Web Store / Edge Add-ons (pending approval).
**Developers / early access:** download the latest [release](https://github.com/humanperzeus/ProxyBro/releases) zip → `chrome://extensions` → Developer mode → **Load unpacked**.

## License
MIT — see [LICENCE](LICENCE).
