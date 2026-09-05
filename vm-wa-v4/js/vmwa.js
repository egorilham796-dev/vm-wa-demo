/* ==========================================================================
   V&M Werbeagentur - Variante 4 "Blenden"
   Alles Scroll-Getriebene laeuft ueber GSAP ScrollTrigger, kein eigener
   scroll-Listener. Lenis glaettet das Rad und meldet jede Bewegung an
   ScrollTrigger.

   Buehne: acht Szenen liegen deckungsgleich uebereinander, die Buehne haengt
   per position:sticky im Bild. Der Scroll waehlt aus, welche Szene offen ist.
   Der Schnitt ist ein laufender Zuschnitt: die Szene steht, ihr clip-path
   faehrt als Diagonale durchs Bild, davor die Markenkante. Nichts wird
   verschoben - dadurch steht jede Zeile immer in ihrem eigenen Ausschnitt.
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.add("js");
  /* Die Blende laeuft als gerechneter clip-path - so steht sie im Auftrag.
     Gemessen auf 1920x1080 ueber einem laufenden Film: gleiche Rahmenzeit wie
     der billigere Weg. Fuer schwache Rechner bleibt dieser zweite Weg als
     ?wipe=fast erhalten: ein Blatt mit festem Zuschnitt, das nur verschoben wird. */
  var fastMode = /(\?|&)wipe=fast(&|$)/.test(window.location.search);
  var clipMode = !fastMode;
  if (clipMode) document.documentElement.classList.add("w-clip");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };

  /* ------------------------------------------------- Bilder und Filme laden
     Nichts ausser dem Held haengt beim Start am Netz: die Szenen liegen zwar
     alle im Bild, ihre Quellen werden erst kurz vor dem Schnitt gesetzt.      */
  function hydrate(root, skipTiles) {
    $$("[data-src]", root || document).forEach(function (el) {
      if (!el.dataset.src) return;
      if (skipTiles && el.closest("[data-tile]")) return;   /* Tafeln laden einzeln */
      el.src = el.dataset.src;
      el.removeAttribute("data-src");
    });
  }

  /* ---------------------------------------------------------------- Menue
     Jeder Block hier prueft seine Knoten: dieselbe Datei bedient die
     Startseite und die Unterseite, und die Unterseite hat weniger Szenen.  */
  var burger = $("#burger"), menu = $("#menu"), menuClose = $("#menuClose");
  var navPark = null;                      /* wird unten gesetzt: Kopfzeile zeigen/verstecken */
  function setMenu(open) {
    if (!menu || !burger) return;
    menu.dataset.open = open ? "true" : "false";
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
    if (navPark) navPark(false);            /* nach dem Menue steht der Kopf wieder im Bild */
    if (open) menu.querySelector("a").focus();
  }
  if (burger) burger.addEventListener("click", function () { setMenu(true); });
  if (menuClose) menuClose.addEventListener("click", function () { setMenu(false); });
  $$("#menu a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

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
  $$("#form input, #form textarea").forEach(function (el) {
    if (!RULES[el.name]) return;
    el.addEventListener("blur", function () { checkField(el); });
    el.addEventListener("input", function () {
      if (el.closest("[data-field]").dataset.invalid === "true") checkField(el);
    });
  });
  if (form) form.addEventListener("submit", function (e) {
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

  /* ------------------------------------------- Ohne Bewegung: hier ist Schluss
     Kein ScrollTrigger, keine Blende, alles steht offen und geladen da.       */
  if (reduce) {
    var c0 = $("#curtain");
    if (c0) c0.remove();
    hydrate(document);
    $$("video[src]").forEach(function (v) { v.removeAttribute("autoplay"); });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ------------------------------------------------------- Weicher Scroll */
  var lenis = new Lenis({ duration: 1.05, smoothWheel: true, touchMultiplier: 1.6 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);

  var acts   = $("#acts");
  var stage  = $("#stage");
  var scenes = stage ? $$(".scene", stage) : [];
  var lens   = scenes.map(function (s) { return parseFloat(s.dataset.len) || 1; });

  function docTop(el) {
    var r = el.getBoundingClientRect();
    return r.top + (window.pageYOffset || document.documentElement.scrollTop || 0);
  }
  function navH() {
    return parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h"), 10) || 72;
  }

  /* Zustand der Buehne, damit Ankerlinks wissen, wohin sie springen */
  var S = { on: false, offs: [], step: 0, wipe: 0, total: 0, idx: 0, base: 0 };

  /* ---------------------------------------------------------- Ankerlinks */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var hash = a.getAttribute("href");
      if (hash.length < 2) return;
      var el = document.querySelector(hash);
      if (!el) return;
      e.preventDefault();
      var i = scenes.indexOf(el);
      if (S.on && i >= 0) lenis.scrollTo(S.base + S.offs[i] + S.wipe * 0.92, { duration: 1.1 });
      else lenis.scrollTo(el, { offset: -navH(), duration: 1.1 });
    });
  });

  /* ------------------------------------------- Tastatur: der Fokus zieht die Szene
     Auf der Buehne liegen alle acht Szenen im Bild. Springt der Fokus in eine,
     die gerade nicht offen ist, faehrt die Buehne dorthin - sonst wandert der
     Fokus fuer den Benutzer unsichtbar weiter.                                */
  if (stage) stage.addEventListener("focusin", function (e) {
    if (!S.on) return;
    var sc = e.target.closest(".scene");
    if (!sc) return;
    var i = scenes.indexOf(sc);
    if (i < 0 || i === S.idx) return;
    lenis.scrollTo(S.base + S.offs[i] + S.wipe * .92, { duration: .5 });
  });

  /* ------------------------------------------------ Zeilen in Woerter zerlegen */
  function split(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    return words.map(function (w, i) {
      var outer = document.createElement("span");
      outer.className = "w";
      var inner = document.createElement("span");
      inner.textContent = w;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      return inner;
    });
  }
  var heroWords = [];
  $$("[data-split]").forEach(function (el) { heroWords = heroWords.concat(split(el)); });
  gsap.set(heroWords, { yPercent: 115 });

  /* --------------------------------------------------------------- Vorhang
     Die Seite oeffnet mit genau der Bewegung, die spaeter jeden Schnitt macht. */
  (function () {
    var curtain = $("#curtain");
    if (!curtain) return;
    var vw = function () { return window.innerWidth / 100; };
    gsap.timeline({ onComplete: function () { curtain.remove(); ScrollTrigger.refresh(); } })
      .to(".curtain__mark", { opacity: 1, duration: .42, ease: "power2.out" })
      .to(".curtain__mark", { opacity: 0, duration: .3, ease: "power2.in" }, "+=.18")
      .to([".curtain__plate", ".curtain__edge"], {
        x: function () { return -106 * vw(); }, duration: .95, ease: "expo.inOut"
      }, "-=.1")
      .to(heroWords, { yPercent: 0, duration: .9, stagger: .05, ease: "expo.out" }, "-=.62")
      .from(".hero__foot", { yPercent: 26, opacity: 0, duration: .7, ease: "power3.out" }, "-=.5");
  })();

  /* ------------------------------------------------------------ Laufband
     Zwei gleiche Saetze, deshalb ist die halbe Spur genau xPercent -50:
     das haengt nicht daran, ob die Schrift schon geladen war.               */
  function marquee(where) {
    var track = $("#bandTrack");
    if (!track) return;
    var loop = gsap.to(track, {
      xPercent: -50, duration: 24, ease: "none", repeat: -1,
      modifiers: { xPercent: function (x) { return gsap.utils.wrap(-50, 0, parseFloat(x)) + "%"; } }
    });
    loop.pause();
    var cfg = {
      onUpdate: function (self) {
        var v = gsap.utils.clamp(-6, 6, self.getVelocity() / 280);
        loop.timeScale(self.direction === -1 ? -(1 + Math.abs(v)) : 1 + Math.abs(v));
      },
      onToggle: function (self) { if (self.isActive) loop.play(); else { loop.pause(); loop.timeScale(1); } }
    };
    for (var k in where) cfg[k] = where[k];
    ScrollTrigger.create(cfg);
  }

  /* ---------------------------------------------- Auftauchen der Kontaktseite */
  function rises() {
    if ($("#kontakt")) ScrollTrigger.create({
      trigger: "#kontakt", start: "top bottom+=30%",
      onEnter: function () { hydrate($("#kontakt")); },
      onEnterBack: function () { hydrate($("#kontakt")); }
    });
    $$(".rise").forEach(function (el) {
      gsap.to(el, { opacity: 1, y: 0, duration: .85, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" } });
    });
  }

  /* ------------------------------------------ Kopfzeile: sie weicht dem Text
     Der Kopf steht fest im Bild und legte sich beim Lesen ueber die Zeile
     darunter - gesehen auf 375: "Nehmen Sie" lag zur Haelfte hinter der
     milchigen Leiste. Beim Vorwaertslesen faehrt er darum aus dem Bild und
     kommt zurueck, sobald zurueckgerollt wird oder der Anfang der Seite im
     Bild ist. Kein eigener scroll-Hoerer: derselbe ScrollTrigger wie alles. */
  (function () {
    var nav = $(".nav");
    if (!nav) return;
    var away = false;
    navPark = function (v) {
      if (v === away) return;
      away = v;
      gsap.to(nav, { yPercent: v ? -105 : 0, duration: .38, ease: "power3.out" });
    };
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: function (self) {
        if (menu && menu.dataset.open === "true") return navPark(false);
        if (self.scroll() < navH() * 1.6) return navPark(false);
        navPark(self.direction === 1);
      }
    });
  })();

  var mm = gsap.matchMedia();

  /* ==========================================================================
     Die Buehne mit acht Szenen und sieben Blenden - nur wo sie hineinpasst.
     Gemessen: unter 1024x740 stoesst der Text der Leistungstafeln an die
     Unterkante seiner Tafel. Darunter uebernimmt die fliessende Ordnung.
     ========================================================================== */
  mm.add("(min-width: 1024px) and (min-height: 740px)", function () {
    if (!acts || !scenes.length) return;

    function relayout() {
      S.base = docTop(acts);
      S.step = window.innerHeight * 0.92;
      S.wipe = S.step * 0.55;
      var acc = 0;
      S.offs = lens.map(function (l) { var o = acc; acc += l * S.step; return o; });
      S.total = acc;
      acts.style.setProperty("--room", S.total + "px");
    }
    relayout();
    S.on = true;
    ScrollTrigger.addEventListener("refreshInit", relayout);

    var vw = function () { return window.innerWidth / 100; };
    var at = function (i, extra) { return S.base + S.offs[i] + (extra || 0); };

    /* ---- Die sieben Schnitte ------------------------------------------- */
    scenes.forEach(function (sc, i) {
      var dir = sc.dataset.wipe;
      if (!dir) return;
      var sheet = $(".scene__sheet", sc), inner = $(".scene__in", sc), edge = $(".scene__edge", sc);
      var from = dir === "r" ?  118 : -18;
      var to   = dir === "r" ? -46  : 146;

      var tl = gsap.timeline({
        scrollTrigger: {
          start: function () { return at(i); },
          end:   function () { return at(i) + S.wipe; },
          scrub: true, invalidateOnRefresh: true
        }
      });
      if (clipMode) {
        tl.fromTo(sc, { "--w": 0 }, { "--w": 1, ease: "none", duration: 1 }, 0);
        /* Derselbe Zeitstrahl meldet der vorigen Szene, wie weit sie zugedeckt
           ist. Am Ende steht sie vollstaendig hinter dieser hier und wird aus
           dem Bild genommen (Regel im Stylesheet): eine Szene, die niemand
           sieht, faengt weder Licht noch Zeiger. Beides aus einem Zeitstrahl -
           so koennen die zwei Werte nie auseinanderlaufen. */
        if (scenes[i - 1]) tl.fromTo(scenes[i - 1], { "--wnext": 0 },
                                     { "--wnext": 1, ease: "none", duration: 1 }, 0);
      } else {
        tl.fromTo([sheet, edge], { x: function () { return from * vw(); } },
                                 { x: function () { return to * vw(); }, ease: "none", duration: 1 }, 0)
          .fromTo(inner,         { x: function () { return -from * vw(); } },
                                 { x: function () { return -to * vw(); }, ease: "none", duration: 1 }, 0);
      }
    });

    /* ---- Laden und Filme ------------------------------------------------ */
    scenes.forEach(function (sc, i) {
      ScrollTrigger.create({
        start: function () { return at(i) - window.innerHeight * .5; },
        end:   function () { return S.base + S.total; },
        invalidateOnRefresh: true,
        onEnter: function () { hydrate(sc); },
        onEnterBack: function () { hydrate(sc); }
      });

      var video = $("video", sc);
      if (!video) return;
      ScrollTrigger.create({
        start: function () { return at(i); },
        end:   function () { return i + 1 < scenes.length ? at(i + 1) : S.base + S.total; },
        invalidateOnRefresh: true,
        onToggle: function (self) {
          if (self.isActive) {
            if (!video.src && video.dataset.src) hydrate(sc);
            video.play().catch(function () { /* Autoplay verweigert: Standbild bleibt */ });
          } else { video.pause(); }
        }
      });
    });

    /* ---- 01 Held: die Kamera setzt sich in Bewegung, bevor geschnitten wird */
    (function () {
      var tl = gsap.timeline({
        scrollTrigger: { start: function () { return at(0); }, end: function () { return at(1); },
                         scrub: true, invalidateOnRefresh: true }
      });
      var move = function (sel, from, to) { if ($(sel)) tl.fromTo(sel, from, to, 0); };
      /* Die Zeilen laufen auseinander, aber nur so weit, wie neben ihnen Platz
         ist: auf der Unterseite steht die erste Zeile am Rand des Satzspiegels,
         dort waeren 44px genau 3px zu viel. Gemessen wird die Luft selbst. */
      var leadRoom = function () {
        var l = $(".hero__title .line:first-child");
        if (!l) return 0;
        return l.getBoundingClientRect().left + parseFloat(getComputedStyle(l).paddingLeft || 0);
      };
      var tailRoom = function () {
        var ws = $$(".hero__title .line--2 .w");
        if (!ws.length) return 0;
        return window.innerWidth - ws[ws.length - 1].getBoundingClientRect().right;
      };
      move("#crystal", { x: 0, y: 0, rotate: 0 }, { x: -46, y: 74, rotate: -7, ease: "none" });
      move(".hero__torus", { y: 0, rotate: 0 }, { y: -64, rotate: 12, ease: "none" });
      move(".hero__title .line:first-child", { x: 0 },
           { x: function () { return -Math.max(0, Math.min(44, leadRoom() - 12)); }, ease: "none" });
      move(".hero__title .line--2", { x: 0 },
           { x: function () { return Math.max(0, Math.min(52, tailRoom() - 12)); }, ease: "none" });
      move(".hero__foot", { y: 0 }, { y: 34, ease: "none" });
    })();

    /* ---- Tafeln: dieselbe Blende im Kleinen. Gilt fuer jede Szene mit
       Tafeln - die sechs Leistungen der Startseite und die vier Gruende der
       Unterseite laufen nach derselben Rechnung ein. ---------------------- */
    scenes.forEach(function (sc, i) {
      var tiles = $$("[data-tile]", sc);
      if (!tiles.length) return;
      var tt = gsap.timeline({
        scrollTrigger: {
          start: function () { return at(i) + S.wipe * .5; },
          end:   function () { return at(i) + lens[i] * S.step * .92; },
          scrub: true, invalidateOnRefresh: true
        }
      });
      /* Die Richtung steht im Stylesheet (linke Spalte von rechts, rechte von
         links); hier laeuft nur der Fortschritt der Kante. Die Tafel selbst
         bleibt an ihrem Platz im Raster - sie wird aufgedeckt, nicht bewegt. */
      tiles.forEach(function (tile, k) {
        tt.fromTo(tile, { "--w": 0 }, { "--w": 1, ease: "none", duration: .55 }, k * .09);
      });
    });

    /* ---- 02 Leistungen: das Laufband haengt an dieser einen Szene -------- */
    (function () {
      var i = scenes.findIndex(function (s) { return s.id === "leistungen"; });
      if (i < 0) return;
      marquee({
        start: function () { return at(i) - window.innerHeight * .4; },
        end:   function () { return at(i) + lens[i] * S.step; },
        invalidateOnRefresh: true
      });
    })();

    /* ---- 03-05 Projekte: das Bild kommt zur Ruhe, die Tafel faehrt herein
       Auf der Startseite laeuft dort ein Film, auf der Unterseite steht dort
       ein Rendering - dieselbe Kamerafahrt ueber beides. ------------------ */
    scenes.forEach(function (sc, i) {
      if (!sc.classList.contains("scene--case")) return;
      var media = $("video", sc) || $(".case__media img", sc);
      if (media) gsap.fromTo(media, { scale: 1.1 }, {
        scale: 1, ease: "none",
        scrollTrigger: { start: function () { return at(i); },
                         end: function () { return at(i) + lens[i] * S.step; },
                         scrub: true, invalidateOnRefresh: true }
      });
      if (!$(".case__panel", sc)) return;
      gsap.fromTo($(".case__panel", sc), { y: 54, opacity: 0 }, {
        y: 0, opacity: 1, duration: .9, ease: "expo.out",
        scrollTrigger: { start: function () { return at(i) + S.wipe * .5; },
                         end: function () { return at(i) + lens[i] * S.step; },
                         invalidateOnRefresh: true, toggleActions: "play none none reverse" }
      });
    });

    /* ---- 06 Kunden: die Welle laeuft laengs derselben Diagonale wie die Blende
       Reihenfolge = Zeitpunkt, zu dem die Blendenkante die Zelle erreicht haette. */
    (function () {
      var i = scenes.findIndex(function (s) { return s.id === "kunden"; });
      if (i < 0) return;
      var cells = $$(".clients__cell", scenes[i]);
      var COLS = 6, ROWS = Math.ceil(cells.length / COLS);
      var order = cells.map(function (c, k) {
        var cx = ((k % COLS) + .5) / COLS * 100;
        var cy = (Math.floor(k / COLS) + .5) / ROWS * 100;
        return (100 + 30 * cy / 100 - cx) / 130;   /* Kantengleichung der Blende */
      });
      var min = Math.min.apply(null, order), max = Math.max.apply(null, order);
      gsap.fromTo(cells, { y: 26, opacity: 0 }, {
        y: 0, opacity: 1, ease: "none", duration: .3,
        stagger: function (k) { return (order[k] - min) / (max - min || 1) * .7; },
        scrollTrigger: { start: function () { return at(i) + S.wipe * .55; },
                         end:   function () { return at(i) + lens[i] * S.step * .8; },
                         scrub: true, invalidateOnRefresh: true }
      });
    })();

    /* ---- 07 Stimmen: senkrechter Ticker, eine Stimme im Bild ------------- */
    (function () {
      var i = scenes.findIndex(function (s) { return s.id === "stimmen"; });
      if (i < 0) return;
      var voices = $$(".voice", scenes[i]);
      var n = voices.length;
      /* Ticker mit Haltezeiten: jede Stimme steht lange im Bild und rollt kurz
         weiter. Der Weg ist kurz (44px, genau die Luft, die das Fenster oben
         und unten laesst) und die weichende Stimme geht dabei aus: so bleibt
         jede Zeile immer ganz in ihrem Ausschnitt, statt halb hinauszulaufen.  */
      var TRAVEL = 44;
      gsap.set(voices, { y: function (j) { return j ? TRAVEL : 0; },
                         opacity: function (j) { return j ? 0 : 1; } });
      var tv = gsap.timeline({
        defaults: { ease: "none", duration: 1, delay: 0 },
        scrollTrigger: {
          start: function () { return at(i) + S.wipe * .6; },
          end:   function () { return at(i) + lens[i] * S.step * .96; },
          scrub: true, invalidateOnRefresh: true
        }
      });
      var slot = 1 / (n - 1), roll = .22 * slot;
      /* Erst geht die alte Stimme aus, dann kommt die neue: ueberblenden liesse
         beide halb durchscheinen, und die Zeilen laegen doppelt uebereinander. */
      for (var k = 1; k < n; k++) {
        (function (k) {
          var t0 = k * slot - roll;
          tv.to(voices[k - 1], { y: -TRAVEL, ease: "power2.in", duration: roll }, t0)
            .to(voices[k - 1], { opacity: 0, ease: "none", duration: roll * .45 }, t0)
            .fromTo(voices[k], { y: TRAVEL, opacity: 0 },
                    { y: 0, ease: "power2.out", duration: roll }, t0)
            .to(voices[k], { opacity: 1, ease: "none", duration: roll * .45 }, t0 + roll * .55);
        })(k);
      }
      tv.fromTo("#voicesRail", { scaleY: 0 }, { scaleY: 1, ease: "none", duration: 1 }, 0);
    })();

    /* ---- 08 Aktuelles: drei Streifen, das Bild wandert langsamer als der Text */
    (function () {
      var i = scenes.findIndex(function (s) { return s.id === "aktuelles"; });
      if (i < 0) return;
      var cols = $$(".col", scenes[i]);
      gsap.fromTo($$(".col__shot img", scenes[i]), { yPercent: -4 }, {
        yPercent: function (k) { return 4 + k * 2; }, ease: "none",
        scrollTrigger: { start: function () { return at(i); },
                         end: function () { return at(i) + lens[i] * S.step; },
                         scrub: true, invalidateOnRefresh: true }
      });
      /* Weg von 36px in den 40px Fussraum des Streifens: die Zeile faehrt
         herein, ohne dabei je unter dessen Kante zu geraten. */
      gsap.fromTo($$(".col__text", scenes[i]), { y: 36, opacity: 0 }, {
        y: 0, opacity: 1, duration: .8, ease: "expo.out", stagger: .1,
        scrollTrigger: { start: function () { return at(i) + S.wipe * .55; },
                         end: function () { return at(i) + lens[i] * S.step; },
                         invalidateOnRefresh: true, toggleActions: "play none none reverse" }
      });
      void cols;
    })();

    /* ---- Szenenzaehler: springt genau dann, wenn die Kante die Mitte kreuzt */
    var hud = $("#hud"), idxEl = $("#hudIdx"), ticks = $$("#hudTicks li");
    S.idx = 0;
    /* Ueber der lauten Markenflaeche waere ein heller Zaehler unsichtbar:
       die Szene sagt ihren Ton an, der Zaehler dreht auf Tinte. */
    function setTone(n) {
      var tone = scenes[n] && scenes[n].dataset.tone;
      if (tone) document.documentElement.dataset.tone = tone;
      else document.documentElement.removeAttribute("data-tone");
    }
    function setIdx(n) {
      if (n === S.idx) return;
      S.idx = n;
      setTone(n);
      ticks.forEach(function (t, k) { if (k === n) t.setAttribute("data-on", ""); else t.removeAttribute("data-on"); });
      gsap.timeline()
        .to(idxEl, { rotateX: -92, duration: .16, ease: "power2.in",
                     onComplete: function () { idxEl.textContent = pad(n + 1); } })
        .fromTo(idxEl, { rotateX: 92 }, { rotateX: 0, duration: .3, ease: "power3.out" });
    }
    if (hud && idxEl && ticks.length) {
      ticks[0].setAttribute("data-on", "");
      setTone(0);
      var hudST = ScrollTrigger.create({
        start: function () { return S.base; },
        end:   function () { return S.base + S.total; },
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          var y = self.scroll() - S.base;
          var n = 0;
          for (var k = 1; k < scenes.length; k++) if (y >= S.offs[k] + S.wipe * .5) n = k;
          setIdx(n);
        },
        onToggle: function (self) { gsap.to(hud, { opacity: self.isActive ? 1 : 0, duration: .4 }); }
      });
      gsap.set(hud, { opacity: hudST.isActive ? 1 : 0 });
    }

    return function () {
      S.on = false;
      ScrollTrigger.removeEventListener("refreshInit", relayout);
      acts.style.removeProperty("--room");
      document.documentElement.removeAttribute("data-tone");
      if (hud) gsap.set(hud, { opacity: 0 });
    };
  });

  /* ==========================================================================
     Fliessende Ordnung: kein Festhalten. Die Szenen stehen untereinander, die
     Blende laeuft einmal senkrecht durch, wenn der Abschnitt ins Bild kommt.
     ========================================================================== */
  mm.add("(max-width: 1023px), (max-height: 739px)", function () {
    S.on = false;

    scenes.forEach(function (sc) {
      /* Auf dem Telefon stehen die Tafeln untereinander: laedt die Szene sie
         zusammen, haengen sechs Renderings im ersten Bildschirm. Jede Tafel
         holt ihr Bild selbst, kurz bevor sie ins Bild kommt. */
      var tiles = $$("[data-tile]", sc);
      ScrollTrigger.create({
        trigger: sc, start: "top bottom+=40%",
        onEnter: function () { hydrate(sc, tiles.length > 0); },
        onEnterBack: function () { hydrate(sc, tiles.length > 0); }
      });
      tiles.forEach(function (tile) {
        ScrollTrigger.create({
          trigger: tile, start: "top bottom+=25%",
          onEnter: function () { hydrate(tile); }, onEnterBack: function () { hydrate(tile); }
        });
      });

      var video = $("video", sc);
      if (video) {
        ScrollTrigger.create({
          trigger: sc, start: "top 85%", end: "bottom 15%",
          onToggle: function (self) {
            if (self.isActive) {
              if (!video.src && video.dataset.src) hydrate(sc);
              video.play().catch(function () {});
            } else { video.pause(); }
          }
        });
      }

      if (!sc.dataset.wipe) return;
      /* Senkrechte Blende: nur der Zuschnitt laeuft, die Szene steht. Der Weg
         von 0 auf 1 ist im Stylesheet in Prozent der Szenenhoehe gerechnet,
         die Kante faehrt darin mit. */
      gsap.fromTo(sc, { "--w": 0 }, {
        "--w": 1, duration: .9, ease: "power3.out", immediateRender: true,
        scrollTrigger: { trigger: sc, start: "top 92%", once: true }
      });
    });

    if ($(".svcs__grid")) gsap.from(".svc", {
      y: 26, opacity: 0, duration: .7, stagger: .07, ease: "power3.out",
      scrollTrigger: { trigger: ".svcs__grid", start: "top 88%" }
    });
    if ($(".clients__grid")) gsap.from(".clients__cell", {
      y: 22, opacity: 0, duration: .6, stagger: .04, ease: "power3.out",
      scrollTrigger: { trigger: ".clients__grid", start: "top 88%" }
    });
    marquee({ trigger: "#leistungen", start: "top bottom", end: "bottom top" });
  });

  rises();

  /* ------------------------------------ Nach dem Laden aller Bilder neu messen */
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });

  /* Messpunkte fuer Abnahme und spaetere Integration */
  window.vmwa = {
    stage: S,
    lenis: lenis,
    top: function () { return docTop(acts); },
    scene: function (i) { return scenes[i]; }
  };
})();
