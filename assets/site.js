// NullVPN site: theme, the visitor's platform, and the latest release.
//
// Every download link in the HTML already points at
// github.com/…/releases/latest/download/<file>, which GitHub redirects to the
// newest release on its own. So the page works with this script blocked or
// the API unreachable; what the API adds is the version, the date
// and file sizes.
(function () {
  "use strict";

  var REPO = "snarefps/NullVPN";
  var API = "https://api.github.com/repos/" + REPO + "/releases/latest";
  var LATEST = "https://github.com/" + REPO + "/releases/latest/download/";
  var root = document.documentElement;
  var fa = root.lang === "fa";

  var T = fa
    ? {
        download: "دانلود",
        forWindows: "دانلود برای ویندوز",
        forAndroid: "دانلود برای اندروید",
        forLinux: "دانلود برای لینوکس",
        forMac: "دانلود برای مک",
        forIos: "دانلود برای آیفون",
        allDownloads: "همه دانلودها",
        version: "آخرین نسخه",
        released: "منتشر شده در",
        mb: "مگابایت",
        light: "تم روشن",
        dark: "تم تیره",
      }
    : {
        download: "Download",
        forWindows: "Download for Windows",
        forAndroid: "Download for Android",
        forLinux: "Download for Linux",
        forMac: "Download for macOS",
        forIos: "Download for iPhone",
        allDownloads: "All downloads",
        version: "Latest version",
        released: "released",
        mb: "MB",
        light: "Light theme",
        dark: "Dark theme",
      };

  // ---------- theme ----------

  function storedTheme() {
    try { return localStorage.getItem("theme"); } catch (e) { return null; }
  }
  function effectiveTheme() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  function labelThemeButton() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    var next = effectiveTheme() === "dark" ? T.light : T.dark;
    btn.setAttribute("aria-label", next);
    btn.setAttribute("title", next);
  }
  var saved = storedTheme();
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);

  // ---------- platform ----------

  function detectPlatform() {
    var ua = navigator.userAgent || "";
    var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    if (/android/i.test(ua)) return "android";
    if (/iphone|ipad|ipod/i.test(ua)) return "ios";
    // iPadOS reports itself as a Mac; a touch screen gives it away.
    if (/mac/i.test(platform) && navigator.maxTouchPoints > 1) return "ios";
    if (/win/i.test(platform) || /windows/i.test(ua)) return "windows";
    if (/mac/i.test(platform) || /mac os x/i.test(ua)) return "macos";
    if (/linux|x11|cros/i.test(platform + ua)) return "linux";
    return null;
  }

  var FILES = {
    windows: "NullVPN-windows-x64-setup.exe",
    android: "NullVPN-android-arm64-v8a.apk",
    linux: "NullVPN-linux-x86_64.AppImage",
    macos: "NullVPN-macos-universal.dmg",
    ios: "NullVPN-ios-unsigned.ipa",
  };

  var you = detectPlatform();
  // The hero's main button: straight to the right file where there is one.
  function setPrimaryButton() {
    var btn = document.getElementById("primary-download");
    if (!btn) return;
    var label = btn.querySelector("[data-label]");
    var downloadPage = btn.getAttribute("data-download-page") || "download.html";
    var text = T.download;
    var href = downloadPage;
    if (you === "windows") { text = T.forWindows; href = LATEST + FILES.windows; }
    else if (you === "android") { text = T.forAndroid; href = LATEST + FILES.android; }
    else if (you === "linux") { text = T.forLinux; href = downloadPage + "#linux"; }
    else if (you === "macos") { text = T.forMac; href = LATEST + FILES.macos; }
    // An .ipa has to be signed first; the download page says how.
    else if (you === "ios") { text = T.forIos; href = downloadPage + "#ios"; }
    if (label) label.textContent = text;
    btn.setAttribute("href", href);
  }

  function markYourPlatform() {
    if (!you) return;
    var card = document.getElementById(you);
    if (card) card.classList.add("is-you");
  }

  // ---------- release ----------

  function formatSize(bytes) {
    var mb = bytes / (1024 * 1024);
    var n = mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10;
    return (fa ? n.toLocaleString("fa-IR") : String(n)) + " " + T.mb;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(fa ? "fa-IR" : "en-GB", {
        year: "numeric", month: "long", day: "numeric",
      });
    } catch (e) { return iso.slice(0, 10); }
  }

  function applyRelease(release) {
    var assets = release.assets || [];

    var line = document.getElementById("release-line");
    if (line) {
      line.innerHTML = "";
      var v = document.createElement("strong");
      v.textContent = release.tag_name;
      line.appendChild(document.createTextNode(T.version + ": "));
      line.appendChild(v);
      if (release.published_at) {
        line.appendChild(document.createTextNode(" · " + T.released + " " + formatDate(release.published_at)));
      }
    }
    document.querySelectorAll("[data-version]").forEach(function (el) {
      el.textContent = release.tag_name;
    });

    assets.forEach(function (a) {
      document.querySelectorAll('[data-size="' + a.name + '"]').forEach(function (el) {
        el.textContent = formatSize(a.size);
      });
    });

    setPrimaryButton();
  }

  function loadRelease() {
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem("nullvpn-release") || "null"); } catch (e) {}
    if (cached && cached.at > Date.now() - 10 * 60 * 1000) {
      applyRelease(cached.release);
      return;
    }
    if (!window.fetch) return;
    fetch(API, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (release) {
        var slim = {
          tag_name: release.tag_name,
          published_at: release.published_at,
          assets: (release.assets || []).map(function (a) { return { name: a.name, size: a.size }; }),
        };
        try { sessionStorage.setItem("nullvpn-release", JSON.stringify({ at: Date.now(), release: slim })); } catch (e) {}
        applyRelease(slim);
      })
      .catch(function () { /* the static links still work */ });
  }

  // ---------- start ----------

  document.addEventListener("DOMContentLoaded", function () {
    var toggle = document.getElementById("theme-toggle");
    if (toggle) {
      labelThemeButton();
      toggle.addEventListener("click", function () {
        var next = effectiveTheme() === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) {}
        labelThemeButton();
      });
    }
    // Keep the reader on the same page when switching language.
    document.querySelectorAll("a[data-lang-switch]").forEach(function (a) {
      a.addEventListener("click", function () {
        if (location.hash) a.setAttribute("href", a.getAttribute("href").split("#")[0] + location.hash);
      });
    });
    setPrimaryButton();
    markYourPlatform();
    loadRelease();
  });
})();
