document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const proxyInput = document.getElementById('proxyInput');
  const testBtn = document.getElementById('testBtn');
  const addBtn = document.getElementById('addBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const clearBtn = document.getElementById('clearBtn');
  const deactivateBtn = document.getElementById('deactivateBtn');
  const deleteCookiesBtn = document.getElementById('deleteCookiesBtn');
  const deleteHistoryBtn = document.getElementById('deleteHistoryBtn');
  const statusMsg = document.getElementById('statusMsg');
  const proxyList = document.getElementById('proxyList');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const statusFilter = document.getElementById('statusFilter');
  const searchFilter = document.getElementById('searchFilter');
  const sortBtn = document.getElementById('sortBtn');
  const showPasswords = document.getElementById('showPasswords');

  // Tab elements
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // Settings elements
  const enableRotation = document.getElementById('enableRotation');
  const rotationInterval = document.getElementById('rotationInterval');
  const rotationStrategy = document.getElementById('rotationStrategy');
  const saveRotationSettings = document.getElementById('saveRotationSettings');

  // Security elements
  const webrtcProtection = document.getElementById('webrtcProtection');
  const killSwitch = document.getElementById('killSwitch');
  const dnsRouting = document.getElementById('dnsRouting');
  const blockWebSockets = document.getElementById('blockWebSockets');
  const fingerprintProtection = document.getElementById('fingerprintProtection');
  const userAgentRotation = document.getElementById('userAgentRotation');
  const blockTracking = document.getElementById('blockTracking');
  const clearCookies = document.getElementById('clearCookies');
  const saveSecuritySettings = document.getElementById('saveSecuritySettings');

  // Spoofing elements
  const userAgentTemplate = document.getElementById('userAgentTemplate');
  const customUserAgent = document.getElementById('customUserAgent');
  const applyUserAgent = document.getElementById('applyUserAgent');
  const webrtcMode = document.getElementById('webrtcMode');
  const canvasMode = document.getElementById('canvasMode');
  const webglMode = document.getElementById('webglMode');
  const webglInfoMode = document.getElementById('webglInfoMode');
  const webglVendor = document.getElementById('webglVendor');
  const webglRenderer = document.getElementById('webglRenderer');
  const webglVendorContainer = document.getElementById('webglVendorContainer');
  const webglRendererContainer = document.getElementById('webglRendererContainer');
  const webgpuMode = document.getElementById('webgpuMode');
  const clientRectsMode = document.getElementById('clientRectsMode');
  const timezoneMode = document.getElementById('timezoneMode');
  const timezone = document.getElementById('timezone');
  const timezoneContainer = document.getElementById('timezoneContainer');
  const languageMode = document.getElementById('languageMode');
  const language = document.getElementById('language');
  const languageContainer = document.getElementById('languageContainer');
  const geolocationMode = document.getElementById('geolocationMode');
  const geolocation = document.getElementById('geolocation');
  const geolocationContainer = document.getElementById('geolocationContainer');
  const cpuMode = document.getElementById('cpuMode');
  const cpuCores = document.getElementById('cpuCores');
  const cpuContainer = document.getElementById('cpuContainer');
  const memoryMode = document.getElementById('memoryMode');
  const memoryGB = document.getElementById('memoryGB');
  const memoryContainer = document.getElementById('memoryContainer');
  const macAddressMode = document.getElementById('macAddressMode');
  const macAddress = document.getElementById('macAddress');
  const macAddressContainer = document.getElementById('macAddressContainer');
  const deviceNameMode = document.getElementById('deviceNameMode');
  const deviceName = document.getElementById('deviceName');
  const deviceNameContainer = document.getElementById('deviceNameContainer');
  const fontsMode = document.getElementById('fontsMode');
  const fonts = document.getElementById('fonts');
  const fontsContainer = document.getElementById('fontsContainer');
  const audioMode = document.getElementById('audioMode');
  const screenMode = document.getElementById('screenMode');
  const screenResolution = document.getElementById('screenResolution');
  const screenContainer = document.getElementById('screenContainer');
  const mediaDevicesMode = document.getElementById('mediaDevicesMode');
  const doNotTrack = document.getElementById('doNotTrack');
  const saveSpoofingSettings = document.getElementById('saveSpoofingSettings');

  // Stats elements
  const totalProxies = document.getElementById('totalProxies');
  const workingProxies = document.getElementById('workingProxies');
  const avgSpeed = document.getElementById('avgSpeed');
  const rotationsCount = document.getElementById('rotationsCount');
  const refreshStats = document.getElementById('refreshStats');
  const resetStats = document.getElementById('resetStats');

  // State
  let proxies = [];
  let activeProxy = null;
  let sortAscending = true;
  let rotationTimer = null;
  let securitySettings = {
    webrtcProtection: false,
    killSwitch: false,
    dnsRouting: false,
    blockWebSockets: false,
    fingerprintProtection: false,
    userAgentRotation: false,
    blockTracking: false,
    clearCookies: false
  };
  let spoofingSettings = {
    webrtcMode: 'real',
    canvasMode: 'real',
    webglMode: 'real',
    webglInfoMode: 'real',
    webglVendor: '',
    webglRenderer: '',
    webgpuMode: false,
    clientRectsMode: 'real',
    timezoneMode: 'auto',
    timezone: '',
    languageMode: 'auto',
    language: '',
    geolocationMode: 'auto',
    geolocation: '',
    cpuMode: 'real',
    cpuCores: '8',
    memoryMode: 'real',
    memoryGB: '8',
    macAddressMode: false,
    macAddress: '',
    deviceNameMode: false,
    deviceName: '',
    fontsMode: 'auto',
    fonts: '',
    audioMode: 'real',
    screenMode: 'real',
    screenResolution: '',
    mediaDevicesMode: 'real',
    doNotTrack: false
  };

  // Profiles: each profile = one account identity (proxy + fingerprint + security)
  const DEFAULT_SPOOF = JSON.parse(JSON.stringify(spoofingSettings));
  const DEFAULT_SECURITY = JSON.parse(JSON.stringify(securitySettings));
  let profiles = [];
  let activeProfileId = null;
  // Bumped on every activate/deactivate. An in-flight verify probe (updateHome) captures this at start
  // and no-ops its cache/UI writes if it changed — so toggling off mid-check can never leave a stale
  // "Protected" or poison the home cache. Keeps the toggle interruptible instead of locked.
  let activationGen = 0;
  let editingProxyId = null;
  let proIsPaid = false;
  let feedbackSource = 'rating_prompt', feedbackCategory = '';
  // Auto-fingerprint diversity: 'windows' = vary within a Windows pool (safest, most common
  // match); 'diverse' = also roll macOS/Linux per identity (more real-world spread, more
  // fields that must stay coherent). User-selectable in the Advanced sheet; persisted.
  let autoFpMode = 'windows';
  let newProxyScheme = 'http'; // scheme pills in the identity editor (HTTP/HTTPS/SOCKS5/SOCKS4)
  function withScheme(ln) { return (ln && !/^(https?|socks[45]):\/\//i.test(ln)) ? newProxyScheme + '://' + ln : ln; }
  let realPaid = false;   // true only when a Creem license has been validated
  // Creem checkout links + license-validation Worker. Point these at your Creem dashboard
  // product checkout URLs and your deployed Cloudflare Worker. NEVER put the Creem secret
  // API key in the extension — the Worker holds it and validates server-side.
  // Checkout goes through the Worker (proxybro.app/buy) so the test<->live flip happens
  // SERVER-SIDE via a Cloudflare variable — no extension re-upload ever needed. The Worker
  // redirects to the right Creem checkout based on whether CREEM_TEST_API_KEY is set.
  const CREEM_CHECKOUT_MONTHLY = 'https://proxybro.app/buy?plan=monthly';
  const CREEM_CHECKOUT_YEARLY = 'https://proxybro.app/buy?plan=yearly';
  const CREEM_VALIDATE_URL = 'https://proxybro.app/validate';
  const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/ceobadpmhnfmlndkcmobhejkmbjimmcj';
  const FEEDBACK_URL = 'https://proxybro.app/feedback';
  const CONFIG_URL = 'https://proxybro.app/config';
  const GO_BASE = 'https://proxybro.app/go/';
  let selectedPlan = 'monthly';

  // User-Agent templates - will be loaded from external file
  let userAgentTemplates = {};

  // Initialize
  initialize();

  function initialize() {
    setVersion();
    loadProxies();
    loadSettings();
    loadSecuritySettings();
    loadSpoofingSettings();
    loadStats();
    loadProfiles();
    chrome.storage.local.get(['autoFpMode'], (d) => { if (d && d.autoFpMode) autoFpMode = d.autoFpMode; });
    chrome.storage.local.get(['proPaidCache', 'licenseKey', 'licenseInstanceId'], (d) => {
      d = d || {};
      if (d.proPaidCache) realPaid = true;          // last-known real paid status — instant + offline-safe
      proIsPaid = realPaid;
      if (d.licenseKey && d.licenseInstanceId) setUninstallDeactivate(d.licenseKey, d.licenseInstanceId);
      updateProUI(); renderProfilesList(); enforceFreeLimit();
      reValidatePro();   // background re-check; drops to Free if the subscription has lapsed
    });
    setupEventListeners();
    applyDarkMode();
    loadUserAgentTemplates();
    updateHome();
    refreshUserScriptsOnboard();   // one-time "Allow user scripts" setup card when the toggle is off
    maybeShowRatingPrompt();   // v1.20: ask happy users to rate, route unhappy to private feedback
    loadReferrals();           // v1.21: data-driven referral cards (flag-gated, dismissible)
  }

  // Show the one-time "Allow user scripts" setup card until Chrome exposes chrome.userScripts
  // (permission granted AND the per-extension toggle / Developer Mode on) — i.e. until the
  // reliable document_start spoof can run. Mirrors background reliableSpoofLive().
  function refreshUserScriptsOnboard() {
    const card = document.getElementById('usOnboard');
    if (!card) return;
    card.style.display = (typeof chrome !== 'undefined' && chrome.userScripts) ? 'none' : 'block';
  }

  // Show the loaded build straight from the manifest so it can never drift.
  function setVersion() {
    const v = 'v' + chrome.runtime.getManifest().version;
    const badge = document.getElementById('versionBadge');
    const footer = document.getElementById('versionFooter');
    if (badge) badge.textContent = v;
    if (footer) footer.textContent = v;
  }

  // --- One-tap Go Anonymous + live Home ---
  function homeChip(label, ok) {
    return '<span class="chip' + (ok ? ' ok' : '') + '">' + label + (ok ? ' ✓' : '') + '</span>';
  }

  // Robust exit probe (matches the proxy test): tolerant of slow / rotating
  // residential proxies — long timeout + a reliable fallback endpoint.
  async function probeExit() {
    const fetchVia = (url, ms) => new Promise((resolve) => {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), ms);
      fetch(url, { signal: c.signal, cache: 'no-store' })
        .then((r) => { clearTimeout(t); resolve(r); })
        .catch(() => { clearTimeout(t); resolve(null); });
    });
    // Each probe returns a normalized {ok,ip,country,city} or null. Cloudflare + ipwho carry geo;
    // ipify is an IP-only backup that often answers even when a slow proxy chokes the others.
    const cloudflare = async () => { const r = await fetchVia('https://www.cloudflare.com/cdn-cgi/trace', 5000); if (!r) return null; try { const t = await r.text(); const ipm = t.match(/(?:^|\n)ip=([^\n]+)/); const locm = t.match(/(?:^|\n)loc=([^\n]+)/); if (ipm) return { ok: true, ip: ipm[1].trim(), country: locm ? locm[1].trim() : null, city: null }; } catch (e) {} return null; };
    const ipwho = async () => { const r = await fetchVia('https://ipwho.is/', 5000); if (!r) return null; try { const d = await r.json(); if (d && d.ip) return { ok: true, ip: d.ip, country: d.country_code || d.country, city: d.city }; } catch (e) {} return null; };
    const ipify = async () => { const r = await fetchVia('https://api.ipify.org?format=json', 5000); if (!r) return null; try { const d = await r.json(); if (d && d.ip) return { ok: true, ip: d.ip, country: null, city: null }; } catch (e) {} return null; };
    // Race all three CONCURRENTLY; resolve the instant any yields an IP (usually Cloudflare, ~1s, with geo),
    // else null once all settle. Hard-capped at the 5s fetch timeout — no more 8+15+12+12 sequential wait.
    const firstOk = (fns) => new Promise((resolve) => {
      let pending = fns.length, done = false;
      fns.forEach((fn) => fn().then((v) => {
        if (done) return;
        if (v && v.ok) { done = true; resolve(v); }
        else if (--pending === 0) resolve(null);
      }, () => { if (!done && --pending === 0) resolve(null); }));
    });
    const hit = await firstOk([cloudflare, ipwho, ipify]);
    if (hit) return hit;
    // No endpoint returned an IP — last-ditch liveness check (proxy reachable at all?).
    const ping = await fetchVia('https://www.google.com/generate_204', 4000);
    if (ping && ping.status === 204) return { ok: true, ip: null, country: null, city: null };
    return { ok: false };
  }

  function applyFullSpoofPreset() {
    canvasMode.value = 'noise';
    webglMode.value = 'noise';
    webrtcMode.value = 'off';
    clientRectsMode.value = 'noise';
    doNotTrack.checked = true;
  }

  function resetSpoofPreset() {
    canvasMode.value = 'real';
    webglMode.value = 'real';
    webrtcMode.value = 'real';
    clientRectsMode.value = 'real';
    doNotTrack.checked = false;
  }

  // The big toggle: one tap = fastest working proxy + full spoof preset + leak
  // block, all saved. Off = revert to the real identity. Reuses the existing
  // activate + save handlers so behaviour stays consistent with the manual tabs.
  async function goAnonymous(on) {
    if (on) {
      let best = proxies.filter(p => p.status === 'Working').sort((a, b) => (a.speed || 9e9) - (b.speed || 9e9))[0];
      if (!best) best = proxies[0];
      if (!best) {
        showNotification('Add a proxy first (Proxies tab)', 'error');
        const t = document.getElementById('anonToggle');
        if (t) t.checked = false;
        return;
      }
      applyFullSpoofPreset();
      saveSpoofingSettingsHandler();
      webrtcProtection.checked = true;
      blockTracking.checked = true;
      saveSecuritySettingsHandler();
      activateProxy(best);
      showNotification('Going anonymous…', 'success');
    } else {
      deactivateProxy();
      resetSpoofPreset();
      saveSpoofingSettingsHandler();
      webrtcProtection.checked = false;
      blockTracking.checked = false;
      saveSecuritySettingsHandler();
      showNotification('Back to your real IP', 'info');
    }
    setTimeout(updateHome, 3000);
  }

  function setHomeCache(c) { chrome.storage.local.set({ homeProbe: c }); }
  function getHomeCache() { return new Promise((res) => { chrome.storage.local.get(['homeProbe'], (d) => res(d.homeProbe || null)); }); }

  async function updateHome(force) {
    const gen = activationGen;            // if this changes mid-probe, a newer activate/off superseded us
    const ap = getActiveProfile();
    const dw0 = document.getElementById('goDirectWrap');
    if (!ap) { if (dw0) dw0.style.display = 'none'; return; }

    // Reuse a cached probe (same profile, < 4 min old) so we don't hit the network on
    // every popup open. A state change or re-tapping the active card forces a fresh probe.
    let exit, rtcLeak;
    const cache = await getHomeCache();
    if (!force && cache && cache.profileId === activeProfileId && (Date.now() - cache.ts) < 240000) {
      exit = cache.exit;
      rtcLeak = cache.rtcLeak;
    } else {
      const sc = document.getElementById('activeStatus');
      if (sc) sc.textContent = 'Verifying…';
      exit = await probeExit();
      const rtc = await webrtcProbe();
      rtcLeak = !!(rtc.ips && rtc.ips.some(function (ip) { return isPublicIp(ip) && ip !== exit.ip; }));
      if (gen !== activationGen) return;   // toggled/switched during the probe — don't write a stale exit
      setHomeCache({ profileId: activeProfileId, exit: exit, rtcLeak: rtcLeak, ts: Date.now() });
    }

    // The status lives on the active identity card (re-find after the await — the list may have re-rendered).
    // Ground truth: read Chrome's LIVE proxy config, not the stored activeProxy flag (which can be
    // stale-active after an update / SW restart / Pro->Free drop). "Protected" requires a proxy really
    // carrying traffic, the exit responding, AND WebRTC not leaking the real IP.
    const live = await getLiveProxyConfig();
    if (gen !== activationGen) return;    // superseded while reading the live config — let the newer run render
    const proxyOn = live.on;
    // Capture the real IP as a baseline whenever protection is genuinely OFF — Diagnostics uses it to
    // show "real X -> proxy Y". Only ever store a non-proxied probe (never the proxy's own IP).
    if (!proxyOn && exit.ok && exit.ip) chrome.storage.local.set({ realIpBaseline: { ip: exit.ip, country: exit.country || '', ts: Date.now() } });
    const isProtected = proxyOn && exit.ok && !rtcLeak;
    const sEl = document.getElementById('activeStatus');
    const cEl = document.getElementById('activeCard');
    const dw = document.getElementById('goDirectWrap');
    if (isProtected) {
      if (cEl) cEl.classList.add('protected');
      const apx = (ap && ap.proxy) || proxies.find((x) => ap && x.full === ap.proxyFull);
      const country = (ap && ap.country) || (apx && apx.country) || exit.country || '';
      if (sEl) sEl.textContent = 'Protected · ' + (exit.ip ? ((country ? country + ' · ' : '') + exit.ip) : 'exit IP hidden');
      if (dw) dw.style.display = 'block';
    } else if (proxyOn && exit.ok && rtcLeak) {
      if (cEl) cEl.classList.remove('protected');
      if (sEl) sEl.textContent = '⚠ WebRTC leak — your real IP is exposed';
      if (dw) dw.style.display = 'block';
    } else if (proxyOn && !exit.ok) {
      if (cEl) cEl.classList.remove('protected');
      if (sEl) sEl.textContent = 'Proxy not responding — down or blocked by this network · tap to retry';
      if (dw) dw.style.display = 'block';
    } else {
      if (cEl) cEl.classList.remove('protected');
      if (sEl) sEl.textContent = 'Protection off · tap your identity to reconnect';
      if (dw) dw.style.display = 'none';
    }

    // Backfill the active profile's country from the live exit (ground truth — routed THROUGH the proxy),
    // and self-heal the fingerprint: an identity built before its proxy's country was known can have tz/lang
    // pinned to your real locale (the proxy-test heal only runs while the popup stays open). The live exit is
    // authoritative, so re-derive tz/lang to match it (US exit ⟹ US timezone), persist, and re-inject.
    if (ap && exit.ok && exit.country) {
      let changed = false;
      if (ap.country !== exit.country) { ap.country = exit.country; changed = true; }
      if (healSpoofCountry(ap, exit.country)) changed = true;
      if (changed) { saveProfiles(); renderProfilesList(); }
    }
  }

  // --- Profiles: one profile = one account's identity (proxy + fingerprint) ---
  function getActiveProfile() { return profiles.find((p) => p.id === activeProfileId) || null; }

  function saveProfiles() { chrome.storage.local.set({ profiles, activeProfileId }); }

  function loadProfiles() {
    chrome.storage.local.get(['profiles', 'activeProfileId', 'spoofingSettings', 'securitySettings', 'activeProxyData', 'proxies'], (data) => {
      profiles = data.profiles || [];
      activeProfileId = data.activeProfileId || null;
      if (profiles.length === 0) {
        // Migrate current global settings into a "Default" profile so nothing is lost.
        const def = {
          id: 'p-default',
          name: 'Default',
          proxy: data.activeProxyData || null,
          proxyFull: (data.activeProxyData && data.activeProxyData.full) || '',
          country: (data.activeProxyData && data.activeProxyData.country) || '',
          spoof: data.spoofingSettings || JSON.parse(JSON.stringify(DEFAULT_SPOOF)),
          security: data.securitySettings || JSON.parse(JSON.stringify(DEFAULT_SECURITY))
        };
        profiles = [def];
        activeProfileId = def.id;
        saveProfiles();
      } else {
        // Make profiles self-contained: copy each one's proxy object IN (from the
        // freshly read data.proxies — race-free vs the global `proxies` var) so that
        // deleting a proxy from the Proxies tab can never orphan a profile again.
        let migrated = false;
        const pool = data.proxies || [];
        profiles.forEach((p) => {
          if (!p.proxy && p.proxyFull) {
            const found = pool.find((x) => x.full === p.proxyFull);
            if (found) { p.proxy = found; migrated = true; }
          }
        });
        if (migrated) saveProfiles();
      }
      renderProfilesList();
      updateHome();
    });
  }

  function renderProfilesList() {
    const list = document.getElementById('profilesList');
    const count = document.getElementById('profileCount');
    if (!list) return;
    if (count) count.textContent = profiles.length;
    list.innerHTML = profiles.map((p, i) => {
      const active = p.id === activeProfileId;
      const locked = !proIsPaid && i >= 1; // Free = 1 identity; extras lock until Pro (never deleted)
      const px = p.proxy || proxies.find((x) => x.full === p.proxyFull) || null;
      const missing = !px && !!p.proxyFull;
      let sub;
      if (locked) sub = '<span style="color:var(--text-muted);">Pro — upgrade to use</span>';
      else if (active) sub = '<span id="activeStatus">…</span>';
      else if (missing) sub = '<span style="color:var(--danger);">proxy missing — tap edit</span>';
      else sub = diagEscape(p.country || (px && px.country) || (px ? 'proxy set' : 'no proxy'));
      return '<div class="id-card' + (active ? ' active' : '') + (locked ? ' locked' : '') + '"' + (active ? ' id="activeCard"' : '') + ' data-id="' + p.id + '"' + (locked ? ' data-locked="1"' : '') + '>' +
        '<span class="idc-cc">' + diagEscape(ccBadge(p)) + '</span>' +
        '<div class="idc-text"><div class="idc-name">' + diagEscape(p.name) + '</div><div class="idc-sub">' + sub + '</div></div>' +
        (locked ? '<span class="idc-lock" title="Pro">🔒</span>' : '<span class="idc-edit" data-edit="' + p.id + '">edit</span>') +
        '</div>';
    }).join('');
    list.querySelectorAll('.id-card').forEach((row) => {
      row.addEventListener('click', async () => {
        if (row.dataset.locked) { gatedShowPaywall(); return; } // locked Pro identity → upgrade
        const p = profiles.find((x) => x.id === row.dataset.id);
        if (!p) return;
        if (p.id === activeProfileId) {
          // Tapping the already-active identity: don't just re-check — make sure the proxy is REALLY
          // applied. After an update / SW restart / Pro->Free drop the identity can show active while
          // Chrome fell back to direct; the old re-check left it off with no way to reconnect by
          // tapping (you had to Edit → Save & Activate). Re-apply if the live config isn't ours.
          const px = p.proxy || (p.proxyFull ? proxies.find((x) => x.full === p.proxyFull) : null);
          const live = await getLiveProxyConfig();
          const reallyOn = !!(live.on && px && live.host === px.host && live.port === String(px.port));
          if (reallyOn) updateHome(true); else applyProfile(p);
        } else {
          applyProfile(p);
        }
      });
    });
    list.querySelectorAll('.idc-edit').forEach((el) => {
      el.addEventListener('click', (e) => { e.stopPropagation(); openEditor(el.dataset.edit); });
    });
  }

  function deleteProfile(id) {
    const wasActive = (id === activeProfileId);
    profiles = profiles.filter((p) => p.id !== id);
    if (editingProxyId === id) editingProxyId = null;
    if (profiles.length === 0) {
      // Never strand the user with zero profiles — recreate a clean Default they can configure.
      const def = { id: 'p-default', name: 'Default', proxy: null, proxyFull: '', country: '',
        spoof: JSON.parse(JSON.stringify(DEFAULT_SPOOF)), security: JSON.parse(JSON.stringify(DEFAULT_SECURITY)) };
      profiles = [def];
      activeProfileId = def.id;
      saveProfiles();
      applyProfile(def);
      showNotification('Profile deleted — fresh Default created', 'info');
      return;
    }
    if (wasActive) {
      activeProfileId = profiles[0].id;
      applyProfile(profiles[0]);
    } else {
      saveProfiles();
      renderProfilesList();
    }
    showNotification('Profile deleted', 'info');
  }

  function renameProfile(id, name) {
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    p.name = name;
    saveProfiles();
    renderProfilesList();
    updateHome();
  }

  // Change/assign a profile's proxy after creation. This is the in-UI answer to
  // "where do I change this profile's proxy", and the escape from a dangling proxy
  // (deleting a proxy from the Proxies tab used to orphan a profile with no fix).
  function setProfileProxy(id, value) {
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    const v = (value || '').trim();
    if (!v) { showNotification('Paste a proxy line first', 'error'); return; }
    const parsed = parseProxyLine(v);
    if (!parsed) { showNotification('That proxy line could not be parsed', 'error'); return; }
    if (!proxies.find((x) => x.full === parsed.full)) { proxies.push(parsed); saveProxies(); renderProxyList(); }
    p.proxy = proxies.find((x) => x.full === parsed.full) || parsed;
    p.proxyFull = parsed.full;
    p.country = parsed.country || '';
    editingProxyId = null;
    saveProfiles();
    if (p.id === activeProfileId) applyProfile(p); else renderProfilesList();
    // Auto-test so the exit country resolves and the fingerprint self-corrects.
    const idx = proxies.findIndex((x) => x.full === parsed.full);
    if (idx >= 0 && !parsed.country) testSingleProxy(idx);
    showNotification('Proxy updated for "' + p.name + '"', 'success');
  }

  // Country (full name OR 2-letter code, since geo providers return both) -> [timezone, language].
  const COUNTRY_TZ_LANG = {
    'Netherlands': ['Europe/Amsterdam', 'nl-NL'], 'NL': ['Europe/Amsterdam', 'nl-NL'],
    'United States': ['America/New_York', 'en-US'], 'US': ['America/New_York', 'en-US'],
    'Germany': ['Europe/Berlin', 'de-DE'], 'DE': ['Europe/Berlin', 'de-DE'],
    'United Kingdom': ['Europe/London', 'en-GB'], 'GB': ['Europe/London', 'en-GB'], 'UK': ['Europe/London', 'en-GB'],
    'France': ['Europe/Paris', 'fr-FR'], 'FR': ['Europe/Paris', 'fr-FR'],
    'Canada': ['America/Toronto', 'en-CA'], 'CA': ['America/Toronto', 'en-CA'],
    'Spain': ['Europe/Madrid', 'es-ES'], 'ES': ['Europe/Madrid', 'es-ES'],
    'Italy': ['Europe/Rome', 'it-IT'], 'IT': ['Europe/Rome', 'it-IT'],
    'Poland': ['Europe/Warsaw', 'pl-PL'], 'PL': ['Europe/Warsaw', 'pl-PL'],
    'Brazil': ['America/Sao_Paulo', 'pt-BR'], 'BR': ['America/Sao_Paulo', 'pt-BR'],
    'India': ['Asia/Kolkata', 'en-IN'], 'IN': ['Asia/Kolkata', 'en-IN'],
    'Japan': ['Asia/Tokyo', 'ja-JP'], 'JP': ['Asia/Tokyo', 'ja-JP'],
    'Australia': ['Australia/Sydney', 'en-AU'], 'AU': ['Australia/Sydney', 'en-AU']
  };
  const COHERENT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // Match a fingerprint's timezone + language to its proxy country (coherence avoids bans).
  function applyCountryToSpoof(s, country) {
    const m = country && COUNTRY_TZ_LANG[country];
    if (m) {
      s.timezoneMode = 'manual'; s.timezone = m[0];
      s.languageMode = 'manual'; s.language = m[1];
    }
    return s;
  }

  // Self-heal an identity's timezone/language to a country once its proxy's REAL country is known.
  // A host:port proxy has no country when the identity is built, so tz/lang default to your real locale
  // (incoherent: US exit + FR timezone). Re-derives them if they don't already match; when the profile is
  // active, also updates + persists + re-injects the live spoof. Idempotent (no-ops once coherent).
  function healSpoofCountry(profile, cc) {
    if (!profile || !profile.spoof || !cc || !COUNTRY_TZ_LANG[cc]) return false;
    if (tzCountry(profile.spoof.timezone) === cc) return false; // already matches this country — don't re-fire
    applyCountryToSpoof(profile.spoof, cc);
    if (profile.id === activeProfileId) {
      applyCountryToSpoof(spoofingSettings, cc);
      chrome.storage.local.set({ spoofingSettings: spoofingSettings });
      chrome.runtime.sendMessage({ action: 'updateSpoofingSettings', settings: spoofingSettings });
    }
    return true;
  }

  // Coherent device templates — each is an internally-consistent real machine: the UA
  // implies the platform + client-hints (pageSpoof derives those), paired with a matching
  // GPU, screen, cores and RAM. 'os' drives the Windows-only vs Diverse filter.
  const DEVICE_POOL = [
    { os: 'win', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11 vs_5_0 ps_5_0, D3D11)', cores: '8', mem: '16', screen: '1920x1080' },
    { os: 'win', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)', cores: '4', mem: '8', screen: '1366x768' },
    { os: 'win', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)', cores: '12', mem: '16', screen: '2560x1440' },
    { os: 'win', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)', cores: '16', mem: '32', screen: '1920x1080' },
    { os: 'mac', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)', cores: '8', mem: '8', screen: '1440x900' },
    { os: 'mac', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', cores: '10', mem: '16', screen: '1512x982' },
    { os: 'mac', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel Inc., Intel(R) Iris(TM) Plus Graphics 640, OpenGL 4.1)', cores: '4', mem: '8', screen: '1680x1050' },
    { os: 'linux', ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics (CML GT2), OpenGL 4.6)', cores: '4', mem: '8', screen: '1920x1080' },
    { os: 'linux', ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6600 (navi23, LLVM 15.0.7, DRM 3.49), OpenGL 4.6)', cores: '8', mem: '16', screen: '2560x1440' }
  ];
  function newFpSeed() { return Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36); }

  // Build a UNIQUE, coherent fingerprint for one profile. Uniqueness (distinct UA/GPU/
  // screen/cores + a per-profile canvas seed) stops two profiles from looking like the SAME
  // machine on different IPs; coherence + country-match keep each one un-flagged. mode:
  // 'windows' picks from the Windows pool only; 'diverse' may roll macOS/Linux too.
  function buildCoherentSpoof(proxy, mode, avoidUAs) {
    mode = mode || autoFpMode || 'windows';
    const osOf = (ua) => (ua.indexOf('Mac') > -1 ? 'mac' : (ua.indexOf('Linux') > -1 ? 'linux' : 'win'));
    let pool = DEVICE_POOL.filter((d) => (mode === 'diverse' ? true : d.os === 'win'));
    if (avoidUAs && avoidUAs.length) {
      // Diverse mode: first prefer an OS no other profile uses, so identities visibly vary
      // (Windows -> macOS -> Linux), not just by Chrome version.
      if (mode === 'diverse') {
        const usedOS = avoidUAs.map(osOf);
        const freshOS = pool.filter((d) => usedOS.indexOf(d.os) === -1);
        if (freshOS.length) pool = freshOS;
      }
      const freshUA = pool.filter((d) => avoidUAs.indexOf(d.ua) === -1);
      if (freshUA.length) pool = freshUA; // then prefer a device no other profile already uses
    }
    const dev = pool[Math.floor(Math.random() * pool.length)] || DEVICE_POOL[0];
    const s = JSON.parse(JSON.stringify(DEFAULT_SPOOF));
    s.canvasMode = 'noise';
    s.webglMode = 'noise';
    s.webrtcMode = 'off';
    s.clientRectsMode = 'noise';
    s.doNotTrack = true;
    s.userAgent = dev.ua;
    // GPU matches the device's OS (pageSpoof derives platform + client-hints from the UA,
    // so UA, platform, CH and WebGL all tell the same OS story).
    s.webglInfoMode = 'manual';
    s.webglVendor = dev.vendor;
    s.webglRenderer = dev.renderer;
    s.cpuMode = 'manual'; s.cpuCores = dev.cores;
    s.memoryMode = 'manual'; s.memoryGB = dev.mem;
    s.screenMode = 'manual'; s.screenResolution = dev.screen;
    s.fpSeed = newFpSeed(); // per-profile salt → unique canvas/WebGL noise, stable once saved
    applyCountryToSpoof(s, proxy && proxy.country);
    return s;
  }

  function createProfileSimple(name) {
    let best = null;
    const proxyEl = document.getElementById('newProfileProxy');
    if (proxyEl && proxyEl.value.trim()) {
      const parsed = parseProxyLine(withScheme(proxyEl.value.trim()));
      if (parsed) {
        if (!proxies.find((p) => p.full === parsed.full)) { proxies.push(parsed); saveProxies(); renderProxyList(); }
        best = proxies.find((p) => p.full === parsed.full);
      } else {
        showNotification('That proxy line could not be parsed', 'error');
      }
      proxyEl.value = '';
    }
    if (!best) best = proxies.filter((p) => p.status === 'Working').sort((a, b) => (a.speed || 9e9) - (b.speed || 9e9))[0] || proxies[0] || null;
    const usedUAs = profiles.map((p) => p.spoof && p.spoof.userAgent).filter(Boolean);
    const profile = {
      id: 'p' + Date.now(),
      name: (name && name.trim()) || ('Profile ' + (profiles.length + 1)),
      proxy: best || null,
      proxyFull: best ? best.full : '',
      country: best && best.country ? best.country : '',
      spoof: buildCoherentSpoof(best, autoFpMode, usedUAs),
      security: { webrtcProtection: true, killSwitch: false, dnsRouting: false, blockWebSockets: false, fingerprintProtection: true, userAgentRotation: false, blockTracking: true, clearCookies: true }
    };
    profiles.push(profile);
    saveProfiles();
    applyProfile(profile);
    showNotification('Profile "' + profile.name + '" created', 'success');
    // Auto-test the proxy so its country resolves and the fingerprint self-corrects.
    if (best && !best.country) {
      const idx = proxies.findIndex((p) => p.full === best.full);
      if (idx >= 0) testSingleProxy(idx);
    }
  }

  // Create an identity straight from a pool proxy (bulk-import flow): the proxy + a unique
  // country-matched fingerprint. Respects the Free=1 gate. applyProfile activates the proxy,
  // so the new identity lands active on Home — answering "where is it activated?".
  function makeProfileFromProxy(proxy) {
    const usedUAs = profiles.map((p) => p.spoof && p.spoof.userAgent).filter(Boolean);
    const profile = {
      id: 'p' + Date.now() + '_' + profiles.length + '_' + Math.floor(Math.random() * 1000),
      name: 'Identity ' + (profiles.length + 1),
      proxy: proxy,
      proxyFull: proxy.full,
      country: proxy.country && proxy.country !== 'Unknown' ? proxy.country : '',
      spoof: buildCoherentSpoof(proxy, autoFpMode, usedUAs),
      security: { webrtcProtection: true, killSwitch: false, dnsRouting: false, blockWebSockets: false, fingerprintProtection: true, userAgentRotation: false, blockTracking: true, clearCookies: true }
    };
    profiles.push(profile);
    return profile;
  }
  function gatedShowPaywall() { const o = document.getElementById('paywallOverlay'); if (o) o.style.display = 'block'; }
  function createProfileFromProxy(proxy) {
    if (!proxy) return;
    if (!proIsPaid && profiles.length >= 1) { gatedShowPaywall(); return; }
    const p = makeProfileFromProxy(proxy);
    saveProfiles();
    applyProfile(p);
    showScreen('home');
    showNotification('Identity "' + p.name + '" created', 'success');
  }
  function createIdentitiesFromWorking() {
    const working = proxies.filter((p) => p.status === 'Working');
    if (!working.length) { showNotification('No working proxies — test them first', 'error'); return; }
    const usedFulls = profiles.map((p) => (p.proxy && p.proxy.full) || p.proxyFull).filter(Boolean);
    const todo = working.filter((p) => usedFulls.indexOf(p.full) === -1);
    if (!todo.length) { showNotification('Every working proxy already has an identity', 'success'); return; }
    let last = null, made = 0;
    for (let i = 0; i < todo.length; i++) {
      if (!proIsPaid && profiles.length >= 1) break; // Free = 1 identity
      last = makeProfileFromProxy(todo[i]);
      made++;
    }
    if (made > 0) { saveProfiles(); applyProfile(last); showScreen('home'); showNotification('Created ' + made + ' ' + (made === 1 ? 'identity' : 'identities'), 'success'); }
    if (!proIsPaid && profiles.length >= 1 && made < todo.length) gatedShowPaywall();
  }

  // 2-letter country badge for an identity card (derived from country name or code).
  function ccBadge(p) {
    const c = (p && (p.country || (p.proxy && p.proxy.country)) || '').toString().trim();
    if (!c) return '··';
    return c.length === 2 ? c.toUpperCase() : c.slice(0, 2).toUpperCase();
  }

  // --- Simple editor sheet: create OR edit one identity (proxy + auto fingerprint + key toggles) ---
  let editorProfileId = null; // null = creating a new identity
  function edToggle(id, on) { const el = document.getElementById(id); if (el) el.classList.toggle('on', !!on); }
  function edToggleVal(id) { const el = document.getElementById(id); return el ? el.classList.contains('on') : true; }
  function fpSummary(s) {
    if (!s) return 'Auto-matched fingerprint';
    const os = s.userAgent && /Windows/i.test(s.userAgent) ? 'Windows' : (s.userAgent && /Mac/i.test(s.userAgent) ? 'macOS' : (s.userAgent && /Linux|X11/i.test(s.userAgent) ? 'Linux' : 'Auto'));
    return 'Fingerprint: ' + os + (s.language ? ' · ' + s.language : '') + (s.timezone ? ' · ' + s.timezone : '');
  }
  function openEditor(id) {
    editorProfileId = id || null;
    const p = id ? profiles.find((x) => x.id === id) : null;
    const setVal = (elId, val) => { const e = document.getElementById(elId); if (e) e.value = val; };
    const t = document.getElementById('editorTitle'); if (t) t.textContent = p ? 'Edit identity' : 'New identity';
    setVal('edName', p ? p.name : '');
    setVal('newProfileProxy', p ? ((p.proxy && p.proxy.full) || p.proxyFull || '') : '');
    edToggle('edWebrtc', p && p.security ? !!p.security.webrtcProtection : true);
    edToggle('edCookies', p && p.security ? !!p.security.clearCookies : true);
    const fp = document.getElementById('editorFp');
    if (fp) fp.textContent = p ? fpSummary(p.spoof) : "A matching fingerprint is generated from the proxy's country — that's it.";
    const sheet = document.getElementById('editorSheet'); if (sheet) sheet.style.display = 'block';
  }
  function closeEditor() { const s = document.getElementById('editorSheet'); if (s) s.style.display = 'none'; editorProfileId = null; }
  function saveEditor() {
    const nameEl = document.getElementById('edName');
    const name = nameEl ? nameEl.value.trim() : '';
    const webrtc = edToggleVal('edWebrtc');
    const cookies = edToggleVal('edCookies');
    const proxyEl = document.getElementById('newProfileProxy');
    if (editorProfileId) {
      const p = profiles.find((x) => x.id === editorProfileId);
      if (!p) { closeEditor(); return; }
      if (name) p.name = name;
      p.security = p.security || {};
      p.security.webrtcProtection = webrtc;
      p.security.clearCookies = cookies;
      const newProxy = proxyEl ? withScheme(proxyEl.value.trim()) : '';
      const curProxy = (p.proxy && p.proxy.full) || p.proxyFull || '';
      saveProfiles();
      closeEditor();
      if (newProxy && newProxy !== curProxy) setProfileProxy(p.id, newProxy); // sets proxy + applies
      else applyProfile(p);
    } else {
      // createProfileSimple reads #newProfileProxy, auto-builds the fingerprint, applies, and clears the input.
      createProfileSimple(name);
      const np = getActiveProfile();
      if (np) { np.security = np.security || {}; np.security.webrtcProtection = webrtc; np.security.clearCookies = cookies; saveProfiles(); applyProfile(np); }
      closeEditor();
    }
  }

  function applyProfile(p) {
    if (!p) return;
    activeProfileId = p.id;
    chrome.storage.local.remove('diagCache'); // identity changed -> force a fresh protection check next open
    spoofingSettings = JSON.parse(JSON.stringify(p.spoof));
    securitySettings = JSON.parse(JSON.stringify(p.security));
    chrome.storage.local.set({ spoofingSettings, securitySettings, activeProfileId }, () => {
      loadSpoofingSettings();
      loadSecuritySettings();
      chrome.runtime.sendMessage({ action: 'updateSpoofingSettings', settings: spoofingSettings });
      chrome.runtime.sendMessage({ action: 'updateSecuritySettings', settings: securitySettings });
      if (spoofingSettings.userAgent) {
        chrome.runtime.sendMessage({ action: 'setCustomUserAgent', userAgent: spoofingSettings.userAgent });
      }
      // Self-contained: the profile carries its own proxy object, so the Proxies tab
      // can't orphan it. Fall back to the global list for a pre-migration profile and
      // self-heal by copying the match in.
      let px = p.proxy || null;
      if (!px && p.proxyFull) {
        px = proxies.find((x) => x.full === p.proxyFull) || null;
        if (px) { p.proxy = px; saveProfiles(); }
      }
      if (px) {
        activateProxy(px);
      } else {
        // Never fail silently (WORKING_AGREEMENT §6): say what's wrong and offer the fix.
        deactivateProxy();
        if (p.proxyFull) {
          editingProxyId = p.id;
          showNotification("This profile's proxy was removed — set a new one", 'error');
        } else {
          showNotification('No proxy on this profile yet — tap edit to set one', 'info');
        }
      }
      const toggle = document.getElementById('anonToggle');
      if (toggle) toggle.checked = true;
      renderProfilesList();
      // renderProfilesList reset the card's status span — restore the live "Connecting…" ("Turn off" was
      // already revealed by activateProxy and survives the re-render), then verify promptly. The concurrent
      // probe waits up to 5s for the exit, so starting at 400ms (not 2500) is safe and feels instant.
      const csc = document.getElementById('activeStatus'); if (csc) csc.textContent = 'Connecting…';
      setTimeout(() => updateHome(true), 400);
    });
  }

  function goDirect() {
    // Single-shot: hide the "Turn off" link on the first tap so a burst of rapid taps can't stack
    // deactivate calls / notifications. If it's already hidden (off or mid-turn-off), ignore the tap.
    const dw = document.getElementById('goDirectWrap');
    if (dw) {
      if (dw.style.display === 'none') return;
      dw.style.display = 'none';
    }
    deactivateProxy();
    // Going direct = back to your REAL identity: reset BOTH the fingerprint AND the security/WebRTC
    // settings, and PERSIST them (getSpoofingForDiag reads storage; the WebRTC check reads the live
    // policy). Without the security reset, "protection off" still left WebRTC blocked — which reads as
    // protection while your real IP is exposed. Re-activating any identity restores both.
    const realSpoof = JSON.parse(JSON.stringify(DEFAULT_SPOOF));
    const realSecurity = JSON.parse(JSON.stringify(DEFAULT_SECURITY));
    spoofingSettings = realSpoof;
    securitySettings = realSecurity;
    chrome.storage.local.set({ spoofingSettings: realSpoof, securitySettings: realSecurity });
    chrome.runtime.sendMessage({ action: 'updateSpoofingSettings', settings: realSpoof });
    chrome.runtime.sendMessage({ action: 'updateSecuritySettings', settings: realSecurity });
    showNotification('Protection off — real identity', 'info');
    setTimeout(() => updateHome(true), 1200);
  }

  // --- Diagnostics: in-extension checks, no external sites needed ---
  function diagEscape(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // Probe WebRTC FROM THE ACTIVE WEB PAGE, not from the popup. webRTCIPHandlingPolicy
  // does NOT apply to extension pages, so a popup-side probe always "leaks" even when
  // real sites are fully protected — a false positive. Injecting into the page measures
  // what actual websites see.
  // Public IP test (v4 + v6) — separates a REAL WebRTC leak from harmless private/link-local candidates.
  function isPublicIp(ip) {
    if (!ip) return false;
    if (ip.indexOf(':') > -1) { var l = ip.toLowerCase(); return !(l.indexOf('fe80') === 0 || l.indexOf('fc') === 0 || l.indexOf('fd') === 0 || l === '::1' || l === '::'); }
    var p = ip.split('.').map(Number);
    if (p.length !== 4 || p.some(function (n) { return isNaN(n); })) return false;
    if (p[0] === 10 || p[0] === 127 || (p[0] === 192 && p[1] === 168) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 169 && p[1] === 254)) return false;
    return true;
  }
  // Country of a spoofed timezone (common IANA zones) + region of a language tag ('en-US' -> 'US').
  var TZ_COUNTRY = { 'America/New_York':'US','America/Chicago':'US','America/Denver':'US','America/Los_Angeles':'US','America/Phoenix':'US','America/Anchorage':'US','America/Toronto':'CA','America/Vancouver':'CA','America/Mexico_City':'MX','America/Sao_Paulo':'BR','America/Argentina/Buenos_Aires':'AR','Europe/London':'GB','Europe/Berlin':'DE','Europe/Paris':'FR','Europe/Madrid':'ES','Europe/Rome':'IT','Europe/Amsterdam':'NL','Europe/Zurich':'CH','Europe/Vienna':'AT','Europe/Stockholm':'SE','Europe/Oslo':'NO','Europe/Copenhagen':'DK','Europe/Warsaw':'PL','Europe/Moscow':'RU','Europe/Dublin':'IE','Europe/Brussels':'BE','Europe/Lisbon':'PT','Europe/Helsinki':'FI','Europe/Prague':'CZ','Europe/Athens':'GR','Europe/Bucharest':'RO','Europe/Kyiv':'UA','Europe/Istanbul':'TR','Asia/Tokyo':'JP','Asia/Shanghai':'CN','Asia/Hong_Kong':'HK','Asia/Singapore':'SG','Asia/Seoul':'KR','Asia/Kolkata':'IN','Asia/Dubai':'AE','Asia/Bangkok':'TH','Asia/Jakarta':'ID','Asia/Manila':'PH','Asia/Jerusalem':'IL','Australia/Sydney':'AU','Australia/Melbourne':'AU','Australia/Perth':'AU','Pacific/Auckland':'NZ','Africa/Johannesburg':'ZA','Africa/Cairo':'EG','Africa/Lagos':'NG' };
  function tzCountry(tz) { return (tz && TZ_COUNTRY[tz]) || ''; }
  function langRegion(l) { var m = /[-_]([A-Za-z]{2})\b/.exec(l || ''); return m ? m[1].toUpperCase() : ''; }
  function normCC(c) { c = (c || '').trim(); return c.length === 2 ? c.toUpperCase() : ''; }
  function webrtcProbe() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs && tabs[0];
        if (!tab || !tab.url || !/^https?:/i.test(tab.url)) { resolve({ unavailable: true }); return; }
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: 'MAIN',
          func: () => new Promise((res) => {
            const ips = new Set(); let pc;
            try { pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }); }
            catch (e) { res([]); return; }
            try { pc.createDataChannel('x'); } catch (e) {}
            pc.onicecandidate = (e) => {
              if (!e.candidate) { try { pc.close(); } catch (_) {} res([...ips]); return; }
              const addr = (e.candidate.candidate || '').split(' ')[4]; // connection address, v4 or v6
              if (addr && !/\.local$/i.test(addr) && addr.indexOf('0.') !== 0 && (/^[0-9.]+$/.test(addr) || addr.indexOf(':') > -1)) ips.add(addr);
            };
            pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => res([]));
            setTimeout(() => { try { pc.close(); } catch (_) {} res([...ips]); }, 4000);
          })
        }).then((r) => {
          const out = r && r[0] && r[0].result;
          resolve({ ips: Array.isArray(out) ? out : [] });
        }).catch(() => resolve({ unavailable: true }));
      });
    });
  }

  function getSpoofingForDiag() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['spoofingSettings'], (data) => resolve(data.spoofingSettings || {}));
    });
  }

  function diagTimeAgo(ts) {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    return s < 60 ? (s + 's ago') : (Math.round(s / 60) + 'm ago');
  }
  // WebRTC reliably: read the policy CONFIG, don't empirically probe. Extension pages
  // (popup/offscreen) bypass webRTCIPHandlingPolicy, so a probe there is a false positive;
  // if the policy is 'disable_non_proxied_udp', real pages get no candidates = protected.
  function webrtcConfigStatus() {
    return new Promise((resolve) => {
      try {
        const api = chrome.privacy && chrome.privacy.network && chrome.privacy.network.webRTCIPHandlingPolicy;
        if (!api) { resolve(false); return; }
        api.get({}, (d) => { resolve(!!(d && d.value === 'disable_non_proxied_udp')); });
      } catch (e) { resolve(false); }
    });
  }
  // Ground truth for "is a proxy really carrying our traffic": read Chrome's LIVE proxy config, not
  // our stored activeProxy flag. That flag goes stale after an app update, a service-worker restart,
  // or a Pro->Free drop (identity still shown active while Chrome quietly fell back to direct). Fails
  // closed to { on:false } so we never over-claim protection.
  function getLiveProxyConfig() {
    return new Promise((resolve) => {
      try {
        chrome.proxy.settings.get({}, (s) => {
          const v = s && s.value, sp = v && v.rules && v.rules.singleProxy;
          if (v && v.mode === 'fixed_servers' && sp && sp.host) {
            resolve({ on: true, host: sp.host, port: String(sp.port == null ? '' : sp.port), scheme: (sp.scheme || 'http') });
          } else {
            resolve({ on: false, host: '', port: '', scheme: '' });
          }
        });
      } catch (e) { resolve({ on: false, host: '', port: '', scheme: '' }); }
    });
  }
  async function measureDiagnostics() {
    const exit = await probeExit();
    const webrtcCfg = await webrtcConfigStatus();      // policy flag — fallback when there's no page to probe
    const rtc = await webrtcProbe();                   // real STUN probe from the active web page (v4 + v6)
    const webrtcTested = !!(rtc && rtc.ips);           // false when there's no active http(s) tab to probe
    const s = await getSpoofingForDiag();
    const ua = !!s.userAgent, canvas = !!(s.canvasMode && s.canvasMode !== 'real'), webgl = !!(s.webglMode && s.webglMode !== 'real'), tz = s.timezoneMode === 'manual', lang = s.languageMode === 'manual';
    const vectors = [ua, canvas, webgl, tz, lang];
    const faked = vectors.filter(Boolean).length;
    // Timezone/language COHERENCE: does the SPOOFED value's country match the proxy's exit country? A
    // spoofed tz/lang pointing at a different country than the proxy is a TELL, not protection.
    const exitCC = normCC(exit.country);
    const tzCC = tz ? tzCountry(s.timezone) : '';
    const langCC = lang ? langRegion(s.language) : '';
    const tzCoherent = tz && !!exitCC && !!tzCC && tzCC === exitCC;
    const tzMismatch = tz && !!exitCC && !!tzCC && tzCC !== exitCC;
    const langCoherent = lang && !!exitCC && !!langCC && langCC === exitCC;
    const langMismatch = lang && !!exitCC && !!langCC && langCC !== exitCC;
    const os = s.userAgent && /Windows/i.test(s.userAgent) ? 'Windows' : (s.userAgent && /Mac/i.test(s.userAgent) ? 'macOS' : (s.userAgent && /Linux|X11/i.test(s.userAgent) ? 'Linux' : 'Auto'));
    // The IP is only "masked" when a proxy is REALLY carrying traffic. exit.ok alone is true even
    // with the proxy OFF (the probe just returns the REAL IP), and our stored activeProxy flag can go
    // stale after an update / SW restart / Pro->Free drop. Read Chrome's LIVE proxy config as the
    // ground truth — this is the fix for "Fully protected 7/7 while the proxy is off".
    const live = await getLiveProxyConfig();
    const baseline = await getRealIpBaseline();
    const ipMasked = live.on && !!exit.ok;
    const proxyIp = exit.ip || '';
    // Real WebRTC result: a leak that MATTERS is a public IP that isn't the proxy exit -> your real IP is
    // discoverable via WebRTC even when HTTP is proxied. No page to probe -> fall back to the policy flag.
    const webrtcLeaked = webrtcTested ? rtc.ips.filter(isPublicIp) : [];
    const webrtcRealLeak = webrtcLeaked.some(function (ip) { return ip !== proxyIp; });
    const webrtcProtected = webrtcTested ? !webrtcRealLeak : webrtcCfg;
    // DNS: scheme heuristic. HTTP/HTTPS/SOCKS5 resolve DNS proxy-side; SOCKS4 has no remote DNS so
    // queries hit your local resolver -> a DNS leak. IPv6: a real IPv6 via WebRTC = v6 discoverable.
    const scheme = (live.scheme || '').toLowerCase();
    const dnsLeak = ipMasked && scheme === 'socks4';
    const ipv6Exposed = webrtcLeaked.some(function (ip) { return ip.indexOf(':') > -1 && ip !== proxyIp; });
    // IP masking is the GATE. If your real IP is exposed, a spoofed fingerprint / blocked WebRTC do
    // NOT protect you (you're identified by the IP), so the score is 0 — never "6/7 while exposed".
    const score = (ipMasked && !webrtcRealLeak) ? Math.max(0, [ipMasked, webrtcProtected, ua, canvas, webgl, (tz && !tzMismatch), (lang && !langMismatch)].filter(Boolean).length - (dnsLeak ? 1 : 0)) : 0;
    // The 7 that make the score, then 'extra' hardening shown only in the expert view.
    const detail = [
      { label: 'Exit IP masked by proxy', ok: ipMasked },
      { label: 'WebRTC leak blocked', ok: !!webrtcProtected },
      { label: 'User-Agent spoofed', ok: ua },
      { label: 'Canvas randomised', ok: canvas },
      { label: 'WebGL randomised', ok: webgl },
      { label: 'Timezone matches proxy', ok: (tz && !tzMismatch) },
      { label: 'Language matches proxy', ok: (lang && !langMismatch) },
      { label: 'GPU model spoofed', ok: s.webglInfoMode === 'manual', extra: true },
      { label: 'Screen size set', ok: s.screenMode === 'manual', extra: true },
      { label: 'CPU cores set', ok: s.cpuMode === 'manual', extra: true },
      { label: 'Device memory set', ok: s.memoryMode === 'manual', extra: true },
      { label: 'Do Not Track on', ok: !!s.doNotTrack, extra: true }
    ];
    return { ts: Date.now(), ipMasked: ipMasked, exitOk: !!exit.ok, exitIp: exit.ip || '', exitCountry: exit.country || '', proxyIp: exit.ip || '', proxyCountry: exit.country || '', realIp: baseline ? baseline.ip : '', realCountry: baseline ? (baseline.country || '') : '', realTs: baseline ? baseline.ts : 0, webrtcProtected: webrtcProtected, webrtcRealLeak: webrtcRealLeak, webrtcLeakedIp: webrtcLeaked[0] || '', webrtcTested: webrtcTested, scheme: scheme, dnsLeak: dnsLeak, ipv6Exposed: ipv6Exposed, tzMatched: tz, langMatched: lang, tzCoherent: tzCoherent, tzMismatch: tzMismatch, tzCC: tzCC, langCoherent: langCoherent, langMismatch: langMismatch, langCC: langCC, exitCC: exitCC, fpCoherent: faked >= 3, fpOs: os, fpFaked: faked, score: score, detail: detail };
  }
  let diagDetail = false;
  function renderDiagCards(el, c) {
    // Ground truth (from 1.21.1): if the IP isn't masked (proxy off/dead), the real IP is exposed and
    // the verdict is "Exposed" no matter how good the fingerprint is. Old caches w/o ipMasked -> exitOk.
    const ipMasked = (c.ipMasked !== undefined) ? c.ipMasked : c.exitOk;
    // A real WebRTC leak (public IP != the proxy) means your real IP is discoverable even if HTTP is
    // proxied -> still Exposed, score 0. IP-masking alone is no longer enough for "protected".
    const webrtcLeak = !!c.webrtcRealLeak;
    const exposed = !ipMasked || webrtcLeak;
    // Exposed is gated on IP-masking, not the score: if the IP is masked you are NOT "Exposed", even
    // lightly hardened (min "Partly protected"). If it isn't masked, always "Exposed".
    // Step 5: verdict tier AND colour come from one score, so the ring never disagrees with the words.
    // 7 Fully / 5-6 Well = green · 3-4 Partly / 1-2 Barely = amber · not masked or leaking = Exposed (red).
    const verdict = exposed ? 'Exposed' : (c.score >= 7 ? 'Fully protected' : (c.score >= 5 ? 'Well protected' : (c.score >= 3 ? 'Partly protected' : 'Barely protected')));
    const vVar = exposed ? 'danger' : (c.score >= 5 ? 'success' : 'warning');
    const ringCls = exposed ? 'bad' : (c.score >= 5 ? '' : 'warn');
    const proxyLine = ipMasked ? (c.proxyIp ? (c.proxyIp + (c.proxyCountry ? ' · ' + c.proxyCountry : '')) : 'connected · IP hidden') : 'direct — no proxy active';
    const realLine = c.realIp ? (c.realIp + (c.realCountry ? ' · ' + c.realCountry : '')) : 'not captured — turn protection off once to record it';
    // When exposed (real IP showing), a spoofed fingerprint/timezone is a MISMATCH, not protection —
    // show those amber, and never claim "matched to proxy" when no proxy is actually masking.
    const rows = [
      ['WebRTC', c.webrtcRealLeak ? ('leaks ' + (c.webrtcLeakedIp || 'real IP')) : (c.webrtcTested ? 'no leak' : (c.webrtcProtected ? 'blocked — open a tab to test' : 'not blocked')), c.webrtcRealLeak ? 'bad' : (c.webrtcProtected ? (exposed ? 'warn' : 'ok') : 'warn')],
      ['DNS', !ipMasked ? 'no proxy' : (c.dnsLeak ? 'SOCKS4 · may leak' : ((c.scheme ? c.scheme.toUpperCase() : 'proxy') + ' · proxy-side')), !ipMasked ? 'warn' : (c.dnsLeak ? 'bad' : 'ok')],
      ['IPv6', c.ipv6Exposed ? 'real IPv6 leaks' : (exposed ? 'exposed' : 'no leak'), c.ipv6Exposed ? 'bad' : (exposed ? 'warn' : 'ok')],
      ['Timezone', !c.tzMatched ? (exposed ? 'real — exposed' : 'real (≠ proxy)') : (c.tzCoherent ? ('matches ' + (c.exitCC || 'proxy')) : (c.tzMismatch ? ((c.tzCC || '?') + ' ≠ ' + (c.exitCC || 'proxy')) : 'spoofed')), exposed ? 'warn' : ((c.tzMatched && !c.tzMismatch) ? 'ok' : 'warn')],
      ['Language', !c.langMatched ? (exposed ? 'real — exposed' : 'real (≠ proxy)') : (c.langCoherent ? ('matches ' + (c.exitCC || 'proxy')) : (c.langMismatch ? ((c.langCC || '?') + ' ≠ ' + (c.exitCC || 'proxy')) : 'spoofed')), exposed ? 'warn' : ((c.langMatched && !c.langMismatch) ? 'ok' : 'warn')],
      ['Fingerprint', c.fpCoherent ? ('coherent · ' + c.fpOs) : (c.fpFaked ? ('partial · ' + c.fpFaked + '/5') : (exposed ? 'real — exposed' : 'real')), exposed ? 'warn' : (c.fpCoherent ? 'ok' : 'warn')]
    ];
    let html = '<div class="dg2-head"><div class="dg2-ring ' + ringCls + '"><b style="color:var(--' + vVar + ');">' + c.score + '/7</b></div><div><div class="dg2-vd" style="color:var(--' + vVar + ');">' + verdict + '</div><div class="dg2-vsub">' + (!ipMasked ? 'your real IP is showing' : (webrtcLeak ? 'real IP leaking via WebRTC' : 'checks pass · ' + diagEscape(c.proxyCountry || 'proxy') + ' exit')) + '</div></div></div>';
    html += '<div class="dg2-hero"><div class="dg2-hlbl">YOUR REAL IP &#8594; PROXY EXIT</div><div class="dg2-real">' + diagEscape(realLine) + '</div><div class="dg2-proxy" style="color:var(--' + (ipMasked ? 'success' : 'text') + ');">&#8594; ' + diagEscape(proxyLine) + '</div><div class="dg2-mask" style="color:var(--' + (exposed ? 'danger' : 'success') + ');">' + (!ipMasked ? 'real IP exposed ✗' : (webrtcLeak ? '⚠ real IP leaks via WebRTC' : 'real IP hidden — masked ✓')) + '</div></div>';
    html += rows.map(function (r) { return '<div class="dg-card"><span class="dg-dot ' + r[2] + '"></span><span class="dg-name">' + r[0] + '</span><span class="dg-val ' + r[2] + '">' + diagEscape(r[1]) + '</span></div>'; }).join('');
    if (diagDetail && c.detail) {
      // When exposed, the per-vector checks below are still factually ✓ (the value IS spoofed) but they
      // don't protect you — say so, so a wall of green ✓ never reads as "safe" next to 0/7 Exposed.
      var exposedNote = exposed ? '<div class="dg-drow" style="color:var(--danger);font-size:11px;">Your real IP is exposed — the spoofing below can\'t protect you while your IP is showing.</div>' : '';
      html += '<div class="dg-detail">' + exposedNote + c.detail.map(function (d) { return '<div class="dg-drow"><span class="dg-check ' + (d.ok ? 'ok' : 'bad') + '">' + (d.ok ? '✓' : '✗') + '</span><span style="flex:1;">' + diagEscape(d.label) + '</span>' + (d.extra ? '<span class="dg-xtra">extra</span>' : '') + '</div>'; }).join('') + '</div>';
    }
    html += '<div class="dg2-foot"><span class="dg-fresh" style="margin:0;">Checked ' + diagTimeAgo(c.ts) + ' · live proxy</span><a href="https://ipleak.net" target="_blank" rel="noopener nofollow">Full external test ›</a></div>';
    if (c.detail) html += '<div class="dg-toggle" data-diagtoggle="1">' + (diagDetail ? 'Hide details' : 'Show all ' + c.detail.length + ' checks ›') + '</div>';
    el.innerHTML = html;
  }
  function getDiagCache() { return new Promise((res) => chrome.storage.local.get(['diagCache'], (d) => res(d.diagCache || null))); }
  function getRealIpBaseline() { return new Promise((res) => chrome.storage.local.get(['realIpBaseline'], (d) => res((d && d.realIpBaseline) || null))); }
  async function runDiagnostics(force) {
    const el = document.getElementById('diagResults');
    if (!el) return;
    const cache = await getDiagCache();
    if (cache) renderDiagCards(el, cache);            // instant: last-known result
    else el.innerHTML = '<div class="diag-empty">Checking…</div>';
    if (cache && !force && (Date.now() - cache.ts < 60000)) return; // throttle: <60s old, skip re-probe
    const result = await measureDiagnostics();
    chrome.storage.local.set({ diagCache: result });
    renderDiagCards(el, result);
  }

  function loadUserAgentTemplates() {
    fetch(chrome.runtime.getURL('user-agents.json'))
      .then(response => response.json())
      .then(data => {
        userAgentTemplates = data;
      })
      .catch(error => {
        console.error('Error loading User-Agent templates:', error);
        // Fallback to default templates if loading fails
        userAgentTemplates = {
          'chrome_windows': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'chrome_mac': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'chrome_linux': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'firefox_windows': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
          'firefox_mac': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15; rv:121.0) Gecko/20100101 Firefox/121.0',
          'firefox_linux': 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
          'safari_mac': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
          'edge_windows': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
          'mobile_safari': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
          'mobile_chrome': 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
        };
      });
  }

  // Hoisted to top level so BOTH the nested listeners in setupEventListeners AND top-level
  // callers (initialize's Pro-state load, createProfileFromProxy) can reach them.
  function showScreen(name, group) {
    tabContents.forEach(c => c.classList.remove('active'));
    const el = document.getElementById(name + '-tab');
    if (el) el.classList.add('active');
    document.querySelectorAll('#spoofing-tab .spoofing-section').forEach(s => {
      s.style.display = (group && name === 'spoofing' && s.dataset.group !== group) ? 'none' : '';
    });
    const navMap = { home: 'home', diagnostics: 'diagnostics', settings: 'settings', proxies: 'settings', spoofing: 'settings', security: 'settings', stats: 'settings' };
    const nav = navMap[name] || 'settings';
    document.querySelectorAll('.bn').forEach(b => b.classList.toggle('on', b.dataset.nav === nav));
    const sc = document.getElementById('screens'); if (sc) sc.scrollTop = 0;
    if (name === 'home') updateHome();
    else if (name === 'stats') updateStats();
    else if (name === 'diagnostics') runDiagnostics();
    else if (name === 'settings') updateProUI(); // re-assert Pro state so the plan row never shows a stale "Free"
  }
  function updateProUI() {
    const badge = document.getElementById('proBadge');
    if (badge) badge.style.display = proIsPaid ? 'inline-flex' : 'none';
    const pn = document.getElementById('planName'); if (pn) pn.textContent = proIsPaid ? 'Pro' : 'Free plan';
    const ps = document.getElementById('planSub'); if (ps) ps.textContent = proIsPaid ? 'unlimited identities' : '1 identity';
    const pbg = document.getElementById('planBadge'); if (pbg) pbg.textContent = proIsPaid ? 'PRO' : 'F';
    const up = document.getElementById('settingsUpgrade'); if (up) up.style.display = proIsPaid ? 'none' : '';
    const rel = document.getElementById('releaseLicenseRow'); if (rel) rel.style.display = realPaid ? 'flex' : 'none';
  }

  // Background re-check (max once / 12h). Drops to Free ONLY on a definitive "not active" from the
  // server (cancelled/expired subscription); network errors keep the cached Pro state (offline-safe).
  // Uses Creem's read-only validate, so it consumes no activation slot.
  async function reValidatePro() {
    const s = await new Promise((res) => chrome.storage.local.get(['proPaidCache', 'licenseKey', 'licenseInstanceId', 'lastValidated'], res));
    if (!s || !s.proPaidCache || !s.licenseKey || !s.licenseInstanceId) return;
    if (Date.now() - (s.lastValidated || 0) < 12 * 3600 * 1000) return;
    try {
      const r = await fetch(CREEM_VALIDATE_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: s.licenseKey, instanceId: s.licenseInstanceId, recheck: true })
      });
      const d = await r.json().catch(() => ({}));
      if (d && d.valid === true) {
        chrome.storage.local.set({ lastValidated: Date.now() });
      } else if (d && d.valid === false) {
        realPaid = false; proIsPaid = false;
        chrome.storage.local.remove(['proPaidCache', 'licenseKey', 'licenseInstanceId', 'lastValidated']);
        setUninstallDeactivate('', '');
        updateProUI(); renderProfilesList(); enforceFreeLimit();
      }
    } catch (e) { /* keep cached Pro state on a network error */ }
  }

  // Free = 1 identity. If a now-locked (Pro) identity is still active, fall back to the first
  // identity so a Free user can't keep using a Pro proxy.
  function enforceFreeLimit() {
    if (proIsPaid) return;
    const active = getActiveProfile();
    const idx = active ? profiles.findIndex((p) => p.id === active.id) : -1;
    if (idx >= 1 && profiles[0]) applyProfile(profiles[0]);
  }
  function setUninstallDeactivate(key, instanceId) {
    // On uninstall Chrome opens this URL → the Worker frees this device's Creem slot, so a
    // reinstall never burns an activation. Cleared when the license is released.
    try {
      if (key && instanceId) {
        chrome.runtime.setUninstallURL(CREEM_VALIDATE_URL.replace('/validate', '/deactivate') +
          '?key=' + encodeURIComponent(key) + '&instance=' + encodeURIComponent(instanceId));
      } else {
        chrome.runtime.setUninstallURL('');
      }
    } catch (e) {}
  }
  // ---- v1.21: data-driven referral cards (Cloudflare REFERRAL flag + REFERRALS array, via /config) ----
  function refEscape(s) { const d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; }
  function getRefDismissed() { return new Promise((res) => chrome.storage.local.get(['referralDismissed'], (d) => res((d && d.referralDismissed) || []))); }
  async function dismissReferral(id) { const d = await getRefDismissed(); if (d.indexOf(id) === -1) { d.push(id); chrome.storage.local.set({ referralDismissed: d }); } }
  async function loadReferrals() {
    const slot = document.getElementById('referralSlot');
    if (!slot) return;
    let cfg = null;
    try { const r = await fetch(CONFIG_URL); cfg = await r.json(); } catch (e) { return; }
    slot.innerHTML = '';
    if (!cfg || cfg.referral !== true || !Array.isArray(cfg.referrals) || !cfg.referrals.length) return;
    const dismissed = await getRefDismissed();
    cfg.referrals.forEach((ref) => {
      if (!ref || !ref.id || dismissed.indexOf(ref.id) > -1) return;
      const card = document.createElement('div');
      card.className = 'ref-card';
      card.innerHTML = '<span class="ref-x">&times;</span><div class="ref-title">' + refEscape(ref.title || 'Recommended') +
        '</div><div class="ref-text">' + refEscape(ref.text || '') + '</div><button class="ref-btn">' + refEscape(ref.button || 'Learn more') + ' &rarr;</button>';
      card.querySelector('.ref-btn').addEventListener('click', () => chrome.tabs.create({ url: GO_BASE + encodeURIComponent(ref.id) }));
      card.querySelector('.ref-x').addEventListener('click', () => { card.remove(); dismissReferral(ref.id); });
      slot.appendChild(card);
    });
  }

  // ---- v1.20: in-app rating prompt + feedback funnel ----
  function getRatingState() { return new Promise((res) => chrome.storage.local.get(['ratingState'], (d) => res((d && d.ratingState) || {}))); }
  function setRatingState(s) { chrome.storage.local.set({ ratingState: s }); }

  // Surface the prompt only after a positive milestone (2nd identity OR >=3 distinct active days),
  // at most 3 times, never while snoozed, never stacked on the paywall.
  async function maybeShowRatingPrompt() {
    const s = await getRatingState();
    if (s.done) return;
    const today = new Date().toISOString().slice(0, 10);
    const days = Array.isArray(s.days) ? s.days.slice(-30) : [];
    if (!days.includes(today)) days.push(today);
    setRatingState({ ...s, days });
    const eligible = (profiles.length >= 2 || days.length >= 3);
    const snoozed = s.snoozeUntil && Date.now() < s.snoozeUntil;
    if (!eligible || snoozed || (s.asked || 0) >= 3) return;
    setTimeout(() => {
      const pw = document.getElementById('paywallOverlay');
      if (pw && pw.style.display === 'block') return; // never on top of the paywall
      showRatingPrompt();
    }, 1000);
  }

  function showRatingPrompt() {
    const o = document.getElementById('ratingOverlay'); if (!o) return;
    document.getElementById('ratingAsk').style.display = 'block';
    document.getElementById('ratingForm').style.display = 'none';
    document.getElementById('ratingThanks').style.display = 'none';
    o.style.display = 'block';
    getRatingState().then((s) => setRatingState({ ...s, asked: (s.asked || 0) + 1, snoozeUntil: Date.now() + 2 * 864e5 }));
  }

  function hideRatingPrompt() { const o = document.getElementById('ratingOverlay'); if (o) o.style.display = 'none'; }
  async function ratingSnooze() { const s = await getRatingState(); setRatingState({ ...s, snoozeUntil: Date.now() + 7 * 864e5 }); hideRatingPrompt(); }
  async function ratingDone() { const s = await getRatingState(); setRatingState({ ...s, done: true }); }

  function openStoreReview() {
    chrome.tabs.create({ url: CHROME_STORE_URL + '?utm_source=extension&utm_medium=popup&utm_campaign=get_extension&utm_content=rating_prompt' });
    ratingDone(); hideRatingPrompt();
  }

  function showFeedbackForm(source) {
    feedbackSource = source || 'rating_prompt';
    feedbackCategory = '';
    document.querySelectorAll('.fb-cat').forEach((c) => c.classList.remove('on'));
    const msg = document.getElementById('fbMessage'); if (msg) msg.value = '';
    const o = document.getElementById('ratingOverlay'); if (!o) return;
    document.getElementById('ratingAsk').style.display = 'none';
    document.getElementById('ratingThanks').style.display = 'none';
    document.getElementById('ratingForm').style.display = 'block';
    o.style.display = 'block';
  }

  async function submitFeedback() {
    const msgEl = document.getElementById('fbMessage');
    const message = ((msgEl && msgEl.value) || '').trim();
    if (!message) { showNotification('Type a message first', 'error'); return; }
    const contactEl = document.getElementById('fbContact');
    const contact = (contactEl && contactEl.value) || '';
    const sendBtn = document.getElementById('fbSend');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending…'; }
    try {
      const r = await fetch(FEEDBACK_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.slice(0, 4000), category: feedbackCategory, contact: contact.slice(0, 200), source: feedbackSource, appVersion: chrome.runtime.getManifest().version })
      });
      const d = await r.json().catch(() => ({}));
      if (d && d.ok) {
        await ratingDone();
        document.getElementById('ratingForm').style.display = 'none';
        document.getElementById('ratingThanks').style.display = 'block';
      } else { showNotification('Could not send — please try again', 'error'); }
    } catch (e) { showNotification('Could not reach the server', 'error'); }
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send feedback'; }
  }

  function setupEventListeners() {
    const usoBtn = document.getElementById('usoOpenBtn');
    if (usoBtn) usoBtn.addEventListener('click', () => {
      try { chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id }); } catch (e) {}
    });
    window.addEventListener('focus', refreshUserScriptsOnboard);   // drop the card if they enabled it and returned
    const _byId = (id) => document.getElementById(id);
    if (_byId('ratingLove')) _byId('ratingLove').addEventListener('click', openStoreReview);
    if (_byId('ratingMeh')) _byId('ratingMeh').addEventListener('click', () => showFeedbackForm('rating_prompt'));
    if (_byId('ratingLater')) _byId('ratingLater').addEventListener('click', ratingSnooze);
    if (_byId('ratingClose')) _byId('ratingClose').addEventListener('click', ratingSnooze);
    if (_byId('fbSend')) _byId('fbSend').addEventListener('click', submitFeedback);
    if (_byId('thanksClose')) _byId('thanksClose').addEventListener('click', hideRatingPrompt);
    document.querySelectorAll('.fb-cat').forEach((c) => c.addEventListener('click', () => {
      document.querySelectorAll('.fb-cat').forEach((x) => x.classList.remove('on'));
      c.classList.add('on'); feedbackCategory = c.dataset.cat || '';
    }));
    document.querySelectorAll('.set-row[data-act="feedback"]').forEach((r) => r.addEventListener('click', () => showFeedbackForm('settings')));
    // showScreen / updateProUI / setUninstallDeactivate are hoisted to top level (above).
    document.querySelectorAll('.bn').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.nav)));
    document.querySelectorAll('.sub-back').forEach(b => b.addEventListener('click', () => openAdvanced()));
    document.querySelectorAll('.set-row[data-screen]').forEach(r => r.addEventListener('click', () => showScreen(r.dataset.screen)));
    document.querySelectorAll('.set-row[data-act="theme"]').forEach(r => r.addEventListener('click', toggleDarkMode));
    document.querySelectorAll('.set-row[data-act="ioprofiles"]').forEach(r => r.addEventListener('click', () => showNotification('Profile backup / restore — coming soon', 'info')));
    const settingsUpgradeEl = document.getElementById('settingsUpgrade');
    if (settingsUpgradeEl) settingsUpgradeEl.addEventListener('click', () => showPaywall());
    const _rel = document.getElementById('releaseLicenseRow');
    if (_rel) {
      let relArm = false, relTimer = null;
      _rel.addEventListener('click', () => {
        if (!relArm) { relArm = true; showNotification('Tap again to confirm — release Pro from this device', 'info'); relTimer = setTimeout(() => { relArm = false; }, 3000); }
        else { clearTimeout(relTimer); relArm = false; releaseLicense(); }
      });
    }

    // Password visibility
    showPasswords.addEventListener('change', () => {
      renderProxyList();
    });

    // Proxy management
    testBtn.addEventListener('click', testAllProxies);
    addBtn.addEventListener('click', addProxies);
    exportBtn.addEventListener('click', exportProxies);
    importBtn.addEventListener('click', importProxies);
    const createIdentitiesBtn = document.getElementById('createIdentitiesBtn');
    if (createIdentitiesBtn) createIdentitiesBtn.addEventListener('click', createIdentitiesFromWorking);
    clearBtn.addEventListener('click', clearAllProxies);
    deactivateBtn.addEventListener('click', deactivateProxy);
    deleteCookiesBtn.addEventListener('click', deleteCookies);
    deleteHistoryBtn.addEventListener('click', deleteHistory);

    // Overflow "more actions" menu (keeps the Proxies tab tidy)
    const moreBtnEl = document.getElementById('moreBtn');
    const moreMenuEl = document.getElementById('moreMenu');
    if (moreBtnEl && moreMenuEl) {
      moreBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenuEl.style.display = moreMenuEl.style.display === 'none' ? 'flex' : 'none';
      });
      document.addEventListener('click', () => { moreMenuEl.style.display = 'none'; });
    }

    // Diagnostics auto-runs via the bottom-nav showScreen('diagnostics'); keep the manual re-run button.
    const runDiagBtn = document.getElementById('runDiagnostics');
    if (runDiagBtn) runDiagBtn.addEventListener('click', () => runDiagnostics(true));
    const diagResultsEl = document.getElementById('diagResults');
    if (diagResultsEl) diagResultsEl.addEventListener('click', (e) => {
      if (e.target.closest('[data-diagtoggle]')) { diagDetail = !diagDetail; getDiagCache().then((c) => { if (c) renderDiagCards(diagResultsEl, c); }); }
    });

    // Home: active-profile toggle + profile management
    const anonToggleEl = document.getElementById('anonToggle');
    if (anonToggleEl) anonToggleEl.addEventListener('change', () => {
      if (anonToggleEl.checked) {
        const p = getActiveProfile();
        if (p) applyProfile(p);
        else { anonToggleEl.checked = false; showNotification('Create a profile first', 'error'); }
      } else {
        goDirect();
      }
    });
    // New identity → gate check → open the editor sheet (creating). Card "edit" opens it for an existing one.
    const newProfileBtnEl = document.getElementById('newProfileBtn');
    if (newProfileBtnEl) newProfileBtnEl.addEventListener('click', () => {
      if (isProfileGated()) { showPaywall(); return; }
      openEditor(null);
    });
    const editorSaveEl = document.getElementById('editorSave');
    if (editorSaveEl) editorSaveEl.addEventListener('click', saveEditor);
    const editorBackEl = document.getElementById('editorBack');
    if (editorBackEl) editorBackEl.addEventListener('click', closeEditor);
    const editorAdvEl = document.getElementById('editorAdv');
    if (editorAdvEl) editorAdvEl.addEventListener('click', () => { if (proIsPaid) openAdvanced(); else showPaywall(); });
    function openAdvanced() { const s = document.getElementById('advancedSheet'); if (s) s.style.display = 'block'; document.querySelectorAll('#advancedSheet [data-fpmode]').forEach((x) => x.classList.toggle('on', x.dataset.fpmode === autoFpMode)); }
    function closeAdvanced() { const s = document.getElementById('advancedSheet'); if (s) s.style.display = 'none'; }
    const advBackEl = document.getElementById('advancedBack');
    if (advBackEl) advBackEl.addEventListener('click', () => {
      closeAdvanced();
      // If a group-drill left the base screen on spoofing/security, don't strand the user
      // there — snap back Home (the editor, if still open, stays revealed on home).
      const active = document.querySelector('.tab-content.active');
      if (active && (active.id === 'spoofing-tab' || active.id === 'security-tab')) showScreen('home');
    });
    const advAutoEl = document.getElementById('advAuto');
    if (advAutoEl) advAutoEl.addEventListener('click', () => {
      const ap = getActiveProfile();
      if (!ap) { showNotification('Create an identity first', 'error'); return; }
      const usedUAs = profiles.filter((p) => p.id !== ap.id).map((p) => p.spoof && p.spoof.userAgent).filter(Boolean);
      ap.spoof = buildCoherentSpoof(ap.proxy || null, autoFpMode, usedUAs);
      saveProfiles();
      applyProfile(ap);
      closeAdvanced(); closeEditor(); showScreen('home');
      const os = (ap.spoof.userAgent.indexOf('Mac') > -1) ? 'macOS' : (ap.spoof.userAgent.indexOf('Linux') > -1 ? 'Linux' : 'Windows');
      showNotification('New ' + os + ' identity generated for "' + ap.name + '"', 'success');
    });
    document.querySelectorAll('#advancedSheet [data-fpmode]').forEach((p) => p.addEventListener('click', () => {
      autoFpMode = p.dataset.fpmode;
      chrome.storage.local.set({ autoFpMode: autoFpMode });
      document.querySelectorAll('#advancedSheet [data-fpmode]').forEach((x) => x.classList.toggle('on', x.dataset.fpmode === autoFpMode));
    }));
    document.querySelectorAll('#schemePills [data-scheme]').forEach((p) => p.addEventListener('click', () => {
      newProxyScheme = p.dataset.scheme;
      document.querySelectorAll('#schemePills [data-scheme]').forEach((x) => x.classList.toggle('on', x.dataset.scheme === newProxyScheme));
    }));
    document.querySelectorAll('#advancedSheet [data-adv]').forEach((r) => r.addEventListener('click', () => { closeAdvanced(); closeEditor(); showScreen(r.dataset.adv, r.dataset.group); }));
    ['edWebrtc', 'edCookies'].forEach((id) => { const el = document.getElementById(id); if (el) el.addEventListener('click', () => el.classList.toggle('on')); });
    const goDirectLinkEl = document.getElementById('goDirectLink');
    if (goDirectLinkEl) goDirectLinkEl.addEventListener('click', () => { goDirect(); setTimeout(() => updateHome(true), 800); });

    // ===== Monetization (ExtensionPay): Free = 1 profile, Pro = unlimited =====
    function isProfileGated() { return !proIsPaid && profiles.length >= 1; }
    function showPaywall() { const o = document.getElementById('paywallOverlay'); if (o) o.style.display = 'block'; }
    // Validate a Creem license key via your Worker (which holds the secret API key).
    async function redeemLicense(key) {
      key = (key || '').trim();
      if (!key) { showNotification('Paste your license key first', 'error'); return; }
      if (CREEM_VALIDATE_URL.indexOf('REPLACE') > -1) { showNotification('License server not set up yet', 'error'); return; }
      const _btn = document.getElementById('licenseActivate');
      const _btnLabel = _btn ? _btn.textContent : '';
      if (_btn) { _btn.disabled = true; _btn.textContent = 'Checking…'; }
      try {
        // Stable per-install id so Creem activations map to this install (not a new slot each time).
        const store = await new Promise((res) => chrome.storage.local.get(['installId'], res));
        let installId = store && store.installId;
        if (!installId) { installId = 'inst_' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36); chrome.storage.local.set({ installId: installId }); }
        const r = await fetch(CREEM_VALIDATE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: key, instanceId: installId }) });
        const d = await r.json().catch(() => ({}));
        if (d && d.valid) {
          realPaid = true;
          const instId = d.instanceId || installId;
          chrome.storage.local.set({ proPaidCache: true, licenseKey: key, licenseInstanceId: instId, lastValidated: Date.now() });
          setUninstallDeactivate(key, instId);
          proIsPaid = true;
          updateProUI(); renderProfilesList(); hidePaywall();
          showNotification('Pro unlocked — thank you!', 'success');
        } else {
          showNotification('That license key is not active', 'error');
        }
      } catch (e) {
        showNotification('Could not reach the license server', 'error');
      } finally {
        if (_btn) { _btn.disabled = false; _btn.textContent = _btnLabel || 'Activate'; }
      }
    }
    // setUninstallDeactivate is hoisted to top level (above).
    async function releaseLicense() {
      const store = await new Promise((res) => chrome.storage.local.get(['licenseKey', 'licenseInstanceId'], res));
      const key = store && store.licenseKey, instanceId = store && store.licenseInstanceId;
      // Free the Creem slot when we have the instance id (activations from older builds may lack it).
      if (key && instanceId) {
        try {
          await fetch(CREEM_VALIDATE_URL.replace('/validate', '/deactivate'), {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: key, instanceId: instanceId })
          });
        } catch (e) {}
      }
      // Always drop Pro locally so the user is genuinely back to Free and can upgrade again.
      realPaid = false; proIsPaid = false;
      chrome.storage.local.remove(['proPaidCache', 'licenseKey', 'licenseInstanceId']);
      setUninstallDeactivate('', '');
      updateProUI(); renderProfilesList();
      showNotification(instanceId ? 'License released from this device' : 'Pro removed from this device', 'success');
    }
    function hidePaywall() { const o = document.getElementById('paywallOverlay'); if (o) o.style.display = 'none'; }
    // updateProUI is hoisted to top level (above).
    function selectPlan(plan) {
      selectedPlan = plan;
      const m = document.getElementById('planMonthly'), l = document.getElementById('planYearly'), btn = document.getElementById('paywallUpgrade');
      if (m && l) {
        m.style.background = plan === 'monthly' ? 'var(--surface-2)' : 'transparent';
        m.style.border = plan === 'monthly' ? '1px solid var(--accent)' : '1px solid transparent';
        l.style.background = plan === 'yearly' ? 'var(--surface-2)' : 'transparent';
        l.style.border = plan === 'yearly' ? '1px solid var(--accent)' : '1px solid transparent';
      }
      if (btn) btn.textContent = plan === 'monthly' ? 'Upgrade — $5/month' : 'Upgrade — $30/year';
    }
    const _pm = document.getElementById('planMonthly'); if (_pm) _pm.addEventListener('click', () => selectPlan('monthly'));
    const _pl = document.getElementById('planYearly'); if (_pl) _pl.addEventListener('click', () => selectPlan('yearly'));
    const _pc = document.getElementById('paywallClose'); if (_pc) _pc.addEventListener('click', hidePaywall);
    const _plater = document.getElementById('paywallLater'); if (_plater) _plater.addEventListener('click', hidePaywall);
    const _pu = document.getElementById('paywallUpgrade'); if (_pu) _pu.addEventListener('click', () => {
      const url = selectedPlan === 'yearly' ? CREEM_CHECKOUT_YEARLY : CREEM_CHECKOUT_MONTHLY;
      chrome.tabs.create({ url: url });
      const lb = document.getElementById('licenseBox'); if (lb) lb.style.display = 'block'; // they'll paste the key after paying
    });
    const _pr = document.getElementById('paywallRestore'); if (_pr) _pr.addEventListener('click', () => {
      const lb = document.getElementById('licenseBox'); if (lb) lb.style.display = lb.style.display === 'block' ? 'none' : 'block';
    });
    const _la = document.getElementById('licenseActivate'); if (_la) _la.addEventListener('click', () => {
      const inp = document.getElementById('licenseInput'); redeemLicense(inp ? inp.value : '');
    });
    // Rename via the pencil; tap the shield icon to force a fresh re-check
    const renameBtnEl = document.getElementById('renameBtn');
    if (renameBtnEl) renameBtnEl.addEventListener('click', () => {
      const ap = getActiveProfile();
      if (!ap) return;
      const n = prompt('Rename profile', ap.name);
      if (n && n.trim()) renameProfile(ap.id, n.trim());
    });
    const homeIconEl = document.getElementById('homeIcon');
    if (homeIconEl) homeIconEl.addEventListener('click', () => updateHome(true));

    // Filtering and sorting
    statusFilter.addEventListener('change', filterProxies);
    searchFilter.addEventListener('input', filterProxies);
    sortBtn.addEventListener('click', sortProxies);

    // Dark mode
    darkModeToggle.addEventListener('click', toggleDarkMode);

    // Settings
    saveRotationSettings.addEventListener('click', saveRotationSettingsHandler);

    // Security
    saveSecuritySettings.addEventListener('click', saveSecuritySettingsHandler);

    // User-Agent templates
    userAgentTemplate.addEventListener('change', () => {
      if (userAgentTemplate.value && userAgentTemplates[userAgentTemplate.value]) {
        customUserAgent.value = userAgentTemplates[userAgentTemplate.value];
      }
    });

    applyUserAgent.addEventListener('click', () => {
      if (customUserAgent.value) {
        chrome.runtime.sendMessage({
          action: 'setCustomUserAgent',
          userAgent: customUserAgent.value
        }, (response) => {
          if (chrome.runtime.lastError) {
            showNotification(`Failed to set User-Agent: ${chrome.runtime.lastError.message}`, 'error');
            return;
          }

          if (response && response.success) {
            showNotification('User-Agent applied successfully', 'success');
          } else {
            const errorMsg = response ? response.error : 'Unknown error';
            showNotification(`Failed to set User-Agent: ${errorMsg}`, 'error');
          }
        });
      } else {
        showNotification('Please enter a User-Agent', 'error');
      }
    });

    // Spoofing
    webglInfoMode.addEventListener('change', () => {
      if (webglInfoMode.value === 'manual') {
        webglVendorContainer.style.display = 'flex';
        webglRendererContainer.style.display = 'flex';
      } else {
        webglVendorContainer.style.display = 'none';
        webglRendererContainer.style.display = 'none';
      }
    });

    timezoneMode.addEventListener('change', () => {
      timezoneContainer.style.display = timezoneMode.value === 'manual' ? 'flex' : 'none';
    });

    languageMode.addEventListener('change', () => {
      languageContainer.style.display = languageMode.value === 'manual' ? 'flex' : 'none';
    });

    geolocationMode.addEventListener('change', () => {
      geolocationContainer.style.display = geolocationMode.value === 'manual' ? 'flex' : 'none';
    });

    cpuMode.addEventListener('change', () => {
      cpuContainer.style.display = cpuMode.value === 'manual' ? 'flex' : 'none';
    });

    memoryMode.addEventListener('change', () => {
      memoryContainer.style.display = memoryMode.value === 'manual' ? 'flex' : 'none';
    });

    macAddressMode.addEventListener('change', () => {
      macAddressContainer.style.display = macAddressMode.checked ? 'flex' : 'none';
    });

    deviceNameMode.addEventListener('change', () => {
      deviceNameContainer.style.display = deviceNameMode.checked ? 'flex' : 'none';
    });

    fontsMode.addEventListener('change', () => {
      fontsContainer.style.display = fontsMode.value === 'manual' ? 'flex' : 'none';
    });

    screenMode.addEventListener('change', () => {
      screenContainer.style.display = screenMode.value === 'manual' ? 'flex' : 'none';
    });

    saveSpoofingSettings.addEventListener('click', saveSpoofingSettingsHandler);

    // Stats
    refreshStats.addEventListener('click', updateStats);
    resetStats.addEventListener('click', resetStatsHandler);
  }

  function loadProxies() {
    chrome.storage.local.get(['proxies', 'activeProxy'], (data) => {
      if (data.proxies) {
        proxies = data.proxies;
        proxyInput.value = proxies.map(p => p.full).join('\n');
        renderProxyList();
      }
      if (data.activeProxy) {
        activeProxy = data.activeProxy;
        statusMsg.textContent = `Active: ${activeProxy}`;
      }
    });
  }

  function loadSettings() {
    chrome.storage.local.get(['rotationSettings', 'darkMode'], (data) => {
      if (data.rotationSettings) {
        enableRotation.checked = data.rotationSettings.enabled;
        rotationInterval.value = data.rotationSettings.interval;
        rotationStrategy.value = data.rotationSettings.strategy;

        if (data.rotationSettings.enabled) {
          startRotationTimer();
        }
      }

      if (data.darkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
      }
    });
  }

  function loadSecuritySettings() {
    chrome.storage.local.get(['securitySettings'], (data) => {
      if (data.securitySettings) {
        securitySettings = data.securitySettings;
        webrtcProtection.checked = securitySettings.webrtcProtection;
        killSwitch.checked = securitySettings.killSwitch;

        // Check if DNS routing is supported and not in Brave Browser
        const isBrave = navigator.brave && navigator.brave.isBrave;

        if (!isBrave && chrome.privacy && 
            chrome.privacy.network && 
            chrome.privacy.network.dnsOverHttpsMode) {
          dnsRouting.checked = securitySettings.dnsRouting;
          dnsRouting.disabled = false;
        } else {
          dnsRouting.checked = false;
          dnsRouting.disabled = true;
          // Add a tooltip or note explaining why it's disabled
          if (isBrave) {
            dnsRouting.title = "DNS routing is not supported in Brave Browser";
          } else {
            dnsRouting.title = "DNS routing is not supported in your Chrome version";
          }
        }

        blockWebSockets.checked = securitySettings.blockWebSockets;
        fingerprintProtection.checked = securitySettings.fingerprintProtection;
        userAgentRotation.checked = securitySettings.userAgentRotation;
        blockTracking.checked = securitySettings.blockTracking;
        clearCookies.checked = securitySettings.clearCookies;
      }
    });
  }

  function loadSpoofingSettings() {
    chrome.storage.local.get(['spoofingSettings'], (data) => {
      if (data.spoofingSettings) {
        spoofingSettings = data.spoofingSettings;

        // Set values
        webrtcMode.value = spoofingSettings.webrtcMode;
        canvasMode.value = spoofingSettings.canvasMode;
        webglMode.value = spoofingSettings.webglMode;
        webglInfoMode.value = spoofingSettings.webglInfoMode;
        webglVendor.value = spoofingSettings.webglVendor;
        webglRenderer.value = spoofingSettings.webglRenderer;
        webgpuMode.checked = spoofingSettings.webgpuMode;
        clientRectsMode.value = spoofingSettings.clientRectsMode;
        timezoneMode.value = spoofingSettings.timezoneMode;
        timezone.value = spoofingSettings.timezone;
        languageMode.value = spoofingSettings.languageMode;
        language.value = spoofingSettings.language;
        geolocationMode.value = spoofingSettings.geolocationMode;
        geolocation.value = spoofingSettings.geolocation;
        cpuMode.value = spoofingSettings.cpuMode;
        cpuCores.value = spoofingSettings.cpuCores;
        memoryMode.value = spoofingSettings.memoryMode;
        memoryGB.value = spoofingSettings.memoryGB;
        macAddressMode.checked = spoofingSettings.macAddressMode;
        macAddress.value = spoofingSettings.macAddress;
        deviceNameMode.checked = spoofingSettings.deviceNameMode;
        deviceName.value = spoofingSettings.deviceName;
        fontsMode.value = spoofingSettings.fontsMode;
        fonts.value = spoofingSettings.fonts;
        audioMode.value = spoofingSettings.audioMode;
        screenMode.value = spoofingSettings.screenMode;
        screenResolution.value = spoofingSettings.screenResolution;
        mediaDevicesMode.value = spoofingSettings.mediaDevicesMode;
        doNotTrack.checked = spoofingSettings.doNotTrack;
        customUserAgent.value = spoofingSettings.userAgent || '';

        // Show/hide containers based on settings
        webglVendorContainer.style.display = webglInfoMode.value === 'manual' ? 'flex' : 'none';
        webglRendererContainer.style.display = webglInfoMode.value === 'manual' ? 'flex' : 'none';
        timezoneContainer.style.display = timezoneMode.value === 'manual' ? 'flex' : 'none';
        languageContainer.style.display = languageMode.value === 'manual' ? 'flex' : 'none';
        geolocationContainer.style.display = geolocationMode.value === 'manual' ? 'flex' : 'none';
        cpuContainer.style.display = cpuMode.value === 'manual' ? 'flex' : 'none';
        memoryContainer.style.display = memoryMode.value === 'manual' ? 'flex' : 'none';
        macAddressContainer.style.display = macAddressMode.checked ? 'flex' : 'none';
        deviceNameContainer.style.display = deviceNameMode.checked ? 'flex' : 'none';
        fontsContainer.style.display = fontsMode.value === 'manual' ? 'flex' : 'none';
        screenContainer.style.display = screenMode.value === 'manual' ? 'flex' : 'none';
      }
    });
  }

  function loadStats() {
    chrome.storage.local.get(['stats'], (data) => {
      if (data.stats) {
        updateStatsDisplay(data.stats);
      }
    });
  }

  function saveProxies() {
    chrome.storage.local.set({ proxies }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving proxies:', chrome.runtime.lastError);
        showNotification('Failed to save proxies', 'error');
      }
    });
  }

  function addProxies() {
    const rawLines = proxyInput.value.split('\n').map(l => l.trim()).filter(l => l);
    const newProxies = parseProxies(proxyInput.value);
    const skipped = rawLines.length - newProxies.length;

    if (newProxies.length === 0) {
      showNotification(
        skipped > 0 ? `No valid proxies — ${skipped} line(s) couldn't be parsed` : 'No valid proxies found',
        'error'
      );
      return;
    }

    // Merge with existing proxies (avoid duplicates)
    const existingFull = proxies.map(p => p.full);
    const uniqueNew = newProxies.filter(p => !existingFull.includes(p.full));

    proxies = [...proxies, ...uniqueNew];
    saveProxies();
    renderProxyList();

    let msg = `Added ${uniqueNew.length} new ${uniqueNew.length === 1 ? 'proxy' : 'proxies'}`;
    if (skipped > 0) msg += `, skipped ${skipped} invalid`;
    showNotification(msg, 'success');
  }

  function testAllProxies() {
    if (proxies.length === 0) {
      showNotification('No proxies to test', 'error');
      return;
    }

    statusMsg.textContent = 'Testing proxies...';

    chrome.runtime.sendMessage({ action: 'testProxies', proxies }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error testing proxies:', chrome.runtime.lastError);
        showNotification('Failed to test proxies', 'error');
        return;
      }

      statusMsg.textContent = `Tested ${response.total} proxies. Working: ${response.working}`;
      updateStats();
    });
  }

  function testSingleProxy(index) {
    const proxy = proxies[index];
    if (!proxy) return;

    // Update UI to show testing
    const statusEl = document.getElementById(`status-${index}`);
    if (statusEl) {
      statusEl.textContent = 'Testing';
      statusEl.className = 'status testing';
    }

    chrome.runtime.sendMessage({ action: 'testSingleProxy', proxy, index }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error testing proxy:', chrome.runtime.lastError);
        showNotification('Failed to test proxy', 'error');
        return;
      }

      if (response.success) {
        showNotification(`Proxy test successful: ${response.speed}ms`, 'success');
      } else {
        showNotification(`Proxy test failed: ${response.error}`, 'error');
      }
    });
  }

  function exportProxies() {
    if (proxies.length === 0) {
      showNotification('No proxies to export', 'error');
      return;
    }

    const dataStr = JSON.stringify(proxies, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `proxies_${new Date().toISOString().slice(0,10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    showNotification('Proxies exported successfully', 'success');
  }

  function importProxies() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = e => {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = event => {
        try {
          const importedProxies = JSON.parse(event.target.result);
          if (Array.isArray(importedProxies)) {
            proxies = importedProxies;
            proxyInput.value = proxies.map(p => p.full).join('\n');
            saveProxies();
            renderProxyList();
            showNotification(`Imported ${proxies.length} proxies`, 'success');
          } else {
            showNotification('Invalid file format', 'error');
          }
        } catch (error) {
          showNotification('Error importing proxies', 'error');
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  function clearAllProxies() {
    if (confirm('Are you sure you want to clear all proxies?')) {
      proxies = [];
      proxyInput.value = '';
      saveProxies();
      renderProxyList();
      showNotification('All proxies cleared', 'info');
    }
  }

  function deactivateProxy() {
    activationGen++;                       // supersede the in-flight verify probe from the activation we're undoing
    chrome.storage.local.remove(['diagCache', 'homeProbe']); // proxy state changed -> Diagnostics + Home must re-measure, never a stale "protected" exit
    chrome.runtime.sendMessage({ action: 'deactivateProxy' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error deactivating proxy:', chrome.runtime.lastError);
        showNotification('Failed to deactivate proxy', 'error');
        return;
      }

      if (response && response.success) {
        statusMsg.textContent = 'Proxy deactivated';
        activeProxy = null;
        chrome.storage.local.remove('activeProxy');
        renderProxyList();
        showNotification('Proxy deactivated', 'info');
      } else {
        showNotification('Failed to deactivate proxy', 'error');
      }
    });
  }

  function deleteCookies() {
    chrome.runtime.sendMessage({ action: 'deleteCookies' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error deleting cookies:', chrome.runtime.lastError);
        showNotification(`Failed to delete cookies: ${chrome.runtime.lastError.message}`, 'error');
        return;
      }

      if (response && response.success) {
        showNotification(`Deleted ${response.count} cookies`, 'success');
      } else {
        const errorMsg = response ? response.error : 'Unknown error';
        showNotification(`Failed to delete cookies: ${errorMsg}`, 'error');
      }
    });
  }

  function deleteHistory() {
    chrome.runtime.sendMessage({ action: 'deleteHistory' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error deleting history:', chrome.runtime.lastError);
        showNotification(`Failed to delete history: ${chrome.runtime.lastError.message}`, 'error');
        return;
      }

      if (response && response.success) {
        showNotification('Browsing history and data deleted', 'success');
      } else {
        const errorMsg = response ? response.error : 'Unknown error';
        showNotification(`Failed to delete history: ${errorMsg}`, 'error');
      }
    });
  }

  function activateProxy(proxy) {
    activationGen++;                       // supersede any in-flight verify probe from a prior state
    if (proxy && (proxy.scheme || '').toLowerCase() === 'socks4') {
      showNotification('SOCKS4 has no remote DNS — DNS can leak. Use a SOCKS5 or HTTP proxy for proxy-side DNS.', 'error');
    }
    const _sc = document.getElementById('activeStatus');
    if (_sc) _sc.textContent = 'Connecting…';   // instant feedback; proxy applies in <1s, verify follows
    const _dw = document.getElementById('goDirectWrap');
    if (_dw) _dw.style.display = 'block';   // reveal "Turn off" immediately so you can bail during the verify
    // Clear cookies if enabled
    if (securitySettings.clearCookies) {
      chrome.cookies.getAll({}, (cookies) => {
        cookies.forEach(cookie => {
          const url = `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`;
          chrome.cookies.remove({ url, name: cookie.name });
        });
      });
    }

    chrome.runtime.sendMessage({ action: 'activateProxy', proxy }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Activation error:', chrome.runtime.lastError);
        showNotification(`Activation failed: ${chrome.runtime.lastError.message}`, 'error');
        return;
      }

      if (response && response.success) {
        activeProxy = proxy.full;
        statusMsg.textContent = `Activated: ${proxy.full}`;
        chrome.storage.local.set({ activeProxy: proxy.full });
        renderProxyList();
        showNotification('Proxy activated successfully', 'success');

        // Update rotation count
        chrome.storage.local.get(['stats'], (data) => {
          const stats = data.stats || { rotations: 0 };
          stats.rotations = (stats.rotations || 0) + 1;
          chrome.storage.local.set({ stats });
          updateStatsDisplay(stats);
        });
      } else {
        const errorMsg = response ? response.error : 'Unknown error';
        if (response && response.needsUserScripts) {
          statusMsg.textContent = 'Protection off — enable “Allow user scripts” to activate.';
          showNotification(errorMsg, 'error');
        } else {
          showNotification(`Activation failed: ${errorMsg}`, 'error');
        }
      }
    });
  }

  function filterProxies() {
    const statusValue = statusFilter.value;
    const searchValue = searchFilter.value.toLowerCase();

    const filtered = proxies.filter(proxy => {
      const matchesStatus = statusValue === 'all' || 
                           (statusValue === 'working' && proxy.status === 'Working') || 
                           (statusValue === 'dead' && proxy.status === 'Dead');

      const matchesSearch = proxy.full.toLowerCase().includes(searchValue);

      return matchesStatus && matchesSearch;
    });

    renderProxyList(filtered);
  }

  function sortProxies() {
    sortAscending = !sortAscending;

    proxies.sort((a, b) => {
      const speedA = a.speed || 999999;
      const speedB = b.speed || 999999;

      return sortAscending ? speedA - speedB : speedB - speedA;
    });

    renderProxyList();
    sortBtn.textContent = `Sort by Speed ${sortAscending ? '↑' : '↓'}`;
  }

  function renderProxyList(proxiesToRender = proxies) {
    proxyList.innerHTML = '';
    const showPassword = showPasswords.checked;

    proxiesToRender.forEach((proxy, index) => {
      const originalIndex = proxies.indexOf(proxy);
      const item = document.createElement('div');
      item.className = 'proxy-item';
      if (activeProxy === proxy.full) {
        item.classList.add('active-proxy');
      }

      // Format proxy address based on password visibility
      let displayAddress = proxy.full;
      if (!showPassword) {
        const parts = proxy.full.split(':');
        if (parts.length >= 4) {
          displayAddress = `${parts[0]}:${parts[1]}:${parts[2]}:*****`;
        }
      }

      const header = document.createElement('div');
      header.className = 'proxy-header';

      const address = document.createElement('div');
      address.className = 'proxy-address';
      address.textContent = displayAddress;

      header.appendChild(address);

      const meta = document.createElement('div');
      meta.className = 'proxy-meta';
      meta.innerHTML = `
        <span class="status ${proxy.status ? proxy.status.toLowerCase() : ''}" id="status-${originalIndex}">${proxy.status || 'Not tested'}</span>
        ${proxy.speed ? `<span>${proxy.speed} ms</span>` : ''}
        ${proxy.country && proxy.country !== 'Unknown' ? `<span>${proxy.country}</span>` : ''}
        ${proxy.city && proxy.city !== 'Unknown' ? `<span>${proxy.city}</span>` : ''}
      `;

      const actions = document.createElement('div');
      actions.className = 'actions';

      const testBtn = document.createElement('button');
      testBtn.className = 'btn-secondary';
      testBtn.textContent = 'Test';
      testBtn.addEventListener('click', () => testSingleProxy(originalIndex));

      const identityBtn = document.createElement('button');
      identityBtn.className = 'btn-primary';
      identityBtn.textContent = '+ Identity';
      identityBtn.addEventListener('click', () => createProfileFromProxy(proxy));

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-danger';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => removeProxy(originalIndex));

      actions.appendChild(testBtn);
      actions.appendChild(identityBtn);
      actions.appendChild(removeBtn);

      item.appendChild(header);
      item.appendChild(meta);
      item.appendChild(actions);
      proxyList.appendChild(item);
    });
  }

  function removeProxy(index) {
    proxies.splice(index, 1);
    saveProxies();
    renderProxyList();
    showNotification('Proxy removed', 'info');
  }

  function toggleDarkMode() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    darkModeToggle.textContent = isLight ? '🌙' : '☀️';
    const themeVal = document.getElementById('themeVal'); if (themeVal) themeVal.textContent = isLight ? 'Light' : 'Dark';
    chrome.storage.local.set({ lightMode: isLight });
  }

  function applyDarkMode() {
    chrome.storage.local.get(['lightMode'], (data) => {
      if (data.lightMode) {
        document.body.classList.add('light-mode');
        darkModeToggle.textContent = '🌙';
      } else {
        darkModeToggle.textContent = '☀️';
      }
    });
  }

  function saveRotationSettingsHandler() {
    const settings = {
      enabled: enableRotation.checked,
      interval: parseInt(rotationInterval.value),
      strategy: rotationStrategy.value
    };

    chrome.storage.local.set({ rotationSettings: settings }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving rotation settings:', chrome.runtime.lastError);
        showNotification('Failed to save rotation settings', 'error');
        return;
      }

      if (settings.enabled) {
        startRotationTimer();
      } else {
        stopRotationTimer();
      }
      showNotification('Rotation settings saved', 'success');
    });
  }

  function saveSecuritySettingsHandler() {
    securitySettings = {
      webrtcProtection: webrtcProtection.checked,
      killSwitch: killSwitch.checked,
      dnsRouting: dnsRouting.checked,
      blockWebSockets: blockWebSockets.checked,
      fingerprintProtection: fingerprintProtection.checked,
      userAgentRotation: userAgentRotation.checked,
      blockTracking: blockTracking.checked,
      clearCookies: clearCookies.checked
    };

    // Advanced mode: persist these edits into the active profile.
    const apSec = getActiveProfile();
    if (apSec) { apSec.security = JSON.parse(JSON.stringify(securitySettings)); saveProfiles(); }

    // Save to storage first
    chrome.storage.local.set({ securitySettings }, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        showNotification(`Failed to save settings: ${chrome.runtime.lastError.message}`, 'error');
        return;
      }

      // Then send message to background script
      chrome.runtime.sendMessage({ action: 'updateSecuritySettings', settings: securitySettings }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Security settings error:', chrome.runtime.lastError);
          showNotification(`Failed to apply settings: ${chrome.runtime.lastError.message}`, 'error');
          return;
        }

        if (response && response.success) {
          showNotification('Security settings saved', 'success');
        } else {
          const errorMsg = response ? response.error : 'Unknown error';
          showNotification(`Failed to apply settings: ${errorMsg}`, 'error');
        }
      });
    });
  }

  function saveSpoofingSettingsHandler() {
    spoofingSettings = {
      webrtcMode: webrtcMode.value,
      canvasMode: canvasMode.value,
      webglMode: webglMode.value,
      webglInfoMode: webglInfoMode.value,
      webglVendor: webglVendor.value,
      webglRenderer: webglRenderer.value,
      webgpuMode: webgpuMode.checked,
      clientRectsMode: clientRectsMode.value,
      timezoneMode: timezoneMode.value,
      timezone: timezone.value,
      languageMode: languageMode.value,
      language: language.value,
      geolocationMode: geolocationMode.value,
      geolocation: geolocation.value,
      cpuMode: cpuMode.value,
      cpuCores: cpuCores.value,
      memoryMode: memoryMode.value,
      memoryGB: memoryGB.value,
      macAddressMode: macAddressMode.checked,
      macAddress: macAddress.value,
      deviceNameMode: deviceNameMode.checked,
      deviceName: deviceName.value,
      fontsMode: fontsMode.value,
      fonts: fonts.value,
      audioMode: audioMode.value,
      screenMode: screenMode.value,
      screenResolution: screenResolution.value,
      mediaDevicesMode: mediaDevicesMode.value,
      doNotTrack: doNotTrack.checked,
      userAgent: customUserAgent.value,
      fpSeed: spoofingSettings.fpSeed || ''
    };

    // Advanced mode: persist these edits into the active profile.
    const apSpoof = getActiveProfile();
    if (apSpoof) { apSpoof.spoof = JSON.parse(JSON.stringify(spoofingSettings)); saveProfiles(); }

    // Save to storage first
    chrome.storage.local.set({ spoofingSettings }, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        showNotification(`Failed to save settings: ${chrome.runtime.lastError.message}`, 'error');
        return;
      }

      // Then send message to background script
      chrome.runtime.sendMessage({ action: 'updateSpoofingSettings', settings: spoofingSettings }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Spoofing settings error:', chrome.runtime.lastError);
          showNotification(`Failed to apply settings: ${chrome.runtime.lastError.message}`, 'error');
          return;
        }

        if (response && response.success) {
          showNotification('Spoofing settings saved', 'success');
        } else {
          const errorMsg = response ? response.error : 'Unknown error';
          showNotification(`Failed to apply settings: ${errorMsg}`, 'error');
        }
      });
    });
  }

  function startRotationTimer() {
    stopRotationTimer();
    const interval = parseInt(rotationInterval.value) * 60000; // Convert to milliseconds

    rotationTimer = setInterval(() => {
      rotateProxy();
    }, interval);
  }

  function stopRotationTimer() {
    if (rotationTimer) {
      clearInterval(rotationTimer);
      rotationTimer = null;
    }
  }

  function rotateProxy() {
    const workingProxies = proxies.filter(p => p.status === 'Working');
    if (workingProxies.length === 0) {
      showNotification('No working proxies available for rotation', 'error');
      return;
    }

    const strategy = rotationStrategy.value;
    let selectedProxy;

    switch (strategy) {
      case 'random':
        selectedProxy = workingProxies[Math.floor(Math.random() * workingProxies.length)];
        break;
      case 'fastest':
        selectedProxy = workingProxies.reduce((fastest, current) => 
          (current.speed || 999999) < (fastest.speed || 999999) ? current : fastest
        );
        break;
      case 'roundrobin':
        const currentIndex = workingProxies.findIndex(p => p.full === activeProxy);
        const nextIndex = (currentIndex + 1) % workingProxies.length;
        selectedProxy = workingProxies[nextIndex];
        break;
    }

    if (selectedProxy) {
      activateProxy(selectedProxy);
    }
  }

  function updateStats() {
    chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting stats:', chrome.runtime.lastError);
        return;
      }
      updateStatsDisplay(response);
    });
  }

  function updateStatsDisplay(stats) {
    totalProxies.textContent = proxies.length;
    workingProxies.textContent = proxies.filter(p => p.status === 'Working').length;

    const speeds = proxies.filter(p => p.speed).map(p => p.speed);
    const avg = speeds.length > 0 
      ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) 
      : 0;
    avgSpeed.textContent = `${avg}ms`;

    rotationsCount.textContent = stats.rotations || 0;
  }

  function resetStatsHandler() {
    if (confirm('Are you sure you want to reset all statistics?')) {
      chrome.storage.local.set({ stats: { rotations: 0 } }, () => {
        updateStatsDisplay({ rotations: 0 });
        showNotification('Statistics reset', 'info');
      });
    }
  }

  function showNotification(message, type = 'info') {
    // single-slot: clear any existing toast so two never stack (e.g. "Checking…" + result)
    document.querySelectorAll('.notification').forEach(n => n.remove());
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  function parseProxies(input) {
    return input.split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(parseProxyLine)
      .filter(proxy => proxy !== null);
  }

  // Accepts: host:port · host:port:user:pass · user:pass@host:port ·
  // and any of those with a scheme prefix (http://, https://, socks4://, socks5://).
  function parseProxyLine(line) {
    let scheme = 'http';
    const schemeMatch = line.match(/^(https?|socks[45]):\/\//i);
    if (schemeMatch) {
      scheme = schemeMatch[1].toLowerCase();
      line = line.slice(schemeMatch[0].length);
    }

    let host, port, username = '', password = '';

    if (line.includes('@')) {
      const [creds, server] = line.split('@');
      const credParts = creds.split(':');
      const serverParts = server.split(':');
      username = credParts[0] || '';
      password = credParts[1] || '';
      host = serverParts[0];
      port = parseInt(serverParts[1]);
    } else {
      const parts = line.split(':');
      host = parts[0];
      port = parseInt(parts[1]);
      if (parts.length >= 4) {
        username = parts[2];
        password = parts[3];
      }
    }

    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
      return null;
    }

    const full = username
      ? `${host}:${port}:${username}:${password}`
      : `${host}:${port}`;

    return {
      host, port, username, password, scheme, full,
      status: null, speed: null, country: null, city: null
    };
  }

  // Listen for proxy test results
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'proxyTestResult') {
      const { index, status, speed, country, city } = message;
      if (proxies[index]) {
        proxies[index].status = status;
        proxies[index].speed = speed;
        proxies[index].country = country;
        proxies[index].city = city;
        saveProxies();
        renderProxyList();
        // Auto-correct any profile using this proxy: fill its country + match the
        // fingerprint's timezone/language to it, then re-apply if it's active.
        if (country && country !== 'Unknown') {
          let changed = false;
          profiles.forEach((p) => {
            if (p.proxyFull === proxies[index].full) {
              if (p.country !== country) { p.country = country; changed = true; }
              if (p.proxy && p.proxy.country !== country) { p.proxy.country = country; changed = true; }
              // Re-derive tz/lang whenever they don't match this country (not only when non-manual), and
              // re-inject the live spoof if this profile is active — no heavy proxy re-activation needed.
              if (healSpoofCountry(p, country)) changed = true;
            }
          });
          if (changed) { saveProfiles(); renderProfilesList(); }
        }
      }
    }
  });
});