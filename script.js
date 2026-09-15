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

  /* ---- Engagement filter ------------------------------------------------ */
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
  var projects = Array.prototype.slice.call(document.querySelectorAll(".project"));
  var countEl = document.getElementById("filter-count");

  function applyFilter(key) {
    var shown = 0;
    projects.forEach(function (item) {
      var mods = item.getAttribute("data-modules") || "";
      var match = key === "all" || mods.split(" ").indexOf(key) !== -1;
      item.hidden = !match;
      if (match) shown++;
    });
    if (countEl) {
      countEl.textContent = shown + (shown === 1 ? " engagement" : " engagements");
    }
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
      var list = document.getElementById("dossiers");
      if (list && allowMotion) {
        list.classList.remove("is-filtering");
        void list.offsetWidth;              // force reflow so the animation restarts
        list.classList.add("is-filtering");
      }
    });
  });

  /* ---- Highlight the nav item for the section currently in view --------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.mainnav a[href^="#"]'));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(function (el) { return el; });

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
    }, { rootMargin: "-90px 0px -60% 0px", threshold: 0 });

    sections.forEach(function (s) { observer.observe(s); });
  }

  /* ---- Method spine: stagger the phases in, once ------------------------
     The one place on the page a stagger earns its keep — it reads as a
     sequence, which is what the section is actually describing. */
  var steps = document.querySelector(".steps");
  if (steps && allowMotion && "IntersectionObserver" in window) {
    var stepWatcher = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        obs.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -15% 0px", threshold: 0.1 });
    stepWatcher.observe(steps);
  }
})();
