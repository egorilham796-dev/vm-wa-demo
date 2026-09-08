/* ==========================================================================
   V&M Werbeagentur - V8 "Tiefe"
   Eine Kamera, eine Achse. Jede Platte liegt in ihrer eigenen Linse
   (perspective auf dem Elternknoten, Fluchtpunkt in der Mitte der Platte),
   die Fahrt laeuft ueber translate3d, scale entsteht aus Z, sonst nur opacity.
   Nichts wird angeheftet, nichts wischt, kein eigener scroll-Listener.

   Dieselbe Datei bedient Startseite und Unterseite: jeder Block prueft erst
   seine Knoten, fehlt ein Abschnitt, bleibt der Block still.
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reduce  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isPhone = window.matchMedia("(max-width: 900px)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------- Menue */
  var burger = $("#burger"), menu = $("#menu"), menuClose = $("#menuClose");
  if (burger && menu) {
    var setMenu = function (open) {
      menu.dataset.open = open ? "true" : "false";
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
      if (open) menu.querySelector("a").focus();
    };
    burger.addEventListener("click", function () { setMenu(true); });
    if (menuClose) menuClose.addEventListener("click", function () { setMenu(false); });
    $$("#menu a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  /* -------------------------------------------------------------- Formular */
  var form = $("#form"), note = $("#note"), send = $("#send");
  if (form && note && send) {
    var RULES = {
      name:    function (v) { return v.trim().length >= 2 || "Bitte geben Sie Ihren Namen an."; },
      email:   function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Bitte prüfen Sie die E-Mail-Adresse."; },
      tel:     function (v) { return v.trim() === "" || v.trim().length >= 6 || "Diese Telefonnummer ist zu kurz."; },
      message: function (v) { return v.trim().length >= 10 || "Bitte beschreiben Sie Ihr Anliegen kurz."; }
    };
    var checkField = function (input) {
      var rule = RULES[input.name];
      var field = input.closest("[data-field]");
      if (!rule || !field) return true;
      var res = rule(input.value);
      var err = $("[data-err]", field);
      field.dataset.invalid = res === true ? "false" : "true";
      err.textContent = res === true ? "" : res;
      return res === true;
    };
    $$("#form input, #form textarea").forEach(function (el) {
      if (!RULES[el.name]) return;
      el.addEventListener("blur", function () { checkField(el); });
      el.addEventListener("input", function () {
        if (el.closest("[data-field]").dataset.invalid === "true") checkField(el);
      });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      $$("#form input, #form textarea").forEach(function (el) { if (RULES[el.name] && !checkField(el)) ok = false; });
      if (!$("#f-ok").checked) {
        ok = false;
        note.dataset.state = "bad";
        note.textContent = "Bitte bestätigen Sie die Einwilligung zur Speicherung.";
      }
      if (!ok) {
        if (note.textContent === "") { note.dataset.state = "bad"; note.textContent = "Bitte prüfen Sie die markierten Felder."; }
        return;
      }
      send.disabled = true;
      var label = send.firstChild;
      label.nodeValue = "Wird gesendet ";
      note.dataset.state = ""; note.textContent = "";
      window.setTimeout(function () {
        send.disabled = false;
        label.nodeValue = "Senden ";
        form.reset();
        note.dataset.state = "ok";
        note.textContent = "Danke, Ihre Anfrage ist angekommen. Wir melden uns innerhalb eines Werktages.";
      }, 900);
    });
  }

  /* ----------------------------------- Ohne Bewegung: keine Kamera, Schluss */
  if (reduce) {
    // Ohne Kamera laeuft kein Trigger, also setzt niemand das Plakat: die Filmplatte
    // bliebe eine leere Flaeche. Plakat sofort, Film bleibt ungeladen.
    $$("video[data-poster]").forEach(function (v) { if (!v.poster) v.poster = v.dataset.poster; });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ------------------------------------------------------- Weicher Scroll */
  var lenis = new Lenis({ duration: 1.05, smoothWheel: true, touchMultiplier: 1.6 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);

  var navH = function () { return Math.max(64, parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 72); };
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -navH() - 16 });
    });
  });

  /* ======================================================================
     Die Fahrt: jede Platte kommt aus der Tiefe, steht im Fokus und geht
     an der Kamera vorbei. Sie ist auf 0 heruntergeblendet, lange bevor die
     Vergroesserung ihre Kanten aus dem Bild schiebt (Regel aus v1).
     ====================================================================== */
  var DEPTH = {
    "":     { zIn: -880, zOut: 540 },   // Standardplatte
    "soft": { zIn: -320, zOut: 240 },   // flacher Stapel: Stimmen
    "hero": { zIn: 0,    zOut: 460 },   // vorderste Platte, steht beim Laden
    "hold": { zIn: -560, zOut: 0 }      // letzte Platte: kommt an und bleibt
  };
  var plates = [];

  // Platten unterhalb des Bildes stehen in ihrer natuerlichen Groesse, solange die
  // Kamera sie nicht sehen kann: eine tief gestellte Platte ist verkleinert, und
  // eine verkleinerte Tippflaeche waere zu klein. Die Fahrt beginnt genau an der
  // unteren Bildkante, dort ist der Wechsel nicht sichtbar.
  function parker(tile) {
    return function (self) {
      if (!self.isActive && self.progress <= 0.0001) { tile.style.transform = "none"; tile.style.opacity = ""; }
    };
  }

  function makePlate(tile) {
    var mode = tile.getAttribute("data-tile") || "";
    var lens = tile.parentElement;
    var D = DEPTH[mode] || DEPTH[""];
    // eigene defaults: fremde gsap.defaults kaemen sonst mit Dauer und Verzoegerung herein
    var tl = gsap.timeline({ defaults: { ease: "none", duration: 1, delay: 0 } });
    var park = parker(tile);
    var st;

    if (isPhone) {
      // Telefon: keine Tiefe, kein translateZ, nichts verschwindet - nur Aufstieg.
      tl.fromTo(tile, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power2.out" }, 0);
      st = ScrollTrigger.create({ trigger: lens, start: "top bottom", end: "top 60%", scrub: .35, animation: tl,
        invalidateOnRefresh: true, onRefresh: park, onToggle: park });
      park(st);
      plates.push({ el: tile, st: st, mode: mode });
      return;
    }

    if (mode === "hero") {
      tl.fromTo(tile, { opacity: 1 }, { opacity: 0, duration: .22, ease: "power1.in" }, .34)
        .fromTo(tile, { z: 0 },       { z: D.zOut, duration: .70, ease: "power3.in" }, .30);
      // Die vorderste Platte faehrt an der Kamera vorbei, waehrend der Kapitelkopf
      // dahinter schon aus der Tiefe kommt: ein Zug, keine zwei Auftritte.
      st = ScrollTrigger.create({ trigger: "#hero", start: "top top", end: "bottom top", scrub: .35, animation: tl,
        invalidateOnRefresh: true, onRefresh: park, onToggle: park });
    } else if (mode === "hold") {
      tl.fromTo(tile, { z: D.zIn }, { z: 0, duration: .78, ease: "none" }, 0)
        .fromTo(tile, { opacity: .12 }, { opacity: 1, duration: .34, ease: "none" }, .18);
      st = ScrollTrigger.create({ trigger: lens, start: "top bottom", end: "top 26%", scrub: .35, animation: tl,
        invalidateOnRefresh: true, onRefresh: park, onToggle: park });
    } else {
      // Anfahrt ueber die halbe Strecke, damit die Platte sichtbar aus der Tiefe kommt
      // und nicht schon unter der Bildkante fertig ist; Ausfahrt kurz und blind.
      tl.fromTo(tile, { z: D.zIn }, { z: 0, duration: .55, ease: "none" }, 0)
        .fromTo(tile, { opacity: .12 }, { opacity: 1, duration: .34, ease: "none" }, .16)
        .to(tile, { opacity: 0, duration: .10, ease: "power1.in" }, .74)
        .to(tile, { z: D.zOut, duration: .26, ease: "power3.in" }, .74);
      st = ScrollTrigger.create({ trigger: lens, start: "top bottom", end: "bottom 6%", scrub: .35, animation: tl,
        invalidateOnRefresh: true, onRefresh: park, onToggle: park });
    }

    park(st);
    // Was durchsichtig ist, nimmt keinen Zeiger mehr an: sonst faengt eine
    // unsichtbare Platte Klicks der Platte darunter ab.
    tl.eventCallback("onUpdate", function () {
      var v = (+gsap.getProperty(tile, "opacity") > .5) ? "" : "none";
      if (tile.style.pointerEvents !== v) tile.style.pointerEvents = v;
      park(st);   // nach dem Zuruecklaufen schreibt der Scrub noch nach: hier steht die Platte wieder gerade
    });
    plates.push({ el: tile, st: st, mode: mode });
  }
  $$("[data-tile]").forEach(makePlate);
  window.__vmPlates = plates;   // Messpunkt fuer die Abnahme

  /* --------------------------------- Welle: Zeichen und Gruende aus der Tiefe */
  $$("[data-wave]").forEach(function (grid) {
    var cells = Array.prototype.slice.call(grid.children);
    if (!cells.length) return;
    if (isPhone) {
      gsap.fromTo(cells, { y: 22, opacity: 0 }, {
        y: 0, opacity: 1, duration: 1, ease: "power2.out", stagger: .05,
        scrollTrigger: { trigger: grid, start: "top 94%", end: "top 58%", scrub: .35 }
      });
      return;
    }
    gsap.fromTo(cells, { z: -520, opacity: .1 }, {
      z: 0, opacity: 1, duration: 1, ease: "power2.out", stagger: .06,
      scrollTrigger: { trigger: grid, start: "top 92%", end: "top 40%", scrub: .4 }
    });
  });

  /* ------------------------------------------------------------ Filmplatten */
  $$("[data-case]").forEach(function (scene) {
    var video = $("video", scene);
    if (!video) return;
    var play = function () {
      // Plakat und Film kommen erst, wenn die Platte an der Reihe ist: das erste Bild bleibt leicht
      if (!video.poster && video.dataset.poster) video.poster = video.dataset.poster;
      if (!video.src) video.src = video.dataset.src;
      video.play().catch(function () { /* Autoplay verweigert: Poster bleibt stehen */ });
    };
    var stop = function () { video.pause(); };
    ScrollTrigger.create({
      trigger: scene, start: "top 85%", end: "bottom 15%",
      onEnter: play, onEnterBack: play, onLeave: stop, onLeaveBack: stop
    });
  });

  /* ------------------------------------------------------------ Index links */
  (function () {
    var items = $$(".index__item");
    if (!items.length) return;
    var marks = [];
    var paint = function () {
      var cur = null;
      marks.forEach(function (m) { if (m.active) cur = m; });
      items.forEach(function (a) { a.setAttribute("data-current", cur && a === cur.item ? "true" : "false"); });
    };
    $$("[data-chapter]").forEach(function (sec) {
      var item = $('.index__item[data-for="' + sec.getAttribute("data-chapter") + '"]');
      if (!item) return;
      var mark = { item: item, active: false };
      marks.push(mark);
      ScrollTrigger.create({
        trigger: sec, start: "top 46%", end: "bottom 46%",
        onToggle: function (self) { mark.active = self.isActive; paint(); }
      });
    });
    paint();
  })();

  /* ------------------------------------------- Auftakt: die Kamera stellt scharf */
  (function () {
    var heroIn = $("#heroIn"), vanish = $("#vanish"), index = $("#index");
    var intro = gsap.timeline({ defaults: { ease: "power3.out", duration: .9, delay: 0 } });
    if (vanish) intro.fromTo(vanish, { opacity: 0, scale: .84 }, { opacity: 1, scale: 1, duration: 1.1, ease: "expo.out" }, 0);
    if (heroIn) intro.fromTo(heroIn, { opacity: 0, y: 28 }, { opacity: 1, y: 0 }, .1);
    if (index)  intro.fromTo(index,  { opacity: 0 },        { opacity: 1, duration: .7 }, .35);
    intro.eventCallback("onComplete", function () { ScrollTrigger.refresh(); });
  })();

  /* --------------------------------- Nach dem Laden aller Bilder neu messen */
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
