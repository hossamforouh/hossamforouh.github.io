(function () {
  "use strict";

  /* ---- Theme toggle: remembers the choice, otherwise follows the OS ---- */
  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");

  try {
    var saved = localStorage.getItem("hf-theme");
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  } catch (e) { /* storage blocked — keep the OS theme */ }

  function currentTheme() {
    var stamped = root.getAttribute("data-theme");
    if (stamped) return stamped;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("hf-theme", next); } catch (e) { /* ignore */ }
    });
  }

  /* ---- Engagement filter: show only projects that used the chosen module ---- */
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
      chips.forEach(function (c) { c.classList.remove("is-on"); });
      chip.classList.add("is-on");
      applyFilter(chip.getAttribute("data-filter"));
    });
  });

  /* ---- Highlight the nav item for the section currently in view ---- */
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
        a.classList.toggle("is-current", a.getAttribute("href") === "#" + active);
      });
    }, { rootMargin: "-90px 0px -60% 0px", threshold: 0 });

    sections.forEach(function (s) { observer.observe(s); });
  }
})();
