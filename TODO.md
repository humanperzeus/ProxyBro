# ProxyBro — Status / TODO

Canonical scope doc. One unit = one branch = one build (see WORKING_AGREEMENT §3).
Current build: **v1.16.0** · `main`. v1.14.0: Web-Store hygiene + P0 profile-proxy fix + SELF-CONTAINED profiles + ExtPay purchase→unlock. v1.15.0: profile-first redesign PART 1 (clean top bar + 3-tab bottom nav, Home identity cards, Simple editor sheet, dark theme, 384px). **v1.16.0 = redesign PART 2:** restyled Bulk-import/Proxies (clean cards, no nested scrollbar, decluttered actions, Test All kept) + Diagnostics (clean status-colored rows) + built the **Advanced (Pro) sheet** (grouped overlay, Pro-gated from the Simple editor → opens the working Spoof/Security controls). **Remaining (follow-up):** fold/drop Stats; deep per-group restyle + **per-profile binding** of the Advanced controls (they still edit global Spoof/Security). Then: ExtensionPay/Stripe dashboard + test-mode unlock, store screenshots/listing, relicense+private.

## Strategy (agreed)
- Freemium: free core + Pro behind an ExtensionPay license. Relicense future commits to source-available; make repo private. Showcase the product (not code) on humankhoobsirat.com.
- Free = **1 proxy**, manual switch, test, basic WebRTC. Pro ($4.99/mo or $39.99 lifetime, placeholder) = full fingerprint spoofing, auto-rotation, security suite, import/export, unlimited proxies.
- Paywall UI: **Uber** style.

## ✅ Branch 1 — fix/mv3-compliance (BUILT, pending your test + "go merge")
- [x] Blocking webRequest → declarativeNetRequest (kill switch, WebSocket, tracking, UA)
- [x] browsingData permission fix + scoped history wipe (no passwords/downloads)
- [x] manifest: version 1.4.1, icons 16/32/48/128, perms corrected, HTTPS geo (ipwho.is)
- [x] Multi-format proxy parser (host:port · user:pass@host:port · scheme://) + skip feedback
- [x] Version badge in header + footer (read from manifest)
- [x] Proxy auth on activation + active proxy persisted across service-worker restart
- [x] Leak/fingerprint test page (test/leak-test.html)
- **Done when:** 7-step device test + leak suite pass with no SW errors → go merge.

## ✅ feat/proxy-health (v1.5.1, merged)
- [x] Honest test: "Working" now requires a real exit-IP round-trip through the proxy (dead proxies show **Dead**, no more false positives). Country/city come from the true exit IP.
- [x] Activation health-check: warns "proxy not responding" if an activated proxy is actually dead, instead of silently leaving you on your own IP.
- **Done when:** a known-good proxy → Working + its IP on browserleaks; a dead proxy → Dead + the warning toast.

## ✅ feat/ui-redesign (v1.6.0, merged)
- [x] Clean single-accent design system across all tabs, light + dark — CSS-only rewrite, all 86 element IDs preserved, popup.js untouched.

## ✅ feat/monetization (v1.13.0–1.13.2, MERGED)
- [x] ExtensionPay: bundled official ExtPay.js locally, `ExtPay('proxybro')` + startBackground in SW; manifest host_permission + externally_connectable for extensionpay.com.
- [x] Gate: Free = 1 profile; creating a 2nd while unpaid → Uber paywall (X-themed, single CTA, monthly/lifetime, restore). Render-verified in real popup.
- [x] WebRTC P0: unified policy (spoof+security can't clobber); diagnostic now probes the active page (popup probe was a false positive — real sites protected, MCP-verified).
- **Done when:** ExtensionPay dashboard (Stripe + $4.99/mo + $39.99 prices) connected → Stripe **test-mode** purchase flips popup to Pro + unlocks unlimited profiles. ⏳ pending user dashboard setup.

## 🔜 Next branches
1. **feat/redesign-profile-first** — APPROVED UI redesign. Profile-first IA, Revolut identity cards. **6 tabs → 3**: Home (identities) · Diagnostics · Settings; + 2 sheets (Simple editor, Advanced=Pro which absorbs the old Spoof+Security tabs) + Uber paywall modal. The legacy Proxies-tab "activate" path was the core confusion → demote to **bulk-import inside Settings**. Build Home + Simple editor FIRST, verify, then replicate (§6). Profiles already own their proxy (self-contained) so the editor binds to the profile, not a global list.
2. **chore/store-assets** — 1280×800 screenshots (of the redesign), listing copy, package zip (exclude `test/`). Privacy-policy text already drafted → host at humanperzeus.com/privacy.
3. **release** — relicense to source-available, make repo private, showcase page.
*(feat/diagnostics — ✅ DONE in v1.7.0: Diagnostics tab auto-runs exit IP + WebRTC leak + active-spoof summary in-extension. True DNS-leak + fingerprint-uniqueness still need a backend → future Pro cloud check.)*

## 🐛 Found during (backlog)
- ✅ **Harden spoofing — DONE (v1.12.0–1.12.4, MCP-verified)**: MAIN-world injection on every navigation (top-level listener survives MV3 SW sleep; reads settings from storage per-nav, no race); coherent UA + navigator.platform + userAgentData (Client Hints + getHighEntropyValues) + timezone (offset + Date.toString + Intl tz/locale) + language + WebGL unmasked GPU (37445/37446) + seeded canvas noise. Verified on a live page: real Mac/Berlin/Apple → Windows/NY/NVIDIA, zero contradictions. Remaining (optional, not ban-triggers): cores/RAM, audio/font/clientRects, deep native-tamper lie-detection; auto-upgrade pre-v1.11 profiles; strip diagnostic `console.log` before store.
- Auto proxy **rotation** appears unwired in background.js — verify/implement (revisit in the redesign's Advanced sheet).
- ✅ **DONE (v1.14.0):** `debug.js` + `spoofing.js` deleted (dead code); `web_accessible_resources` removed entirely (no more page-exposed files); diagnostic `console.log` guarded behind a DEBUG flag.
