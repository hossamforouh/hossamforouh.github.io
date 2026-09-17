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

  /* ---- Project filter ---------------------------------------------------
     Hides non-Saudi columns in the coverage table and their ledger entries.
     Column spans are recounted so the table never gains a phantom column. */
  var chips = Array.prototype.slice.call(document.querySelectorAll("#engagements .chip"));
  var cov = document.getElementById("coverage");
  var ledger = document.getElementById("ledger");
  var entries = Array.prototype.slice.call(document.querySelectorAll("#ledger .entry"));
  var countEl = document.getElementById("filter-count");

  function applyFilter(key) {
    var off = {};
    var shown = 0;

    // Ledger entries decide which client columns are switched off.
    entries.forEach(function (entry) {
      var match = key === "all" || entry.getAttribute("data-place") === key;
      entry.hidden = !match;
      if (match) {
        shown++;
      } else {
        off[entry.getAttribute("data-col")] = true;
      }
    });

    if (cov) {
      // Hide every header and cell that belongs to a hidden column
      // (group rows carry their own data-col cells, so no span recount is needed).
      Array.prototype.slice.call(cov.querySelectorAll("[data-col]")).forEach(function (cell) {
        cell.hidden = !!off[cell.getAttribute("data-col")];
      });

      // Tier headers and colgroups: span only the columns still showing.
      Array.prototype.slice.call(cov.querySelectorAll("[data-cols]")).forEach(function (el) {
        var n = el.getAttribute("data-cols").split(" ").filter(function (c) {
          return !off[c];
        }).length;
        if (el.tagName === "COLGROUP") {
          el.setAttribute("span", Math.max(n, 1));   // span cannot be 0
        } else {
          el.hidden = n === 0;
          el.setAttribute("colspan", Math.max(n, 1));
        }
      });
    }

    if (countEl) {
      // State the relation, not just the number.
      countEl.textContent = key === "all"
        ? ""
        : "Showing " + shown + " of " + entries.length;
    }
  }

  // Drop the class once settle ends, so it never outranks the :target tint later.
  if (ledger) {
    ledger.addEventListener("animationend", function (e) {
      if (e.animationName === "settle") ledger.classList.remove("is-filtering");
    });
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) {
        c.classList.remove("is-on");
        c.setAttribute("aria-pressed", "false");
      });
      chip.classList.add("is-on");
      chip.setAttribute("aria-pressed", "true");
      applyFilter(chip.getAttribute("data-filter"));

      // Re-trigger the settle animation on whatever is now showing.
      if (ledger && allowMotion) {
        ledger.classList.remove("is-filtering");
        void ledger.offsetWidth;              // force reflow so the animation restarts
        ledger.classList.add("is-filtering");
      }
    });
  });

  /* ---- Coverage table: column highlight and entrance ------------------- */
  if (cov) {
    // Pointer or keyboard on a client column tints that column and reddens its marks.
    var setHl = function (e) {
      var cell = e.target.closest ? e.target.closest("[data-col]") : null;
      if (cell) cov.setAttribute("data-hl", cell.getAttribute("data-col"));
      else cov.removeAttribute("data-hl");
    };
    var clearHl = function () { cov.removeAttribute("data-hl"); };

    // Mouse hover only on devices with a real hover pointer: a touch tap fires
    // mouseover but never mouseleave, which would leave a column stuck red.
    if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
      cov.addEventListener("mouseover", setHl);
      cov.addEventListener("mouseleave", clearHl);
    }
    cov.addEventListener("focusin", setHl);
    // Following a client link never leaves a column lit behind.
    cov.addEventListener("click", clearHl);
    cov.addEventListener("focusout", function (e) {
      if (!cov.contains(e.relatedTarget)) cov.removeAttribute("data-hl");
    });

    // Marks scale in once, column by column, when the table first scrolls into view.
    if (allowMotion && "IntersectionObserver" in window) {
      var covObserver = new IntersectionObserver(function (seen) {
        if (seen[0] && seen[0].isIntersecting) {
          cov.classList.add("is-in");
          covObserver.disconnect();
        }
      }, { threshold: 0.2 });
      covObserver.observe(cov);
    } else {
      cov.classList.add("is-in");
    }
  }

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
