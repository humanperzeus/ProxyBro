// Payments: Creem license keys, validated by an external Cloudflare Worker (which holds
// the secret API key). No payment SDK runs in the service worker.

// Diagnostic logging — silent in production (flip to true to trace in the SW console).
const DEBUG = false;
const dlog = function() { if (DEBUG) console.log.apply(console, arguments); };

let activeProxy = null;
let testingProxy = null; // proxy under test, so the shared auth handler can authenticate it
let rotationSettings = {
  enabled: false,
  interval: 30,
  strategy: 'random'
};
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
  doNotTrack: false,
  enabled: false,
  userAgent: ''
};
let proxyState = {
  connected: false,
  lastChecked: null
};
let userAgentIndex = 0;
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
];

// --- declarativeNetRequest (MV3) infrastructure ---
// MV3 forbids blocking webRequest. All request blocking and header rewriting
// below is done with dynamic declarativeNetRequest rules instead. webRequest is
// kept ONLY for onAuthRequired (proxy authentication), which is still allowed.
const ALL_RESOURCE_TYPES = [
  'main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font',
  'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other'
];

const DNR_RULES = {
  KILL_SWITCH: 1,
  BLOCK_WEBSOCKET: 2,
  SET_USER_AGENT: 3,
  BLOCK_TRACKING: 4
};

const TRACKING_DOMAINS = [
  'google-analytics.com', 'doubleclick.net', 'facebook.net', 'googletagmanager.com',
  'googlesyndication.com', 'hotjar.com', 'mixpanel.com', 'amplitude.com',
  'fullstory.com', 'mouseflow.com', 'inspectlet.com'
];

// Add or remove a single dynamic DNR rule (pass null to remove only).
async function setDnrRule(id, rule) {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [id],
      addRules: rule ? [rule] : []
    });
  } catch (e) {
    console.error('DNR update error for rule', id, e);
  }
}

function setKillSwitchRule(enable) {
  return setDnrRule(DNR_RULES.KILL_SWITCH, enable ? {
    id: DNR_RULES.KILL_SWITCH,
    priority: 1000,
    action: { type: 'block' },
    condition: { urlFilter: '*', resourceTypes: ALL_RESOURCE_TYPES }
  } : null);
}

function setWebSocketRule(enable) {
  return setDnrRule(DNR_RULES.BLOCK_WEBSOCKET, enable ? {
    id: DNR_RULES.BLOCK_WEBSOCKET,
    priority: 1,
    action: { type: 'block' },
    condition: { urlFilter: '*', resourceTypes: ['websocket'] }
  } : null);
}

function setTrackingRule(enable) {
  return setDnrRule(DNR_RULES.BLOCK_TRACKING, enable ? {
    id: DNR_RULES.BLOCK_TRACKING,
    priority: 1,
    action: { type: 'block' },
    condition: { requestDomains: TRACKING_DOMAINS, resourceTypes: ALL_RESOURCE_TYPES }
  } : null);
}

function setUserAgentRule(userAgent) {
  return setDnrRule(DNR_RULES.SET_USER_AGENT, userAgent ? {
    id: DNR_RULES.SET_USER_AGENT,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [{ header: 'user-agent', operation: 'set', value: userAgent }]
    },
    condition: { urlFilter: '*', resourceTypes: ALL_RESOURCE_TYPES }
  } : null);
}

// Canvas fingerprint blocking is script injection (allowed in MV3), not webRequest.
function canvasFingerprintingListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    func: blockCanvasFingerprinting
  });
}

// Define named listener functions for spoofing settings
function disableCanvasListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    func: disableCanvas
  });
}

function addCanvasNoiseListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    func: addCanvasNoise
  });
}

function disableWebGLListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    func: disableWebGL
  });
}

function addWebGLNoiseListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    func: addWebGLNoise
  });
}

function spoofWebGLInfoListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    args: [spoofingSettings.webglVendor, spoofingSettings.webglRenderer],
    func: spoofWebGLInfo
  });
}

function disableWebGPUListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    func: disableWebGPU
  });
}

function addClientRectsNoiseListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    func: addClientRectsNoise
  });
}

function spoofTimezoneListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    args: [spoofingSettings.timezone],
    func: spoofTimezone
  });
}

function spoofLanguageListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    args: [spoofingSettings.language],
    func: spoofLanguage
  });
}

function spoofGeolocationListener(details) {
  const coords = spoofingSettings.geolocation.split(',');
  if (coords.length === 2) {
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      args: [parseFloat(coords[0]), parseFloat(coords[1])],
      func: spoofGeolocation
    });
  }
}

function spoofHardwareListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    args: [parseInt(spoofingSettings.cpuCores)],
    func: spoofHardware
  });
}

function spoofMemoryListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    args: [parseInt(spoofingSettings.memoryGB)],
    func: spoofMemory
  });
}

function spoofMacAddressListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    args: [spoofingSettings.macAddress],
    func: spoofMacAddress
  });
}

function spoofDeviceNameListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    args: [spoofingSettings.deviceName],
    func: spoofDeviceName
  });
}

function spoofFontsListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    args: [spoofingSettings.fonts.split(',')],
    func: spoofFonts
  });
}

function spoofAudioListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    func: spoofAudio
  });
}

function spoofScreenListener(details) {
  const resolution = spoofingSettings.screenResolution.split('x');
  if (resolution.length === 2) {
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      args: [parseInt(resolution[0]), parseInt(resolution[1])],
      func: spoofScreen
    });
  }
}

function spoofMediaDevicesListener(details) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    func: spoofMediaDevices
  });
}

// Load settings on startup
chrome.runtime.onStartup.addListener(() => {
  setKillSwitchRule(false); // clear any persisted block from a previous session
  loadSettings();
  applySecuritySettings();
  applySpoofingSettings();
  startProxyStateMonitor();
});

chrome.runtime.onInstalled.addListener(() => {
  setKillSwitchRule(false);
  loadSettings();
  applySecuritySettings();
  applySpoofingSettings();
  startProxyStateMonitor();
});

// Registered at TOP LEVEL so Chrome restores it on every MV3 service-worker wake
// (listeners added inside async callbacks are lost when the worker sleeps). It gates
// on spoofingSettings.enabled internally, so it's a no-op when spoofing is off.
chrome.webNavigation.onCommitted.addListener(spoofNavListener, { url: [{ schemes: ['http', 'https'] }] });
// Hydrate spoof settings on every wake so the listener can inject without waiting for
// a full loadSettings() round-trip.
chrome.storage.local.get(['spoofingSettings'], (d) => { if (d.spoofingSettings) spoofingSettings = d.spoofingSettings; });

function loadSettings() {
  chrome.storage.local.get(['rotationSettings', 'securitySettings', 'spoofingSettings', 'activeProxyData'], (data) => {
    if (data.rotationSettings) {
      rotationSettings = data.rotationSettings;
    }
    if (data.securitySettings) {
      securitySettings = data.securitySettings;
      applySecuritySettings();
    }
    if (data.spoofingSettings) {
      spoofingSettings = data.spoofingSettings;
      applySpoofingSettings();
    }
    if (data.activeProxyData) {
      // Restore the active proxy (with credentials) so the auth handler keeps
      // working after the MV3 service worker restarts.
      activeProxy = data.activeProxyData;
      proxyState.connected = true;
    }
  });
}

function startProxyStateMonitor() {
  // MV3 service workers are ephemeral, so setInterval is unreliable. Use alarms.
  chrome.alarms.create('proxyStateMonitor', { periodInMinutes: 1 });
}

function rotateUserAgent() {
  userAgentIndex = (userAgentIndex + 1) % userAgents.length;
  setUserAgentRule(userAgents[userAgentIndex]);
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'proxyStateMonitor') {
    checkProxyState();
  } else if (alarm.name === 'uaRotation') {
    rotateUserAgent();
  }
});

function checkProxyState() {
  if (!securitySettings.killSwitch || !activeProxy) return;

  // Test if proxy is still working
  testProxyWithAuth(activeProxy).then(result => {
    const wasConnected = proxyState.connected;
    proxyState.connected = result.success;
    proxyState.lastChecked = new Date();

    // If proxy was connected but now it's not, activate kill switch
    if (wasConnected && !result.success) {
      activateKillSwitch();
    }
  }).catch(() => {
    proxyState.connected = false;
    proxyState.lastChecked = new Date();
    activateKillSwitch();
  });
}

function activateKillSwitch() {
  // Block all network requests via declarativeNetRequest (MV3)
  setKillSwitchRule(true);

  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Proxy Kill Switch Activated',
    message: 'Your proxy connection was lost. All network requests have been blocked.'
  });

  // Update proxy state
  proxyState.connected = false;

  // Also block WebRTC to prevent IP leaks
  if (chrome.privacy && chrome.privacy.network && chrome.privacy.network.webRTCIPHandlingPolicy) {
    chrome.privacy.network.webRTCIPHandlingPolicy.set({ value: 'disable_non_proxied_udp' });
  }
}

// Single source of truth for WebRTC leak protection. Protect if EITHER the active
// profile's spoof wants it (webrtcMode !== 'real') OR the security toggle is on — so
// the spoof and security paths can never clobber each other (the old bug: security
// reset the policy to 'default' and undid the spoof's protection). Surfaces
// levelOfControl, because a VPN/privacy extension can own this setting and silently
// block us — that must not be a silent failure.
function applyWebRTCPolicy() {
  try {
    const api = chrome.privacy && chrome.privacy.network && chrome.privacy.network.webRTCIPHandlingPolicy;
    if (!api || typeof api.set !== 'function') return;
    const mode = spoofingSettings.webrtcMode;
    const protect = (mode && mode !== 'real') || !!securitySettings.webrtcProtection;
    const value = protect ? 'disable_non_proxied_udp' : 'default';
    api.set({ value: value, scope: 'regular' }, () => {
      const err = chrome.runtime.lastError;
      if (err) { console.warn('[ProxyBro] WebRTC set FAILED:', err.message); return; }
      if (api.get) api.get({}, (d) => {
        const loc = d && d.levelOfControl;
        if (loc && loc.indexOf('this_extension') === -1) {
          console.warn('[ProxyBro] WebRTC NOT protected — another extension/policy controls it (levelOfControl=' + loc + '). Disable other privacy/VPN extensions.');
        } else {
          dlog('[ProxyBro] WebRTC policy=' + value + ' control=' + loc);
        }
      });
    });
  } catch (e) { console.warn('[ProxyBro] WebRTC policy error:', e && e.message); }
}

function applySecuritySettings() {
  // WebRTC Leak Protection (unified — see applyWebRTCPolicy)
  applyWebRTCPolicy();

  // DNS Routing - Check if the API is available and not in Brave Browser
  try {
    // Check if we're in Brave Browser
    const isBrave = navigator.brave && navigator.brave.isBrave;

    if (!isBrave && chrome.privacy && 
        chrome.privacy.network && 
        chrome.privacy.network.dnsOverHttpsMode && 
        typeof chrome.privacy.network.dnsOverHttpsMode.set === 'function') {
      if (securitySettings.dnsRouting) {
        chrome.privacy.network.dnsOverHttpsMode.set({ value: 'on' });
      } else {
        chrome.privacy.network.dnsOverHttpsMode.set({ value: 'off' });
      }
    } else if (securitySettings.dnsRouting) {
      // Show a notification that DNS routing is not supported
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'DNS Routing Not Supported',
        message: 'DNS routing is not supported in your browser.'
      });
    }
  } catch (e) {
    console.error('Error setting DNS mode:', e);
  }

  // Block WebSockets (declarativeNetRequest)
  setWebSocketRule(securitySettings.blockWebSockets);

  // Fingerprint Protection
  try {
    if (securitySettings.fingerprintProtection) {
      // Block canvas fingerprinting
      chrome.webNavigation.onCommitted.addListener(
        canvasFingerprintingListener,
        { url: [{ schemes: ['http', 'https'] }] }
      );
    } else {
      // Remove the canvas blocking script
      chrome.webNavigation.onCommitted.removeListener(canvasFingerprintingListener);
    }
  } catch (e) {
    console.error('Error setting fingerprint protection:', e);
  }

  // User-Agent Rotation (declarativeNetRequest + alarms)
  if (securitySettings.userAgentRotation) {
    setUserAgentRule(userAgents[userAgentIndex]);
    const uaRotateMins = Math.max(1, Math.round((rotationSettings.interval || 30) / 60));
    chrome.alarms.create('uaRotation', { periodInMinutes: uaRotateMins });
  } else {
    chrome.alarms.clear('uaRotation');
    // Only clear the UA rule if no custom User-Agent is set (they share one rule).
    if (!spoofingSettings.userAgent) {
      setUserAgentRule(null);
    }
  }

  // Block Tracking Scripts (declarativeNetRequest)
  setTrackingRule(securitySettings.blockTracking);

  // Reconcile kill switch: clear any persisted block when the feature is off.
  if (!securitySettings.killSwitch) {
    setKillSwitchRule(false);
  }
}

function applySpoofingSettings() {
  // Check if spoofing is enabled
  spoofingSettings.enabled = (
    spoofingSettings.webrtcMode !== 'real' ||
    spoofingSettings.canvasMode !== 'real' ||
    spoofingSettings.webglMode !== 'real' ||
    spoofingSettings.webglInfoMode === 'manual' ||
    spoofingSettings.clientRectsMode !== 'real' ||
    spoofingSettings.timezoneMode === 'manual' ||
    spoofingSettings.languageMode === 'manual' ||
    spoofingSettings.geolocationMode === 'manual' ||
    spoofingSettings.cpuMode === 'manual' ||
    spoofingSettings.memoryMode === 'manual' ||
    spoofingSettings.macAddressMode ||
    spoofingSettings.deviceNameMode ||
    spoofingSettings.fontsMode === 'manual' ||
    spoofingSettings.audioMode !== 'real' ||
    spoofingSettings.screenMode === 'manual' ||
    spoofingSettings.mediaDevicesMode === 'manual' ||
    spoofingSettings.doNotTrack
  );

  // WebRTC Spoofing (unified — see applyWebRTCPolicy)
  applyWebRTCPolicy();

  // Do Not Track
  try {
    if (chrome.privacy && 
        chrome.privacy.websites && 
        chrome.privacy.websites.doNotTrackEnabled && 
        typeof chrome.privacy.websites.doNotTrackEnabled.set === 'function') {
      if (spoofingSettings.doNotTrack) {
        chrome.privacy.websites.doNotTrackEnabled.set({ value: true });
      } else {
        chrome.privacy.websites.doNotTrackEnabled.set({ value: false });
      }
    }
  } catch (e) {
    console.error('Error setting Do Not Track:', e);
  }

  // Apply the page spoof in the MAIN world (so the page itself sees the overrides),
  // injected immediately on every main-frame navigation + the currently open tabs.
  try {
    if (spoofingSettings.enabled) {
      // Re-apply to already-open tabs immediately. (The navigation listener itself is
      // registered at top level so it survives MV3 service-worker restarts.)
      chrome.tabs.query({}, function (tabs) {
        for (let i = 0; i < tabs.length; i++) {
          const u = tabs[i].url || '';
          if (u.startsWith('http://') || u.startsWith('https://')) injectSpoof(tabs[i].id);
        }
      });
    }
  } catch (e) { console.error('Spoof injection error:', e); }
}

function isSpoofEnabled(s) {
  if (!s) return false;
  return (
    (s.webrtcMode && s.webrtcMode !== 'real') ||
    (s.canvasMode && s.canvasMode !== 'real') ||
    (s.webglMode && s.webglMode !== 'real') ||
    s.webglInfoMode === 'manual' ||
    (s.clientRectsMode && s.clientRectsMode !== 'real') ||
    s.timezoneMode === 'manual' ||
    s.languageMode === 'manual' ||
    s.geolocationMode === 'manual' ||
    s.cpuMode === 'manual' ||
    s.memoryMode === 'manual' ||
    s.fontsMode === 'manual' ||
    (s.audioMode && s.audioMode !== 'real') ||
    s.screenMode === 'manual' ||
    s.mediaDevicesMode === 'manual' ||
    !!s.doNotTrack ||
    !!s.userAgent
  );
}

function spoofNavListener(details) {
  if (details.frameId !== 0) return;
  injectSpoof(details.tabId);
}

// Reads spoof settings straight from storage on every navigation, so it is immune to
// the MV3 service-worker waking with un-hydrated in-memory state (the listener fires
// before any async load completes).
function injectSpoof(tabId) {
  chrome.storage.local.get(['spoofingSettings'], (d) => {
    const s = d.spoofingSettings || spoofingSettings;
    const on = isSpoofEnabled(s);
    dlog('[ProxyBro] spoof inject tab=' + tabId + ' enabled=' + on + ' ua=' + ((s && s.userAgent) ? s.userAgent.slice(0, 28) : 'none'));
    if (!on) return;
    try {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        world: 'MAIN',
        injectImmediately: true,
        func: pageSpoof,
        args: [s]
      }).then(() => {}).catch((e) => console.warn('[ProxyBro] spoof inject FAILED tab=' + tabId, e && e.message));
    } catch (e) { console.warn('[ProxyBro] spoof inject threw', e && e.message); }
  });
}

// Runs in the page's MAIN world — applies the active profile's fingerprint overrides.
// Self-contained (no chrome.* / closures) so it can be serialized into the page.
function pageSpoof(s) {
  try {
    if (!s) return;
    const def = (obj, prop, val) => { try { Object.defineProperty(obj, prop, { get: () => val, configurable: true }); } catch (e) {} };
    if (s.userAgent) {
      def(navigator, 'userAgent', s.userAgent);
      def(navigator, 'appVersion', s.userAgent.replace(/^Mozilla\//, ''));
      def(navigator, 'platform', s.userAgent.indexOf('Mac') > -1 ? 'MacIntel' : (s.userAgent.indexOf('Linux') > -1 ? 'Linux x86_64' : 'Win32'));
    }
    if (s.cpuMode === 'manual' && s.cpuCores) def(navigator, 'hardwareConcurrency', parseInt(s.cpuCores));
    if (s.memoryMode === 'manual' && s.memoryGB) def(navigator, 'deviceMemory', parseInt(s.memoryGB));
    if (s.languageMode === 'manual' && s.language) { def(navigator, 'language', s.language); def(navigator, 'languages', [s.language]); }
    if (s.doNotTrack) def(navigator, 'doNotTrack', '1');
    if (s.timezoneMode === 'manual' && s.timezone) {
      try {
        // Full, coherent timezone spoof: getTimezoneOffset + Date.toString/toTimeString
        // + Intl.DateTimeFormat (default tz AND locale) all reflect the fake zone, so
        // there is no mismatch between the clock, the offset, and resolvedOptions().
        const tz = s.timezone;
        const OrigDTF = Intl.DateTimeFormat;
        const partsIn = (d, opts) => { const f = new OrigDTF('en-US', Object.assign({ timeZone: tz }, opts)); const m = {}; f.formatToParts(d).forEach(x => m[x.type] = x.value); return m; };
        const offsetFor = (d) => { try { const m = partsIn(d, { hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +(m.hour % 24), +m.minute, +m.second); return Math.round((d.getTime() - asUTC) / 60000); } catch (e) { return 0; } };
        const tzNameFor = (d) => { try { const pp = new OrigDTF('en-US', { timeZone: tz, timeZoneName: 'long' }).formatToParts(d).find(x => x.type === 'timeZoneName'); return pp ? pp.value : tz; } catch (e) { return tz; } };
        const gmtStr = (d) => { const off = offsetFor(d), sign = off > 0 ? '-' : '+', a = Math.abs(off); return 'GMT' + sign + String(Math.floor(a / 60)).padStart(2, '0') + String(a % 60).padStart(2, '0'); };
        const pad = (h) => { h = h % 24; return h < 10 ? '0' + h : '' + h; };
        Date.prototype.getTimezoneOffset = function () { return offsetFor(this); };
        Date.prototype.toString = function () { if (isNaN(this.getTime())) return 'Invalid Date'; const p = partsIn(this, { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric', hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }); return p.weekday + ' ' + p.month + ' ' + p.day + ' ' + p.year + ' ' + pad(+p.hour) + ':' + p.minute + ':' + p.second + ' ' + gmtStr(this) + ' (' + tzNameFor(this) + ')'; };
        Date.prototype.toTimeString = function () { const p = partsIn(this, { hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }); return pad(+p.hour) + ':' + p.minute + ':' + p.second + ' ' + gmtStr(this) + ' (' + tzNameFor(this) + ')'; };
        const DTFProxy = function (l, o) { o = o || {}; if (!o.timeZone) o = Object.assign({}, o, { timeZone: tz }); if (!l && s.languageMode === 'manual' && s.language) l = s.language; return new OrigDTF(l, o); };
        DTFProxy.prototype = OrigDTF.prototype; DTFProxy.supportedLocalesOf = OrigDTF.supportedLocalesOf;
        try { DTFProxy.toString = function () { return 'function DateTimeFormat() { [native code] }'; }; } catch (e) {}
        Intl.DateTimeFormat = DTFProxy;
      } catch (e) {}
    }
    if (s.canvasMode === 'noise') {
      try {
        // Deterministic, seeded noise: consistent across reads in a session (random-
        // per-read is itself a tell), but unique vs the real device.
        const seedStr = (s.userAgent || '') + '|' + (s.timezone || '') + '|' + (s.language || '') + '|' + (s.fpSeed || '');
        let h = 2166136261; for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = (h * 16777619) >>> 0; }
        const rng = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
        const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function () {
          try {
            if (this.width > 16 && this.height > 16) {
              const ctx = this.getContext('2d');
              if (ctx) { const img = ctx.getImageData(0, 0, this.width, this.height); for (let i = 0; i < img.data.length; i += 4) { if (rng() > 0.996) img.data[i] = img.data[i] ^ 1; } ctx.putImageData(img, 0, 0); }
            }
          } catch (e) {}
          return origToDataURL.apply(this, arguments);
        };
      } catch (e) {}
    }
    if (s.webglInfoMode === 'manual' && (s.webglVendor || s.webglRenderer)) {
      try {
        const patch = (proto) => {
          if (!proto) return;
          const orig = proto.getParameter;
          proto.getParameter = function (p) {
            // 37445/37446 are UNMASKED_VENDOR/RENDERER_WEBGL (what fingerprinters read
            // via WEBGL_debug_renderer_info); 0x1F02/0x1F01 are the plain VENDOR/RENDERER.
            if (s.webglVendor && (p === 37445 || p === 0x1F02)) return s.webglVendor;
            if (s.webglRenderer && (p === 37446 || p === 0x1F01)) return s.webglRenderer;
            return orig.apply(this, arguments);
          };
        };
        if (window.WebGLRenderingContext) patch(WebGLRenderingContext.prototype);
        if (window.WebGL2RenderingContext) patch(WebGL2RenderingContext.prototype);
      } catch (e) {}
    }
    // Client Hints (navigator.userAgentData) must agree with the spoofed UA, or the
    // high-entropy platform leaks the real OS even when navigator.userAgent is faked.
    if (s.userAgent && navigator.userAgentData) {
      try {
        const mv = (s.userAgent.match(/Chrome\/(\d+)/) || [])[1] || '120';
        const fullV = (s.userAgent.match(/Chrome\/([\d.]+)/) || [])[1] || (mv + '.0.0.0');
        const plat = s.userAgent.indexOf('Win') > -1 ? 'Windows' : (s.userAgent.indexOf('Mac') > -1 ? 'macOS' : (s.userAgent.indexOf('Linux') > -1 ? 'Linux' : 'Windows'));
        const brands = [{ brand: 'Not_A Brand', version: '8' }, { brand: 'Chromium', version: mv }, { brand: 'Google Chrome', version: mv }];
        const high = { architecture: 'x86', bitness: '64', brands: brands, fullVersionList: brands.map(b => ({ brand: b.brand, version: b.brand.indexOf('Brand') > -1 ? '8.0.0.0' : fullV })), mobile: false, model: '', platform: plat, platformVersion: plat === 'Windows' ? '10.0.0' : (plat === 'macOS' ? '13.0.0' : '6.0.0'), uaFullVersion: fullV, wow64: false };
        const fake = { brands: brands, mobile: false, platform: plat, getHighEntropyValues: function (h) { return Promise.resolve(JSON.parse(JSON.stringify(high))); }, toJSON: function () { return { brands: brands, mobile: false, platform: plat }; } };
        def(navigator, 'userAgentData', fake);
      } catch (e) {}
    }
    if (s.screenMode === 'manual' && s.screenResolution) {
      try { const parts = s.screenResolution.split('x'); const w = parseInt(parts[0]); const ht = parseInt(parts[1]); if (w && ht) { def(screen, 'width', w); def(screen, 'height', ht); def(screen, 'availWidth', w); def(screen, 'availHeight', ht); } } catch (e) {}
    }
  } catch (e) {}
}

// Canvas spoofing functions
function disableCanvas() {
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function() {
    return originalToDataURL.call(this);
  };

  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function() {
    return originalGetImageData.call(this, 0, 0, this.canvas.width, this.canvas.height);
  };
}

function addCanvasNoise() {
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function() {
    if (this.width > 16 && this.height > 16) {
      // Add noise to canvas
      const ctx = this.getContext('2d');
      const imageData = ctx.getImageData(0, 0, this.width, this.height);
      const data = imageData.data;

      // Add subtle noise
      for (let i = 0; i < data.length; i += 4) {
        if (Math.random() > 0.95) {
          data[i] = Math.floor(Math.random() * 256);
          data[i + 1] = Math.floor(Math.random() * 256);
          data[i + 2] = Math.floor(Math.random() * 256);
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }
    return originalToDataURL.call(this);
  };

  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function() {
    const imageData = originalGetImageData.call(this, 0, 0, this.canvas.width, this.canvas.height);

    if (this.canvas.width > 16 && this.canvas.height > 16) {
      const data = imageData.data;

      // Add subtle noise
      for (let i = 0; i < data.length; i += 4) {
        if (Math.random() > 0.95) {
          data[i] = Math.floor(Math.random() * 256);
          data[i + 1] = Math.floor(Math.random() * 256);
          data[i + 2] = Math.floor(Math.random() * 256);
        }
      }
    }

    return imageData;
  };
}

// WebGL spoofing functions
function disableWebGL() {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function() {
    if (arguments[0] === 'webgl' || arguments[0] === 'experimental-webgl') {
      return null;
    }
    return originalGetContext.apply(this, arguments);
  };
}

function addWebGLNoise() {
  const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 0x1F02 || parameter === 0x1F01 || parameter === 0x1F00) {
      // Add noise to vendor/renderer info
      const original = originalGetParameter.call(this, parameter);
      return original + Math.random().toString(36).substring(2, 8);
    }
    return originalGetParameter.call(this, parameter);
  };
}

function spoofWebGLInfo(vendor, renderer) {
  const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 0x1F02) {
      return vendor;
    } else if (parameter === 0x1F01) {
      return renderer;
    }
    return originalGetParameter.call(this, parameter);
  };
}

// WebGPU spoofing function
function disableWebGPU() {
  if (navigator.gpu) {
    navigator.gpu = undefined;
  }
}

// Client Rects spoofing function
function addClientRectsNoise() {
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function() {
    const rect = originalGetBoundingClientRect.call(this);

    // Add subtle noise to dimensions
    if (Math.random() > 0.9) {
      rect.width += Math.random() > 0.5 ? 1 : -1;
      rect.height += Math.random() > 0.5 ? 1 : -1;
    }

    return rect;
  };
}

// Timezone spoofing function
function spoofTimezone(timezone) {
  const originalTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
    value: function() {
      const options = originalTimezone.call(this);
      options.timeZone = timezone;
      return options;
    }
  });
}

// Language spoofing function
function spoofLanguage(language) {
  const originalLanguage = navigator.language;
  Object.defineProperty(navigator, 'language', {
    get: function() {
      return language;
    }
  });

  const originalLanguages = navigator.languages;
  Object.defineProperty(navigator, 'languages', {
    get: function() {
      return [language];
    }
  });
}

// Geolocation spoofing function
function spoofGeolocation(latitude, longitude) {
  const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
  navigator.geolocation.getCurrentPosition = function(success, error, options) {
    success({
      coords: {
        latitude: latitude,
        longitude: longitude,
        accuracy: 10
      },
      timestamp: Date.now()
    });
  };

  const originalWatchPosition = navigator.geolocation.watchPosition;
  navigator.geolocation.watchPosition = function(success, error, options) {
    success({
      coords: {
        latitude: latitude,
        longitude: longitude,
        accuracy: 10
      },
      timestamp: Date.now()
    });
    return 1;
  };
}

// Hardware spoofing function
function spoofHardware(cores) {
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: function() {
      return cores;
    }
  });
}

// Memory spoofing function
function spoofMemory(memoryGB) {
  if (navigator.deviceMemory) {
    Object.defineProperty(navigator, 'deviceMemory', {
      get: function() {
        return memoryGB;
      }
    });
  }
}

// MAC Address spoofing function
function spoofMacAddress(macAddress) {
  // This is a simplified implementation
  // In a real extension, you would need to use more sophisticated methods
  const originalGetConnection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (originalGetConnection) {
    Object.defineProperty(navigator, 'connection', {
      get: function() {
        const connection = originalGetConnection;
        connection.macAddress = macAddress;
        return connection;
      }
    });
  }
}

// Device Name spoofing function
function spoofDeviceName(deviceName) {
  // This is a simplified implementation
  // In a real extension, you would need to use more sophisticated methods
  const originalPlatform = navigator.platform;
  Object.defineProperty(navigator, 'platform', {
    get: function() {
      return deviceName;
    }
  });
}

// Fonts spoofing function
function spoofFonts(fonts) {
  // This is a simplified implementation
  // In a real extension, you would need to use more sophisticated methods
  const originalFonts = document.fonts;
  Object.defineProperty(document, 'fonts', {
    get: function() {
      return new Set(fonts);
    }
  });
}

// Audio spoofing function
function spoofAudio() {
  const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
  navigator.mediaDevices.getUserMedia = function(constraints) {
    if (constraints.audio) {
      return new Promise((resolve, reject) => {
        // Create a fake audio stream
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const destination = audioContext.createMediaStreamDestination();
        oscillator.connect(destination);
        oscillator.start();

        resolve(destination.stream);
      });
    }
    return originalGetUserMedia.call(this, constraints);
  };
}

// Screen spoofing function
function spoofScreen(width, height) {
  Object.defineProperty(screen, 'width', {
    get: function() {
      return width;
    }
  });

  Object.defineProperty(screen, 'height', {
    get: function() {
      return height;
    }
  });

  Object.defineProperty(screen, 'availWidth', {
    get: function() {
      return width;
    }
  });

  Object.defineProperty(screen, 'availHeight', {
    get: function() {
      return height;
    }
  });

  Object.defineProperty(window, 'innerWidth', {
    get: function() {
      return width;
    }
  });

  Object.defineProperty(window, 'innerHeight', {
    get: function() {
      return height;
    }
  });

  Object.defineProperty(window, 'outerWidth', {
    get: function() {
      return width;
    }
  });

  Object.defineProperty(window, 'outerHeight', {
    get: function() {
      return height;
    }
  });
}

// Media Devices spoofing function
function spoofMediaDevices() {
  const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
  navigator.mediaDevices.enumerateDevices = function() {
    return new Promise((resolve) => {
      // Return fake media devices
      resolve([
        {
          deviceId: 'fake-audio-input',
          kind: 'audioinput',
          label: 'Fake Microphone',
          groupId: 'fake-group'
        },
        {
          deviceId: 'fake-video-input',
          kind: 'videoinput',
          label: 'Fake Camera',
          groupId: 'fake-group'
        }
      ]);
    });
  };
}

// Function to block canvas fingerprinting (for security settings)
function blockCanvasFingerprinting() {
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function() {
    if (this.width > 16 && this.height > 16) {
      // Return a blank canvas for large canvases (likely used for fingerprinting)
      const blankCanvas = document.createElement('canvas');
      blankCanvas.width = this.width;
      blankCanvas.height = this.height;
      return originalToDataURL.call(blankCanvas);
    }
    return originalToDataURL.call(this);
  };

  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function() {
    if (this.canvas.width > 16 && this.canvas.height > 16) {
      // Return blank image data for large canvases
      const blankCanvas = document.createElement('canvas');
      blankCanvas.width = this.canvas.width;
      blankCanvas.height = this.canvas.height;
      const blankCtx = blankCanvas.getContext('2d');
      return originalGetImageData.call(blankCtx, 0, 0, blankCanvas.width, blankCanvas.height);
    }
    return originalGetImageData.call(this, 0, 0, this.canvas.width, this.canvas.height);
  };
}

// Handle spoofing messages
function handleSpoofingMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'getUserAgent':
      sendResponse({ userAgent: spoofingSettings.userAgent });
      break;
    case 'getScreenSpoofing':
      sendResponse({ 
        enabled: spoofingSettings.screenMode === 'manual' && spoofingSettings.screenResolution,
        width: spoofingSettings.screenResolution ? parseInt(spoofingSettings.screenResolution.split('x')[0]) : null,
        height: spoofingSettings.screenResolution ? parseInt(spoofingSettings.screenResolution.split('x')[1]) : null
      });
      break;
    case 'getCanvasSpoofing':
      sendResponse({ 
        enabled: spoofingSettings.canvasMode !== 'real',
        mode: spoofingSettings.canvasMode
      });
      break;
    case 'getWebGLSpoofing':
      sendResponse({ 
        enabled: spoofingSettings.webglMode !== 'real' || spoofingSettings.webglInfoMode === 'manual',
        mode: spoofingSettings.webglMode,
        vendor: spoofingSettings.webglVendor,
        renderer: spoofingSettings.webglRenderer
      });
      break;
    case 'getWebRTCSpoofing':
      sendResponse({ 
        enabled: spoofingSettings.webrtcMode !== 'real',
        mode: spoofingSettings.webrtcMode
      });
      break;
    default:
      sendResponse({});
  }
  return true;
}

// Persistent proxy authentication (MV3). One onAuthRequired handler serves both
// the active proxy (normal browsing) and the proxy currently under test. Without
// this on the activation path, authenticated proxies fail every page load.
function proxyAuthHandler(details, callback) {
  const p = testingProxy || activeProxy;
  if (details.isProxy && p && p.username) {
    callback({ authCredentials: { username: p.username, password: p.password } });
  } else {
    callback();
  }
}
chrome.webRequest.onAuthRequired.addListener(
  proxyAuthHandler,
  { urls: ['<all_urls>'] },
  ['asyncBlocking']
);

// Apply the proxy state we intend: the active proxy as fixed_servers, or direct.
// Used to restore after a test (so the browser is never left in the temporary test
// PAC) and on service-worker startup to heal a test that died before it restored.
function applyActiveProxy(cb) {
  const value = activeProxy
    ? { mode: 'fixed_servers', rules: { singleProxy: {
        scheme: activeProxy.scheme || 'http', host: activeProxy.host, port: activeProxy.port } } }
    : { mode: 'direct' };
  dlog('[ProxyBro] applyActiveProxy →', activeProxy
    ? 'proxy ' + activeProxy.host + ':' + activeProxy.port
    : 'DIRECT (no active proxy in memory)');
  chrome.proxy.settings.set({ value, scope: 'regular' }, () => { if (cb) cb(); });
}

// Non-blocking: after activating, confirm the proxy actually carries traffic.
// The active proxy is fixed_servers, so this fetch routes through it; warn if dead.
async function verifyActiveProxyHealth() {
  const fetchVia = async (url) => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 12000);
    try { const r = await fetch(url, { signal: c.signal, cache: 'no-store' }); clearTimeout(t); return r; }
    catch (e) { clearTimeout(t); return null; }
  };
  const ipResp = await fetchVia('https://ipwho.is/');
  if (ipResp) {
    try { const d = await ipResp.json(); if (d && d.ip) { dlog('[ProxyBro] health OK — exit IP', d.ip); return; } } catch (e) {}
  }
  const ping = await fetchVia('https://www.google.com/generate_204');
  if (ping && ping.status === 204) { dlog('[ProxyBro] health OK (tunnel works, exit IP hidden by proxy)'); return; }
  console.warn('[ProxyBro] health FAILED — proxy not responding');
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'ProxyBro — proxy not responding',
    message: 'The proxy activated but is not carrying traffic. It may be dead or need a different protocol (try socks5://). '
  });
}

function reconcileProxyState() {
  if (activeProxy) { applyActiveProxy(); return; }
  // No active proxy: clear a leftover test PAC, but don't disturb system/direct.
  chrome.proxy.settings.get({}, (s) => {
    if (s && s.value && s.value.mode === 'pac_script') {
      dlog('[ProxyBro] reconcile: cleared leftover test PAC → direct');
      chrome.proxy.settings.set({ value: { mode: 'direct' }, scope: 'regular' });
    }
  });
}

// On every service-worker spawn: restore the active proxy and heal a stuck test PAC.
chrome.storage.local.get(['activeProxyData'], (data) => {
  if (data.activeProxyData) activeProxy = data.activeProxyData;
  reconcileProxyState();
});

// Handle proxy activation
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle spoofing messages
  if (message.type && message.type.startsWith('get')) {
    return handleSpoofingMessage(message, sender, sendResponse);
  }

  if (message.action === 'activateProxy') {
    try {
      const config = {
        mode: 'fixed_servers',
        rules: {
          singleProxy: {
            scheme: message.proxy.scheme || 'http',
            host: message.proxy.host,
            port: message.proxy.port
          }
        }
      };
      chrome.proxy.settings.set(
        { value: config, scope: 'regular' },
        () => {
          if (chrome.runtime.lastError) {
            console.error('Proxy activation error:', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
            return;
          }

          activeProxy = message.proxy;
          proxyState.connected = true;
          proxyState.lastChecked = new Date();
          setKillSwitchRule(false); // clear any active kill-switch block
          chrome.storage.local.set({ activeProxyData: message.proxy }); // survive SW restart

          // Verify it actually took effect and that WE (not another extension) control it.
          chrome.proxy.settings.get({}, (s) => {
            dlog('[ProxyBro] activated', (message.proxy.scheme || 'http') + '://' +
              message.proxy.host + ':' + message.proxy.port,
              '| control:', s.levelOfControl, '| mode:', s.value && s.value.mode);
            if (s.levelOfControl && s.levelOfControl !== 'controlled_by_this_extension') {
              sendResponse({ success: false,
                error: 'Another extension controls Chrome’s proxy (' + s.levelOfControl +
                       '). Disable other VPN/proxy extensions, then try again.' });
              return;
            }
            sendResponse({ success: true });
            verifyActiveProxyHealth(); // non-blocking: warn if the proxy is actually dead
          });
        }
      );
      return true; // Indicates async response
    } catch (e) {
      console.error('Proxy activation exception:', e);
      sendResponse({ success: false, error: e.message });
    }
  }

  else if (message.action === 'deactivateProxy') {
    chrome.proxy.settings.set(
      { value: { mode: 'direct' }, scope: 'regular' },
      () => {
        activeProxy = null;
        proxyState.connected = false;
        proxyState.lastChecked = new Date();
        setKillSwitchRule(false); // going direct intentionally — clear kill switch
        chrome.storage.local.remove('activeProxyData');
        sendResponse({ success: true });
      }
    );
    return true; // Indicates async response
  }

  else if (message.action === 'testProxies') {
    testProxies(message.proxies, sendResponse);
    return true; // Indicates async response
  } else if (message.action === 'testSingleProxy') {
    testSingleProxy(message.proxy, message.index, sendResponse);
    return true; // Indicates async response
  } else if (message.action === 'getStats') {
    getStats(sendResponse);
    return true; // Indicates async response
  } else if (message.action === 'updateSecuritySettings') {
    try {
      securitySettings = message.settings;
      applySecuritySettings();
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error updating security settings:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Indicates async response
  } else if (message.action === 'updateSpoofingSettings') {
    try {
      spoofingSettings = message.settings;
      applySpoofingSettings();
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error updating spoofing settings:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Indicates async response
  } else if (message.action === 'setCustomUserAgent') {
    // Set the custom User-Agent via declarativeNetRequest (MV3)
    try {
      spoofingSettings.userAgent = message.userAgent;
      setUserAgentRule(message.userAgent || null);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error setting custom User-Agent:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Indicates async response
  } else if (message.action === 'deleteCookies') {
    try {
      chrome.cookies.getAll({}, (cookies) => {
        let count = 0;
        if (cookies.length === 0) {
          sendResponse({ success: true, count: 0 });
          return;
        }

        cookies.forEach(cookie => {
          const url = `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`;
          chrome.cookies.remove({ url, name: cookie.name }, () => {
            count++;
            if (count === cookies.length) {
              sendResponse({ success: true, count });
            }
          });
        });
      });
    } catch (error) {
      console.error('Error deleting cookies:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Indicates async response
  } else if (message.action === 'deleteHistory') {
    try {
      // Scoped to privacy-relevant data only — never passwords or downloads.
      chrome.browsingData.remove({ since: 0 }, {
        "cache": true,
        "cookies": true,
        "formData": true,
        "history": true,
        "indexedDB": true,
        "localStorage": true
      }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ success: true });
      });
    } catch (error) {
      console.error('Error deleting browsing data:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Indicates async response
  }

  // Return false for unhandled messages
  return false;
});

// Test all proxies
async function testProxies(proxies, callback) {
  let working = 0;
  const total = proxies.length;
  for (let i = 0; i < proxies.length; i++) {
    const proxy = proxies[i];
    try {
      // Test proxy by fetching a small resource through the proxy
      const testResult = await testProxyWithAuth(proxy);

      if (testResult.success) {
        working++;
        chrome.runtime.sendMessage({
          action: 'proxyTestResult',
          index: i,
          status: 'Working',
          speed: testResult.speed,
          country: testResult.country,
          city: testResult.city
        });
      } else {
        throw new Error(testResult.error);
      }
    } catch (error) {
      chrome.runtime.sendMessage({
        action: 'proxyTestResult',
        index: i,
        status: 'Dead',
        speed: null,
        country: null,
        city: null
      });
    }
  }
  callback({ total, working });
}

// Test a single proxy
async function testSingleProxy(proxy, index, callback) {
  try {
    const testResult = await testProxyWithAuth(proxy);

    if (testResult.success) {
      chrome.runtime.sendMessage({
        action: 'proxyTestResult',
        index: index,
        status: 'Working',
        speed: testResult.speed,
        country: testResult.country,
        city: testResult.city
      });
      callback({ success: true, speed: testResult.speed });
    } else {
      throw new Error(testResult.error);
    }
  } catch (error) {
    chrome.runtime.sendMessage({
      action: 'proxyTestResult',
      index: index,
      status: 'Dead',
      speed: null,
      country: null,
      city: null
    });
    callback({ success: false, error: error.message });
  }
}

// Test proxy with authentication
async function testProxyWithAuth(proxy) {
  return new Promise((resolve) => {
    // Create a PAC script that routes test requests through this proxy
    const pacKeyword = proxy.scheme === 'socks5' ? 'SOCKS5'
                     : proxy.scheme === 'socks4' ? 'SOCKS4'
                     : proxy.scheme === 'https' ? 'HTTPS'
                     : 'PROXY';
    const pacScript = `
      function FindProxyForURL(url, host) {
        // Liveness + exit-IP checks go THROUGH the proxy; the geo lookup
        // (ipwho.is) goes DIRECT so a slow proxy can't break the country.
        if (url === "https://www.google.com/generate_204" ||
            url.startsWith("https://api.ipify.org")) {
          return "${pacKeyword} ${proxy.host}:${proxy.port}";
        }
        return "DIRECT";
      }
    `;

    // Set temporary proxy configuration for testing
    const testConfig = {
      mode: 'pac_script',
      pacScript: { data: pacScript }
    };

    // Save current proxy settings
    chrome.proxy.settings.get({}, (currentSettings) => {
      // Apply test proxy configuration
      chrome.proxy.settings.set(
        { value: testConfig, scope: 'regular' },
        () => {
          // Authenticate this proxy via the shared onAuthRequired handler.
          testingProxy = proxy;

          // Perform the test: confirm the proxy returns a real, working exit IP.
          testProxyExit().then((res) => {
            testingProxy = null;
            // Restore to our intended proxy state (active proxy or direct) — never
            // leave the browser stuck in the temporary test PAC.
            applyActiveProxy(() => {
              resolve({
                success: res.success,
                speed: res.speed,
                country: res.country,
                city: res.city,
                ip: res.ip,
                error: res.error
              });
            });
          }).catch(error => {
            testingProxy = null;
            applyActiveProxy(() => {
              resolve({ success: false, error: error.message });
            });
          });
        }
      );
    });
  });
}

// Verify the proxy actually carries traffic: fetch our exit IP THROUGH it.
// "Working" now means a real HTTPS round-trip returned a valid exit IP — dead
// proxies fail here instead of passing the old hollow 204 ping. Country/city
// come from the genuine exit IP the server sees, not the host's own geolocation.
async function testProxyExit() {
  const startTime = Date.now();
  const fetchVia = async (url, ms) => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    try { const r = await fetch(url, { signal: c.signal, cache: 'no-store' }); clearTimeout(t); return r; }
    catch (e) { clearTimeout(t); return null; }
  };
  // 1. Get the exit IP THROUGH the proxy (ipify is tiny/fast — works on slow proxies).
  let ip = null;
  const ipResp = await fetchVia('https://api.ipify.org?format=json', 12000);
  if (ipResp) { try { const d = await ipResp.json(); if (d && d.ip) ip = d.ip; } catch (e) {} }
  if (!ip) {
    // Liveness fallback: a 204 proves the proxy tunnels even if ipify is blocked.
    const ping = await fetchVia('https://www.google.com/generate_204', 12000);
    if (!(ping && ping.status === 204)) {
      return { success: false, error: 'Proxy did not respond on any test endpoint' };
    }
    return { success: true, speed: Date.now() - startTime, ip: null, country: 'Unknown', city: 'Unknown' };
  }
  // 2. Geolocate that exit IP via a DIRECT lookup, trying several providers in
  //    order so a rate-limit/block on one never leaves the country 'Unknown'.
  const geo = await geolocateDirect(ip);
  return { success: true, speed: Date.now() - startTime, ip: ip, country: geo.country, city: geo.city };
}

// Direct IP geolocation with multiple free providers as fallbacks. Returns the
// first that yields a country. Spreads load and survives rate-limits/blocks.
async function geolocateDirect(ip) {
  const get = async (url, ms) => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    try { const r = await fetch(url, { signal: c.signal, cache: 'no-store' }); clearTimeout(t); return await r.json(); }
    catch (e) { clearTimeout(t); return null; }
  };
  const sources = [
    async () => { const d = await get('https://ipwho.is/' + ip, 8000); return (d && d.success !== false && d.country) ? { country: d.country, city: d.city } : null; },
    async () => { const d = await get('https://ipinfo.io/' + ip + '/json', 8000); return (d && d.country) ? { country: d.country, city: d.city } : null; },
    async () => { const d = await get('https://api.country.is/' + ip, 6000); return (d && d.country) ? { country: d.country, city: null } : null; },
    async () => { const d = await get('https://ipapi.co/' + ip + '/json/', 8000); return (d && !d.error && (d.country_name || d.country)) ? { country: d.country_name || d.country, city: d.city } : null; }
  ];
  for (let i = 0; i < sources.length; i++) {
    const res = await sources[i]();
    if (res && res.country) return { country: res.country, city: res.city || 'Unknown' };
  }
  return { country: 'Unknown', city: 'Unknown' };
}

// Get statistics
function getStats(callback) {
  chrome.storage.local.get(['stats'], (data) => {
    const stats = data.stats || { rotations: 0 };
    callback(stats);
  });
}