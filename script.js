(function () {
  "use strict";

  /* ---- Motion opt-in ----------------------------------------------------
     Entrance animations are enabled by this class, so a visitor with
     JavaScript off or reduced motion on sees the finished page immediately
     rather than content waiting to be revealed. */
  var allowMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (allowMotion) document.documentElement.classList.add("js-motion");

  /* ---- Theme toggle -----------------------------------------------------
     The saved theme is stamped on <html> by an inline script in <head>, before
     first paint, so the page never flashes the wrong theme. This only handles
     the click. */
  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");

  function currentTheme() {
    var stamped = root.getAttribute("data-theme");
    if (stamped) return stamped;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function describeToggle() {
    if (!toggle) return;
    var next = currentTheme() === "light" ? "dark" : "light";
    toggle.setAttribute("aria-label", "Switch to " + next + " theme");
  }

  if (toggle) {
    describeToggle();
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("hf-theme", next); } catch (e) { /* storage blocked */ }
      describeToggle();
    });
  }

  /* ---- Projects showcase ------------------------------------------------
     One project at a time, switched by tabs, arrows or the phone pager.
     Without JavaScript the controls stay hidden and every project is shown.
     Entrances play only on a switch, never on page load, so nothing the
     visitor is already reading blinks out. The stage height follows the
     active project; the controls sit above it, so they never move.
     Wrapped in its own function so its names never collide with the rest
     of this file (for example the later "status" variable). */
  (function () {
    var showcase = document.getElementById("showcase");
    if (!showcase) return;

    var toArray = function (list) { return Array.prototype.slice.call(list); };
    var panels = toArray(showcase.querySelectorAll(".show"));
    var tabs = toArray(showcase.querySelectorAll(".show-tab"));
    var tablist = showcase.querySelector(".show-tabs");
    var bar = showcase.querySelector(".show-bar");
    var pager = showcase.querySelector(".show-pager");
    var live = document.getElementById("show-status");
    var count = panels.length;
    if (!count || tabs.length !== count || !tablist) return;

    // Browsers with find-in-page for hidden content (Chrome) get "until-found".
    var untilFound = "onbeforematch" in document.body;
    var current = -1;

    function fullName(i) {
      var h = panels[i].querySelector(".show-name");
      return h ? h.textContent : "";
    }
    function shortName(i) {
      var s = tabs[i].querySelector(".show-tab-name");
      return s ? s.textContent : fullName(i);
    }
    function hidePanel(panel) {
      if (untilFound) panel.setAttribute("hidden", "until-found");
      else panel.hidden = true;
    }
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function indexOfId(id) {
      for (var k = 0; k < count; k++) if (panels[k].id === id) return k;
      return -1;
    }
    function hashIndex() {
      var id = location.hash.slice(1);
      try { id = decodeURIComponent(id); } catch (e) { /* keep raw */ }
      return id ? indexOfId(id) : -1;
    }

    // Keep the active tab visible inside the scrolling strip, horizontally only,
    // so the page itself never jumps. Instant on purpose: Chrome cancels one
    // smooth scroll when another starts, and the pager may scroll the page too.
    function revealTab(tab) {
      var strip = tablist.getBoundingClientRect();
      var box = tab.getBoundingClientRect();
      if (box.left >= strip.left && box.right <= strip.right) return;
      tablist.scrollLeft += (box.left - strip.left) - (strip.width - box.width) / 2;
    }

    // Replay the entrance on a panel (motion only).
    function playEntrance(panel) {
      if (!allowMotion) return;
      panel.classList.remove("is-entering");
      void panel.offsetWidth;              // force reflow so the animations restart
      panel.classList.add("is-entering");
    }

    // opts: user (update the URL), announce (live region), animate
    function select(i, opts) {
      opts = opts || {};
      i = ((i % count) + count) % count;
      var changed = i !== current;
      current = i;

      tabs.forEach(function (tab, k) {
        var on = k === i;
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (panel, k) {
        // Only the visible project is a Tab stop. A hidden="until-found" panel
        // still has a box, so it must also leave the Tab order.
        if (k === i) {
          panel.removeAttribute("hidden");
          panel.setAttribute("tabindex", "0");
        } else {
          hidePanel(panel);
          panel.removeAttribute("tabindex");
          panel.classList.remove("is-entering");
        }
      });

      // Counter, arrow labels and pager names follow the neighbours.
      var prev = (i - 1 + count) % count;
      var next = (i + 1) % count;
      toArray(showcase.querySelectorAll(".show-count-now")).forEach(function (el) {
        el.textContent = pad(i + 1);
      });
      toArray(showcase.querySelectorAll("[data-dir]")).forEach(function (btn) {
        var back = btn.getAttribute("data-dir") === "-1";
        var to = back ? prev : next;
        btn.setAttribute("aria-label", (back ? "Previous" : "Next") + " project: " + fullName(to));
        var nameEl = btn.querySelector(".pager-name");
        if (nameEl) nameEl.textContent = shortName(to);
      });

      if (opts.announce && live) {
        live.textContent = fullName(i) + ", project " + (i + 1) + " of " + count;
      }
      if (opts.user && history.replaceState) {
        try { history.replaceState(null, "", "#" + panels[i].id); } catch (e) { /* file:// etc. */ }
      }
      revealTab(tabs[i]);
      if (changed && opts.animate) playEntrance(panels[i]);
    }

    /* Init: reveal the controls and wire up the tab pattern */
    showcase.classList.add("is-showcase");
    if (bar) bar.hidden = false;
    if (pager) pager.hidden = false;
    panels.forEach(function (panel, k) {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tabs[k].id);
      // Find-in-page matched text inside a hidden project: switch to it.
      panel.addEventListener("beforematch", function () {
        select(k, { announce: false });
      });
    });

    var start = hashIndex();
    select(start >= 0 ? start : 0);
    if (start >= 0) {
      // The browser could not scroll to a target that was hidden, so do it once.
      requestAnimationFrame(function () {
        showcase.scrollIntoView({ block: "start", behavior: "auto" });
      });
    }

    tabs.forEach(function (tab, k) {
      tab.addEventListener("click", function () {
        select(k, { user: true, animate: true });
      });
    });

    // Arrow keys, Home and End move between tabs (automatic activation).
    tablist.addEventListener("keydown", function (e) {
      var from = tabs.indexOf(e.target.closest ? e.target.closest(".show-tab") : null);
      if (from < 0) return;
      var to;
      switch (e.key) {
        case "ArrowRight": to = from + 1; break;
        case "ArrowLeft":  to = from - 1; break;
        case "Home":       to = 0; break;
        case "End":        to = count - 1; break;
        default: return;
      }
      e.preventDefault();
      select(to, { user: true, animate: true });
      tabs[current].focus();
    });

    // Previous / next buttons (desktop arrows and the phone pager). Focus stays put.
    toArray(showcase.querySelectorAll(".show-arrow, .pager-btn")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var dir = parseInt(btn.getAttribute("data-dir"), 10) || 1;
        select(current + dir, { user: true, announce: true, animate: true });

        // The pager sits below the project: bring the tab strip back if it is off-screen.
        if (btn.classList.contains("pager-btn") && bar) {
          var masthead = document.querySelector(".masthead");
          var top = masthead ? masthead.offsetHeight : 0;
          if (bar.getBoundingClientRect().top < top) {
            bar.scrollIntoView({ block: "start", behavior: allowMotion ? "smooth" : "auto" });
          }
        }
      });
    });

    // Links like #p-nis, from anywhere on the page or typed in the address bar.
    window.addEventListener("hashchange", function () {
      var k = hashIndex();
      if (k < 0) return;
      select(k, { announce: true, animate: true });
      showcase.scrollIntoView({ block: "start", behavior: allowMotion ? "smooth" : "auto" });
    });
  })();

  /* ---- Highlight the nav item for the section currently in view --------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.mainnav a[href^="#"]'));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(function (el) { return el; });

  // Sticky header height changes per breakpoint, so measure it.
  // Feeds scroll-padding-top (via --h-masthead) and the observer below.
  var masthead = document.querySelector(".masthead");
  var headerOffset = masthead ? masthead.offsetHeight : 90;
  function syncHeaderOffset() {
    if (!masthead) return;
    headerOffset = masthead.offsetHeight;
    root.style.setProperty("--h-masthead", headerOffset + "px");
  }
  syncHeaderOffset();
  window.addEventListener("resize", syncHeaderOffset);

  if ("IntersectionObserver" in window && sections.length) {
    var visible = {};

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting;
      });

      // The topmost visible section wins.
      var active = null;
      for (var i = 0; i < sections.length; i++) {
        if (visible[sections[i].id]) { active = sections[i].id; break; }
      }

      links.forEach(function (a) {
        var on = a.getAttribute("href") === "#" + active;
        a.classList.toggle("is-current", on);
        if (on) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }, { rootMargin: "-" + headerOffset + "px 0px -60% 0px", threshold: 0 });

    sections.forEach(function (s) { observer.observe(s); });
  }

  /* ---- Portrait ---------------------------------------------------------
     Hide the frame rather than show a broken image if the photo is absent. */
  var portrait = document.getElementById("portrait");
  if (portrait) {
    var shot = portrait.querySelector("img");
    if (shot) {
      if (shot.complete && shot.naturalWidth === 0) portrait.hidden = true;
      shot.addEventListener("error", function () { portrait.hidden = true; });
    }
  }

  /* ---- Riyadh local time ------------------------------------------------
     Tells a recruiter in another time zone whether it is a good moment to
     call. Without JavaScript the markup still reads "GMT+3". */
  var clocks = Array.prototype.slice.call(document.querySelectorAll(".local-time"));
  if (clocks.length && window.Intl) {
    var fmt;
    try {
      fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit", hour12: false });
    } catch (e) { fmt = null; }

    function tick() {
      var now = fmt.format(new Date());
      clocks.forEach(function (el) {
        el.textContent = now + " GMT+3";
        el.setAttribute("datetime", now);
      });
    }
    if (fmt) {
      tick();
      setInterval(tick, 30000);          // minute precision is enough
    }
  }

  /* ---- Email buttons ----------------------------------------------------
     A mailto link does nothing for visitors with no mail app set up (most
     webmail users). So the button also copies the address and says so; the
     mail app still opens for anyone who has one. */
  var status = document.getElementById("copy-status");
  var mailButtons = Array.prototype.slice.call(document.querySelectorAll('a.btn[href^="mailto:"]'));

  // Older copy method, used when the Clipboard API is missing or refused.
  function legacyCopy(text) {
    var field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(field);
    return ok;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        if (!legacyCopy(text)) throw new Error("copy failed");
      });
    }
    return legacyCopy(text) ? Promise.resolve() : Promise.reject(new Error("copy failed"));
  }

  mailButtons.forEach(function (btn) {
    var label = btn.textContent;
    var timer;

    btn.addEventListener("click", function () {
      var address = btn.getAttribute("href").replace("mailto:", "").split("?")[0];

      copyText(address).then(function () {
        btn.textContent = "Email copied";
        if (status) status.textContent = address + " copied to clipboard";
        clearTimeout(timer);
        timer = setTimeout(function () {
          btn.textContent = label;
          if (status) status.textContent = "";
        }, 2500);
      }).catch(function () { /* copy blocked: the mailto link still runs */ });
    });
  });

  /* ---- CV download ------------------------------------------------------
     Shown only once we know the file is actually there, so the button is
     never a dead link. */
  var cvLinks = Array.prototype.slice.call(document.querySelectorAll(".cv-link"));
  if (cvLinks.length) {
    fetch("cv.pdf", { method: "HEAD" })
      .then(function (res) {
        if (!res.ok) return;
        cvLinks.forEach(function (a) { a.hidden = false; });
        // Download CV replaces the stand-in LinkedIn button in the hero.
        var heroLinkedIn = document.getElementById("linkedin-hero");
        if (heroLinkedIn) heroLinkedIn.hidden = true;
      })
      .catch(function () { /* leave the buttons hidden */ });
  }

})();
