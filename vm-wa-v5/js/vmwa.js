/* ==========================================================================
   V&M Werbeagentur - V5 "Schrift"
   Ein Gedanke traegt die Seite: jede grosse Zeile wird auf die Spaltenbreite
   gesetzt (fit), und alles, was sich bewegt, bewegt Schrift.
   Scroll laeuft ausschliesslich ueber GSAP ScrollTrigger, kein eigener
   scroll-Listener. Lenis glaettet das Rad und meldet jede Bewegung weiter.
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reduce  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isPhone = window.matchMedia("(max-width: 900px)").matches;
  var canHover = window.matchMedia("(hover: hover)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------- Menü */
  var burger = $("#burger"), menu = $("#menu"), menuClose = $("#menuClose");
  if (burger && menu && menuClose) {
    var setMenu = function (open) {
      menu.dataset.open = open ? "true" : "false";
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
      var first = menu.querySelector("a");
      if (open && first) first.focus();
    };
    burger.addEventListener("click", function () { setMenu(true); });
    menuClose.addEventListener("click", function () { setMenu(false); });
    $$("#menu a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  /* -------------------------------------------------------------- Formular */
  var form = $("#form"), note = $("#note"), send = $("#send");
  var RULES = {
    name:    function (v) { return v.trim().length >= 2 || "Bitte geben Sie Ihren Namen an."; },
    email:   function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Bitte prüfen Sie die E-Mail-Adresse."; },
    tel:     function (v) { return v.trim() === "" || v.trim().length >= 6 || "Diese Telefonnummer ist zu kurz."; },
    message: function (v) { return v.trim().length >= 10 || "Bitte beschreiben Sie Ihr Anliegen kurz."; }
  };
  function checkField(input) {
    var rule = RULES[input.name];
    var field = input.closest("[data-field]");
    if (!rule || !field) return true;
    var res = rule(input.value);
    var err = $("[data-err]", field);
    field.dataset.invalid = res === true ? "false" : "true";
    err.textContent = res === true ? "" : res;
    return res === true;
  }
  if (form && note && send) {
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

  /* ======================================================================
     Satz: jede Zeile mit [data-fit] fuellt die Breite ihrer Spalte.
     Gemessen wird bei 100px, danach einmal linear hochgerechnet - die Breite
     einer Zeile waechst streng linear mit der Schriftgroesse, solange die
     Laufweite in em steht. Passt die Zeile nicht in einer Zeile, wird nach
     dem laengsten Wort gesetzt und umbrochen.
     ====================================================================== */
  function contentWidth(node) {
    var cs = window.getComputedStyle(node);
    return node.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  }
  function fit(el) {
    var box = el.parentElement;
    if (!box) return;
    // data-fit-box="self": nicht die ganze Zeile messen, sondern die eigene
    // Rasterzelle. Das grosse Wort der Leistungen steht nur ueber zwei der drei
    // Spalten - nach der Zeile gesetzt liefe es ueber das Rendering rechts.
    var target;
    if (el.dataset.fitBox === "self") {
      var keep = el.style.width;
      el.style.width = "auto";                 // Blockbreite = Breite der Zelle
      target = el.getBoundingClientRect().width;
      el.style.width = keep;
    } else {
      target = contentWidth(box);
    }
    if (!(target > 0)) return;

    var minPx = parseFloat(el.dataset.fitMin) || (window.innerWidth < 720 ? 20 : 28);
    if (el.classList.contains("svc__word")) minPx = window.innerWidth < 720 ? 34 : 52;
    // data-fit-wrap="always": der Satz wird auf jeder Breite nach dem laengsten
    // Wort gesetzt und umbrochen - ein Block statt einer duennen Zeile.
    if (el.dataset.fitWrap === "always") minPx = Infinity;
    var maxPx = parseFloat(el.dataset.fitMax) || 460;
    // Obergrenze relativ zum Fenster: mit hyphens:auto misst Chromium die
    // min-content-Breite nach der SILBE, nicht nach dem Wort - ohne Deckel
    // wuerde daraus auf dem Telefon eine Wand aus 13 Zeilen.
    var maxVw = parseFloat(el.dataset.fitMaxVw);
    if (maxVw > 0) maxPx = Math.min(maxPx, window.innerWidth * maxVw / 100);

    el.classList.remove("is-wrapped");
    el.style.width = "";
    // Ohne das misst Chromium die min-content-Breite Buchstabe fuer Buchstabe
    // (geerbtes overflow-wrap: break-word) - das laengste Wort waere dann ein "I".
    el.style.overflowWrap = "normal";
    el.style.wordBreak = "normal";
    // max-width: 100% wuerde die Messung auf die Spaltenbreite kappen - beim Messen
    // muss der Kasten frei sein, sonst misst man die Spalte statt der Zeile.
    el.style.maxWidth = "none";
    el.style.fontSize = "100px";

    var oneLine = el.getBoundingClientRect().width;
    if (!(oneLine > 0)) { el.style.maxWidth = ""; return; }
    var size = 100 * target / oneLine;

    if (size < minPx) {                    // zu lang: nach dem laengsten Wort setzen
      el.classList.add("is-wrapped");
      el.style.width = "min-content";
      var longest = el.getBoundingClientRect().width;
      el.style.width = "";
      // Nach dem laengsten Wort setzen. Keine Untergrenze mehr: minPx entscheidet
      // nur, OB umbrochen wird - danach gilt, was in die Spalte passt.
      // 0.5 % Luft, sonst bricht das laengste Wort bei Rundung doch noch um.
      size = longest > 0 ? 100 * target / longest * .995 : minPx;
    }
    size = Math.min(size, maxPx);
    el.style.maxWidth = "";
    el.style.fontSize = size.toFixed(2) + "px";
    // Messhilfen wieder abraeumen: ob ein Wort brechen darf, entscheidet ab
    // jetzt das Stylesheet (auf schmalen Schirmen mit Trennstrich).
    el.style.overflowWrap = "";
    el.style.wordBreak = "";

    // Konturstaerke mitwachsen lassen, sonst wirkt das grosse Wort duenn.
    var stroke = parseFloat(window.getComputedStyle(el).webkitTextStrokeWidth) || 0;
    if (stroke > 0) {
      var k = parseFloat(el.dataset.fitStroke) || 0.018;
      el.style.webkitTextStrokeWidth = Math.max(1.2, Math.min(6, size * k)).toFixed(2) + "px";
    }
  }
  function fitAll() { $$("[data-fit]").forEach(fit); }

  /* -------- Buchstaben einzeln: nur im Helden, dort tragen sie die Bewegung */
  function splitLetters(el) {
    // Buchstaben einzeln, aber wortweise gebuendelt: sonst gilt jedes Zeichen
    // als eigene Umbruchstelle und die min-content-Messung liefert ein "I".
    var words = el.textContent.trim().split(/\s+/), out = [];
    el.textContent = "";
    words.forEach(function (word, wi) {
      var box = document.createElement("span");
      box.className = "w";
      for (var i = 0; i < word.length; i++) {
        var s = document.createElement("span");
        s.className = "l"; s.textContent = word.charAt(i);
        box.appendChild(s); out.push(s);
      }
      el.appendChild(box);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    return out;
  }
  function splitWords(el) {
    var words = el.textContent.trim().split(/\s+/), out = [], frag = document.createDocumentFragment();
    words.forEach(function (w, i) {
      var s = document.createElement("span");
      s.className = "wd"; s.textContent = w;
      frag.appendChild(s); out.push(s);
      if (i < words.length - 1) frag.appendChild(document.createTextNode(" "));
    });
    el.textContent = ""; el.appendChild(frag);
    return out;
  }

  var heroTitle = $("#heroTitle");
  var line1 = $(".hero__line--1"), line2 = $(".hero__line--2");
  // Der Vorlesende bekommt den ganzen Satz, nicht 31 Einzelbuchstaben.
  if (heroTitle && line1 && line2) {
    heroTitle.setAttribute("aria-label", (line1.textContent + " " + line2.textContent).replace(/\s+/g, " ").trim());
    line1.setAttribute("aria-hidden", "true");
    line2.setAttribute("aria-hidden", "true");
  }
  var l1 = line1 ? splitLetters(line1) : [], l2 = line2 ? splitLetters(line2) : [];
  var voiceWords = $$("[data-words]").map(function (q) { return splitWords(q); });

  /* -------- Der Kristall sitzt in der Fuge zwischen den beiden Zeilen ----- */
  var crystal = $("#heroCrystal");
  function placeCrystal() {
    if (!crystal || !line1) return;
    if (window.getComputedStyle(crystal).position !== "absolute") { crystal.style.top = ""; return; }
    var seam = line1.offsetTop + line1.offsetHeight;
    var over = parseFloat(crystal.dataset.seam) || 0.44;   // Anteil, der ueber der Naht steht
    crystal.style.top = Math.round(seam - crystal.offsetHeight * over) + "px";
  }

  function layoutAll() { fitAll(); placeCrystal(); layoutKnock(); }

  /* -------- Das ausgestanzte Wort der Projekt-Szene ---------------------- */
  var knock = $("#knock"), knockWord = $("#knockWord"), knockField = $("#knockField"), knockPlate = $("#knockPlate"), knockEdge = $("#knockEdge");
  function layoutKnock() {
    if (!knock || !knockWord) return;
    var stage = knock.parentElement;
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!(w > 0 && h > 0)) return;
    knock.setAttribute("viewBox", "0 0 " + w + " " + h);
    [knockWord, knockEdge].forEach(function (t) {
      if (!t) return;
      t.setAttribute("x", w / 2); t.setAttribute("y", h / 2);
    });
    [knockField, knockPlate, $("#knockMask")].forEach(function (r) {
      if (!r) return;
      r.setAttribute("x", -w * 2); r.setAttribute("y", -h * 2);
      r.setAttribute("width", w * 5); r.setAttribute("height", h * 5);
    });
    knockWord.setAttribute("font-size", 100);
    var len = knockWord.getComputedTextLength ? knockWord.getComputedTextLength() : 0;
    if (len > 0) {
      var fs = (100 * (w * (isPhone ? 0.92 : 0.84)) / len).toFixed(2);
      knockWord.setAttribute("font-size", fs);
      if (knockEdge) knockEdge.setAttribute("font-size", fs);
    }
  }

  layoutAll();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      layoutAll();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }

  /* -------- Videos: erst laden, wenn sie an der Reihe sind --------------- */
  function videosStatic() {   // Weg ohne Bewegung: sichtbar, aber nichts spielt von selbst
    $$("video[data-src]").forEach(function (v) {
      v.setAttribute("controls", "");
      v.preload = "metadata";
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) { if (!v.src) v.src = v.dataset.src; io.disconnect(); }
          });
        }, { rootMargin: "300px" });
        io.observe(v);
      } else if (!v.src) { v.src = v.dataset.src; }
    });
  }

  /* -------- Neu messen, wenn sich die Breite aendert --------------------- */
  var lastW = window.innerWidth, tid = 0;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastW) return;   // Hoehe allein (Adressleiste) messen wir nicht neu
    lastW = window.innerWidth;
    window.clearTimeout(tid);
    tid = window.setTimeout(function () {
      layoutAll();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }, 160);
  });

  /* ------------------------------------------------ Ohne Bewegung: Schluss */
  if (reduce) {
    var c0 = $("#curtain");
    if (c0) c0.remove();
    videosStatic();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ------------------------------------------------------- Weicher Scroll */
  var lenis = new Lenis({ duration: 1.05, smoothWheel: true, touchMultiplier: 1.6 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -Math.max(64, parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 72) });
    });
  });

  /* -------------------------------------------------------------- Vorhang
     Jeder Schritt haengt an seinem Knoten: auf einer Unterseite fehlen
     Abschnitte der Startseite, und ein fehlender Knoten darf nichts kosten. */
  var letters = l1.concat(l2);
  var heroFoot = $(".hero__foot"), heroGlow = $(".hero__glow");
  if (letters.length) gsap.set(letters, { yPercent: 55, opacity: 0 });
  if (crystal) gsap.set(crystal, { opacity: 0, scale: .86 });
  var curtain = $("#curtain");
  if (curtain) {
    var intro = gsap.timeline({ onComplete: function () { curtain.remove(); ScrollTrigger.refresh(); } });
    intro.to(".curtain__mark", { opacity: 1, duration: .45, ease: "power2.out" })
         .to(".curtain__bar", { scaleX: 1, duration: .6, ease: "power2.inOut" }, "-=.25")
         .to(curtain, { yPercent: -100, duration: .8, ease: "expo.inOut" }, "+=.05");
    if (l1.length) intro.to(l1, { yPercent: 0, opacity: 1, duration: .95, stagger: .028, ease: "expo.out" }, "-=.55");
    if (l2.length) intro.to(l2, { yPercent: 0, opacity: 1, duration: .95, stagger: .028, ease: "expo.out" }, "-=.80");
    if (crystal) intro.fromTo(crystal, { opacity: 0, scale: .86 },
             { opacity: 1, scale: 1, duration: 1.1, ease: "expo.out", immediateRender: false }, "-=.95");
    if (heroFoot) intro.fromTo(heroFoot, { y: 24, opacity: 0 },
             { y: 0, opacity: 1, duration: .8, ease: "power3.out", immediateRender: false }, "-=.65");
  }

  /* ------------------------------------------ Fortschritt am oberen Rand */
  if ($("#progress")) {
    gsap.to("#progress", {
      scaleX: 1, ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: .3 }
    });
  }

  /* ============================================================== 1. Held
     Die beiden gesetzten Zeilen fahren auseinander, der Kristall bleibt in
     der Fuge und kommt naeher: der Text gibt ihn frei, statt zu verschwinden. */
  var heroSec = $("#hero"), heroStage = $("#heroStage");
  if (heroSec && heroStage && line1 && line2) {
    var heroTl = gsap.timeline({ defaults: { immediateRender: false } })
      .fromTo(line1, { xPercent: 0 }, { xPercent: -15, ease: "none" }, 0)
      .fromTo(line2, { xPercent: 0 }, { xPercent: 15, ease: "none" }, 0);
    if (l1.length) heroTl.fromTo(l1, { x: 0 }, { x: function (i) { return -(i + 1) * 3; }, ease: "none" }, 0);
    if (l2.length) heroTl.fromTo(l2, { x: 0 }, { x: function (i, t, arr) { return (arr.length - i) * 3; }, ease: "none" }, 0);
    if (crystal)  heroTl.fromTo(crystal, { scale: 1, y: 0 }, { scale: 1.22, y: -30, ease: "none" }, 0);
    if (heroFoot) heroTl.fromTo(heroFoot, { y: 0, opacity: 1 }, { y: 55, opacity: 0, ease: "none" }, 0);
    if (heroGlow) heroTl.fromTo(heroGlow, { scale: 1, opacity: 1 }, { scale: 1.45, opacity: .45, ease: "none" }, 0);
    ScrollTrigger.create({
      // Auf der Unterseite ist die Fahrt kuerzer: das Markup sagt, wie lang.
      trigger: heroSec, start: "top top", end: "+=" + (heroSec.dataset.pin || "95%"),
      pin: heroStage, pinSpacing: true,
      scrub: .6, invalidateOnRefresh: true, animation: heroTl
    });
  }

  /* ============================================================== 2. Band
     Zwei Reihen laufen gegeneinander; das Tempo haengt am Scroll.          */
  (function () {
    var loops = [];
    $$(".belt__row").forEach(function (row, idx) {
      var track = $(".belt__track", row);
      var half = track.scrollWidth / 2;
      if (!(half > 0)) return;
      var back = idx % 2 === 1;
      gsap.set(track, { x: back ? -half : 0 });
      loops.push(gsap.to(track, {
        x: back ? 0 : -half, duration: 30, ease: "none", repeat: -1,
        modifiers: { x: function (x) { return gsap.utils.wrap(-half, 0, parseFloat(x)) + "px"; } }
      }));
    });
    if (!loops.length) return;
    ScrollTrigger.create({
      trigger: "#belt", start: "top bottom", end: "bottom top",
      onUpdate: function (self) {
        var v = gsap.utils.clamp(-5, 5, self.getVelocity() / 300);
        var s = 1 + Math.abs(v);
        loops.forEach(function (lp) { lp.timeScale(self.direction === -1 ? -s : s); });
      },
      onLeave: function () { loops.forEach(function (lp) { lp.timeScale(1); }); },
      onLeaveBack: function () { loops.forEach(function (lp) { lp.timeScale(1); }); }
    });
  })();

  /* ======================================================== 3. Leistungen
     Jedes Wort fuellt sich mit der Marke, waehrend es durch die Mitte laeuft. */
  $$("[data-svc]").forEach(function (row) {
    var word = $(".svc__word", row), obj = $(".svc__obj", row);
    var p = { v: 0 };
    gsap.to(p, {
      v: 100, ease: "none",
      scrollTrigger: { trigger: word, start: "top 88%", end: "top 36%", scrub: .5 },
      onUpdate: function () { word.style.setProperty("--p", p.v.toFixed(1) + "%"); }
    });
    if (obj) {
      gsap.fromTo(obj, { yPercent: 20 }, {
        yPercent: -20, ease: "none",
        scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: 1 }
      });
    }
    gsap.fromTo(row.querySelectorAll(".svc__num, .svc__meta p, .svc__meta .link"),
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: .8, stagger: .06, ease: "power3.out",
        scrollTrigger: { trigger: row, start: "top 84%" } });
  });

  /* =========================================================== 4. Projekte
     Erst ist der Film nur in den Buchstaben zu sehen; das Wort waechst, bis
     es den Rahmen sprengt, dann bleibt der Film und die Glastafel kommt.    */
  var scenes = $$("[data-case]");
  scenes.forEach(function (scene, i) {
    var video = $("video", scene);
    var panel = $(".case__panel", scene);
    var isOpen = scene.dataset.open === "true";

    ScrollTrigger.create({
      trigger: scene, start: "top 90%", end: "bottom top",
      onEnter: function () {
        if (!video.src) video.src = video.dataset.src;
        video.play().catch(function () { /* Autoplay verweigert: erster Rahmen bleibt stehen */ });
      },
      onEnterBack: function () { video.play().catch(function () {}); },
      onLeave: function () { video.pause(); },
      onLeaveBack: function () { video.pause(); }
    });

    if (isOpen) {
      // Auf dem Telefon ist das Wort klein (345 x 46 px von 375 x 812), der Film
      // also lange nur in acht Buchstaben zu sehen: dort laeuft die Oeffnung
      // ueber 62 % der Fensterhoehe statt 105 %, und das Wachsen ist frueher
      // fertig. Sonst steht die Tafel erst, wenn die naechste Szene schon
      // hochkommt (gemessen: voll bei 809 px, Szene zwei ab 771 px).
      var span = isPhone ? 62 : 105;
      var grow = isPhone ? .42 : .58;
      var tl = gsap.timeline({
        scrollTrigger: { trigger: scene, start: "top top", end: "+=" + span + "%", scrub: .55, invalidateOnRefresh: true }
      });
      tl.fromTo([knockWord, knockEdge], { scale: 1, transformOrigin: "50% 50%" },
                { scale: 17, ease: "power1.in", duration: grow }, 0)
        .fromTo(video, { scale: 1.14 }, { scale: 1, ease: "none", duration: grow + .20 }, 0)
        .fromTo([knockPlate, knockEdge], { opacity: 1 }, { opacity: 0, ease: "none", duration: .14 }, grow)
        // Die Tafel kommt in zwei Schritten: erst wird die Flaeche dicht, dann
        // erst erscheint die Schrift darauf. So steht kein Buchstabe je auf
        // halbdurchsichtigem Glas ueber dem laufenden Film.
        .fromTo(panel, { y: 60 }, { y: 0, ease: "power3.out", duration: .22 }, grow + .16)
        .fromTo(panel, { opacity: 0 }, { opacity: 1, ease: "none", duration: .06 }, grow + .16)
        .fromTo(panel.children, { opacity: 0 }, { opacity: 1, ease: "none", duration: .10 }, grow + .23);
    } else {
      gsap.fromTo(video, { scale: 1.14 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: scene, start: "top bottom", end: "top top", scrub: 1 }
      });
      // Auch hier zuerst die Flaeche, dann die Schrift. Die Flaeche ist nach
      // 0,12 s dicht, die Schrift kommt danach und ist schnell da: bei einer
      // langsamen Blende stand die dritte Tafel im Querformat-Telefon noch
      // halb leer, wenn die Szene schon wieder wegfuhr (gemessen 844x390).
      gsap.timeline({ defaults: { ease: "none", duration: 1, delay: 0 },
                      scrollTrigger: { trigger: scene, start: "top 45%" } })
        .fromTo(panel, { y: 60 }, { y: 0, duration: 1, ease: "expo.out" }, 0)
        .fromTo(panel, { opacity: 0 }, { opacity: 1, duration: .12 }, 0)
        .fromTo(panel.children, { opacity: 0 }, { opacity: 1, duration: .45, ease: "expo.out" }, .12);
      gsap.fromTo($(".case__idx", scene), { y: 30, opacity: 0 }, {
        y: 0, opacity: 1, duration: .9, ease: "power3.out",
        scrollTrigger: { trigger: scene, start: "top 55%" }
      });
    }

    // Die weichende Szene wird abgedunkelt, nicht durchsichtig gemacht:
    // durchsichtig hiesse, die naechste Szene scheint durch und der Text doppelt.
    if (i < scenes.length - 1) {
      var recede = { trigger: scenes[i + 1], start: "top bottom", end: "top top", scrub: true };
      gsap.fromTo($(".case__veil", scene), { opacity: 0 }, { opacity: .82, ease: "none", scrollTrigger: recede });
      gsap.fromTo($(".case__media", scene), { scale: 1 }, { scale: 1.05, ease: "none", scrollTrigger: recede });
    }
  });

  /* ============================================================= 5. Kunden */
  if ($("#names") && $$(".name").length) {
    gsap.fromTo(".name", { y: 26, opacity: 0 }, {
      y: 0, opacity: 1, duration: .7, stagger: .05, ease: "power3.out",
      scrollTrigger: { trigger: "#names", start: "top 82%" }
    });
  }
  if ($(".clients__grid") && $$(".clients__cell").length) {
    gsap.fromTo(".clients__cell", { y: 26, opacity: 0 }, {
      y: 0, opacity: 1, duration: .7, stagger: .04, ease: "power3.out",
      scrollTrigger: { trigger: ".clients__grid", start: "top 84%" }
    });
  }

  /* ============================================================ 6. Stimmen
     Die Zitate setzen sich Wort fuer Wort; immer nur eines steht im Feld.   */
  (function () {
    var stack = $$("[data-voice]");
    if (!stack.length) return;

    if (isPhone || !$("#voicesWrap")) {                       // auf dem Telefon kein Festhalten
      stack.forEach(function (v, i) {
        gsap.fromTo(voiceWords[i], { opacity: .62 }, {
          opacity: 1, duration: .5, stagger: .02, ease: "none",
          scrollTrigger: { trigger: v, start: "top 88%" }
        });
      });
      return;
    }

    gsap.set(stack.slice(1), { opacity: 0 });
    var tl = gsap.timeline({
      scrollTrigger: { trigger: "#voicesWrap", start: "top top", end: "bottom bottom", scrub: .5 }
    });
    stack.forEach(function (v, i) {
      var words = voiceWords[i];
      if (i > 0) tl.fromTo(v, { opacity: 0 }, { opacity: 1, duration: .04, ease: "none" }, i);
      // Der Satz setzt sich im ersten Fuenftel des Abschnitts und steht danach
      // voll: gemessen auf 1440 waren vorher 143 px der Bahn eines Zitats
      // gedaempft (Ruhewert .62) und nur 160 px ganz - jetzt 49 px gegen 152 px.
      // Der Ruhewert .62 bleibt der Startwert: ein Wort ist nie fort, sondern
      // gedaempft, sonst meldet jede Pruefung "nie sichtbar".
      tl.fromTo(words, { opacity: .62 }, {
        opacity: 1, ease: "none", duration: .06,
        stagger: { each: .16 / Math.max(1, words.length) }
      }, i + .02);
      tl.fromTo($(".voice__mark", v), { opacity: 0 }, { opacity: .07, duration: .3, ease: "none" }, i + .05);
      if (i < stack.length - 1) {
        tl.fromTo(v, { opacity: 1 }, { opacity: 0, duration: .12, ease: "none", immediateRender: false }, i + .88);
      }
    });
    tl.to({}, { duration: .02 }, stack.length - .02);   // Endanschlag der Zeitlinie
  })();

  /* ========================================================== 7. Aktuelles
     Das Bild des Beitrags kommt an den Zeiger, die Zeile bleibt Schrift.    */
  if (!isPhone && canHover) {
    $$("[data-post]").forEach(function (post) {
      var peek = $(".post__peek", post);
      if (!peek) return;
      gsap.set(peek, { scale: .94 });
      var xTo = gsap.quickTo(peek, "x", { duration: .5, ease: "power3" });
      var yTo = gsap.quickTo(peek, "y", { duration: .5, ease: "power3" });
      post.addEventListener("pointermove", function (e) {
        var r = post.getBoundingClientRect();
        xTo(e.clientX - r.left - peek.offsetWidth / 2);
        yTo(e.clientY - r.top - peek.offsetHeight / 2);
      });
      post.addEventListener("pointerenter", function () {
        gsap.set(peek, { display: "block" });
        gsap.to(peek, { opacity: 1, scale: 1, duration: .4, ease: "power3.out" });
      });
      post.addEventListener("pointerleave", function () {
        gsap.to(peek, { opacity: 0, scale: .94, duration: .35, ease: "power2.out",
                        onComplete: function () { gsap.set(peek, { display: "none" }); } });
      });
    });
  }

  /* ============================================================ 8. Kontakt */
  if ($(".contact__word") && $("#kontakt")) {
    gsap.fromTo(".contact__word", { yPercent: 10 }, {
      yPercent: -10, ease: "none",
      scrollTrigger: { trigger: "#kontakt", start: "top bottom", end: "bottom bottom", scrub: 1 }
    });
  }

  /* ======================================================================
     Drei Handgriffe fuer Abschnitte, die es nur auf Unterseiten gibt.
     Sie haengen an Attributen, nicht an Klassen: wo das Attribut fehlt,
     passiert nichts - die Startseite merkt davon nichts.
     ====================================================================== */

  /* [data-fill] - die Zeile fuellt sich mit der Marke, waehrend sie durch
     die Mitte laeuft (derselbe Griff wie bei den Leistungen). */
  $$("[data-fill]").forEach(function (el) {
    var p = { v: 0 };
    gsap.to(p, {
      v: 100, ease: "none",
      scrollTrigger: { trigger: el, start: "top 88%", end: "top 36%", scrub: .5 },
      onUpdate: function () { el.style.setProperty("--p", p.v.toFixed(1) + "%"); }
    });
  });

  /* [data-par] - das Rendering geht langsamer als der Text. */
  $$("[data-par]").forEach(function (el) {
    var box = el.closest("article") || el.parentElement;
    gsap.fromTo(el, { yPercent: isPhone ? 8 : 16 }, {
      yPercent: isPhone ? -8 : -16, ease: "none",
      scrollTrigger: { trigger: box, start: "top bottom", end: "bottom top", scrub: 1 }
    });
  });

  /* [data-step] - die Kinder des Kastens kommen nacheinander. */
  $$("[data-step]").forEach(function (box) {
    var kids = Array.prototype.slice.call(box.children);
    if (!kids.length) return;
    gsap.fromTo(kids, { y: 26, opacity: 0 }, {
      y: 0, opacity: 1, duration: .7, stagger: .07, ease: "power3.out",
      scrollTrigger: { trigger: box, start: "top 84%" }
    });
  });

  /* ------------------------------------- Allgemeines Auftauchen (.rise) */
  $$(".rise").forEach(function (el) {
    gsap.to(el, {
      opacity: 1, y: 0, duration: .9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 86%" }
    });
  });

  window.addEventListener("load", function () {
    layoutAll();
    ScrollTrigger.refresh();
  });
})();
