/* ==========================================================================
   V&M Werbeagentur - V6 "Film"
   Eine einzige waagerechte Fahrt zwischen zwei senkrechten Buchdeckeln.
   Alles Scroll-Getriebene laeuft ueber GSAP ScrollTrigger, kein eigener
   scroll-Listener. Lenis glaettet das Rad und meldet jede Bewegung an
   ScrollTrigger, damit Pin, Scrub und containerAnimation im selben Takt laufen.
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* Der Streifen beginnt immer am Anfang: der Vorspann gehoert zum Seitenkopf.
     Stellt der Browser beim Neuladen die alte Scrollhoehe wieder her, entstehen
     die Auslöser mitten in der Fahrt, und die Auftritte der Kader stehen dann
     auf ihrem Anfangswert - der Kader bliebe leer, bis man weiterscrollt
     (gemessen 05.09.2026 auf 1440).                                          */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  var reduce  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isPhone = window.matchMedia("(max-width: 900px)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------- Menü */
  var burger = $("#burger"), menu = $("#menu"), menuClose = $("#menuClose");
  function setMenu(open) {
    if (!menu || !burger) return;
    menu.dataset.open = open ? "true" : "false";
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
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
    // Ladezustand. Der echte Endpunkt wird bei der Integration hier eingehängt.
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

  /* --------------------------------------------------- Bilder nachreichen
     Die Kader tragen ihre Adressen in data-src und holen sie erst, wenn sie
     in Sicht kommen. Mit gewoehnlichem loading="lazy" reicht das nicht: der
     Streifen liegt senkrecht dicht unter dem ersten Bildschirm, Chromium
     zieht dann alle 35 Bilder sofort (gemessen 05.09.2026).                  */
  function arm(scope) {
    $$("img[data-src]", scope || document).forEach(function (img) {
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
    });
  }

  /* ------------------------------------------------- Ohne Bewegung: Schluss
     Kein ScrollTrigger, kein Pin, kein verstecktes Element: der Streifen ist
     dann eine schlichte Liste (siehe CSS), und alle Bilder stehen sofort.     */
  if (reduce) {
    // Die Tiefenebenen sind reine Ausstattung der Fahrt: ohne Fahrt fliegen sie raus,
    // statt als leere Bildhuellen stehenzubleiben.
    $$(".depth").forEach(function (l) { l.remove(); });
    arm();
    var c0 = $("#curtain");
    if (c0) c0.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ------------------------------------------------------- Weicher Scroll */
  var lenis = new Lenis({ duration: 1.05, smoothWheel: true, touchMultiplier: 1.6 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);

  var navH = function () { return Math.max(56, parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 72); };

  /* ------------------------------------------------------- Bühnenteile */
  var reel   = $("#reel"),  stage = $("#reelStage"), view = $("#reelView"), track = $("#reelTrack");
  var rail   = $("#rail"),  fill  = $("#railFill");
  var marks  = $$(".rail__mark");
  var groups = $$(".grp");
  var depths = $$(".depth");
  var perfs  = $$("[data-perf]");
  var pan = null, bounds = [], active = -1, snaps = [0, 1];

  var maxX = function () { return Math.max(1, track.scrollWidth - view.clientWidth); };

  function setActive(i) {
    if (i === active) return;
    active = i;
    marks.forEach(function (m, k) { m.dataset.active = k === i ? "true" : "false"; });
  }

  /* Ziel eines Ankers: waagerechte Position wird in eine Scrollhöhe übersetzt. */
  function targetY(el) {
    if (!pan || !pan.scrollTrigger) return null;
    var st = pan.scrollTrigger;
    var p  = Math.min(1, Math.max(0, el.offsetLeft / maxX()));
    return st.start + p * (st.end - st.start);
  }
  function goTo(el) {
    var y = targetY(el);
    if (y === null || !track || !track.contains(el)) lenis.scrollTo(el, { offset: -navH() });
    else lenis.scrollTo(y);
  }

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var t = document.querySelector(a.getAttribute("href"));
      if (!t) return;
      e.preventDefault();
      goTo(t);
    });
  });
  marks.forEach(function (m) {
    m.addEventListener("click", function () {
      var t = document.getElementById(m.dataset.to);
      if (t) goTo(t);
    });
  });

  /* --------------------------------- Zeilen in Wörter zerlegen (Aufdecken) */
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

  /* ------------------------------------------------------------- Vorspann */
  /* Ein Refresh setzt die Auftritte am containerAnimation auf ihren Anfang und
     sie holen sich nicht wieder ein - weder von selbst noch mit update() oder
     einem zweiten refresh(). Steht die Seite in diesem Moment schon mitten in
     der Fahrt (schnelles Rad waehrend des Vorspanns, Neuladen mit alter
     Scrollhoehe), blieb der Kader leer: Schrift auf Deckkraft 0, Video ohne
     Quelle (gemessen 05.09.2026 auf 1440). Neu gemessen wird deshalb nur am
     Seitenanfang; dort ist der Vorspann ohnehin zu Hause.                     */
  function safeRefresh() { if (window.scrollY < 4) ScrollTrigger.refresh(); }

  var curtain = $("#curtain");
  var intro = gsap.timeline({ onComplete: function () { curtain.remove(); safeRefresh(); } });
  intro.to(".curtain__mark", { opacity: 1, duration: .45, ease: "power2.out" })
       .to(".curtain__bar", { scaleX: 1, duration: .6, ease: "power2.inOut" }, "-=.25")
       .to(curtain, { yPercent: -100, duration: .8, ease: "expo.inOut" }, "+=.05")
       // Die Überschrift steigt hinter dem Vorhang hervor: ein Bewegungsfluss.
       .to(heroWords, { yPercent: 0, duration: 1, stagger: .055, ease: "expo.out" }, "-=.55")
       .fromTo(".hero__foot", { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: "power3.out" }, "-=.6")
       .fromTo(".hero__crystal", { scale: 1.14, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.1, ease: "expo.out" }, "-=.9");

  /* ----------------------------------------------------------------- Held
     Der Buchdeckel schiebt sich seitlich weg: die Fahrtrichtung der Seite
     wird schon hier angekündigt.
     Eigene defaults, sonst setzt GSAP jedem Twen eine halbe Sekunde und die
     Verschiebung ist bei halber Strecke schon fertig (Fehler aus v1).
     Der Weg ist auf 6vw begrenzt und das Verblassen nach 45 % der Strecke
     abgeschlossen: die Zeile ist damit laengst unsichtbar, bevor der Rand sie
     schneiden koennte. Vorher lag die Unterzeile bei Deckkraft 0,78 schon
     11px im Freien (gemessen 05.09.2026 auf jeder Breite bis 1536).           */
  var heroTl = gsap.timeline({
    defaults: { ease: "none", duration: 1, delay: 0 },
    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: .6 }
  });
  heroTl.fromTo(".hero__in", { opacity: 1 }, { opacity: 0, duration: .45, ease: "power1.in" }, 0);
  // Auf dem Telefon wandert der Held nicht: nur Verblassen und ein leichter
  // Zufahrer, sonst schiebt die Bewegung die Schrift ueber die schmale Kante.
  if (isPhone) heroTl.fromTo(".hero__in", { scale: 1 }, { scale: 1.04 }, 0);
  else         heroTl.fromTo(".hero__in", { x: 0 }, { x: "-6vw" }, 0);
  heroTl.fromTo(".hero__crystal", { x: 0, rotate: 0 },  { x: "10vw", rotate: 10 }, 0)
        .fromTo(".hero__glow",    { scale: 1, opacity: 1 }, { scale: 1.5, opacity: .3 }, 0);

  /* ------------------------------------------------ Auftritt in den Kadern
     Der Auftritt haengt an der Stelle des Kaders, nicht an der Uhr: waagerecht
     am Lauf des Streifens (containerAnimation), senkrecht am Scrollstand,
     beide mit scrub. Mit laufender Zeit war die Schrift noch am Einblenden,
     waehrend der Kader schon wieder aus dem Bild fuhr - Titelkader, Zwischen-
     titel und sechs "Mehr erfahren" waren nie ganz zu sehen (gemessen
     05.09.2026 auf jeder Breite ab 1024).                                     */
  function reveal(frame, cont) {
    // Ein Kader, der beim Anlauf schon im Bild steht, faehrt waagerecht nie
    // herein: sein Stichwort ist die senkrechte Annaeherung der Buehne.
    var early = !cont || frame.offsetLeft < view.clientWidth * .92;
    if ($("img[data-src]", frame)) {
      var load = early ? { trigger: frame, start: "top 200%" }
                       : { trigger: frame, containerAnimation: cont, start: "left 150%" };
      if (early && cont && stage) load.pinnedContainer = stage;
      load.onEnter = load.onEnterBack = function () { arm(frame); };
      ScrollTrigger.create(load);
    }

    var bits  = $$("[data-in]", frame);
    var rule  = $("[data-rule]", frame);
    var cells = $$(".clients__cell", frame);
    var plane = $("[data-plane]", frame);
    var cardBits = plane ? $$(".card__in > *", frame) : [];
    if (!bits.length && !rule && !cells.length && !plane) return;
    frame.dataset.revealed = "1";

    // Der Weg des Auftritts waechst mit der Breite des Kaders: ein schmaler
    // Titelkader ist schnell fertig, die Logowand deckt die halbe Anzeige.
    var wvw  = parseFloat(frame.style.getPropertyValue("--w")) || 60;
    var span = Math.min(52, Math.max(20, wvw * .5));
    var cfg  = early
      ? { trigger: frame, start: "top 94%", end: "top 46%", scrub: true }
      : { trigger: frame, containerAnimation: cont, start: "left 96%", end: "left " + (96 - span) + "%", scrub: true };
    if (early && cont && stage) cfg.pinnedContainer = stage;

    var tl = gsap.timeline({ defaults: { ease: "none", duration: 1, delay: 0 }, scrollTrigger: cfg });
    if (plane)         tl.fromTo(plane, { scaleX: 0 }, { scaleX: 1, ease: "power2.out" }, 0);
    if (cardBits.length) tl.fromTo(cardBits, { opacity: 0, y: 26 }, { opacity: 1, y: 0, stagger: .3 }, plane ? .5 : 0);
    if (bits.length)   tl.fromTo(bits,  { opacity: 0, y: 26 }, { opacity: 1, y: 0, stagger: .18 }, 0);
    if (rule)          tl.fromTo(rule,  { scaleX: 0 }, { scaleX: 1, ease: "power2.out" }, .1);
    if (cells.length)  tl.fromTo(cells, { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: .06 }, .1);
  }

  /* ------------------------------------------------------ Videos der Kader
     Geladen wird ein Ausschnitt erst, wenn er an der Reihe ist; ausserhalb
     des Bildes steht er still.                                              */
  function wireCase(scene, cont) {
    var video = $("video", scene);
    var play = function () {
      if (!video.src) video.src = video.dataset.src;
      video.play().catch(function () { /* Autoplay verweigert: erstes Bild bleibt stehen */ });
    };
    var stop = function () { video.pause(); };
    var cfg = cont
      ? { trigger: scene, containerAnimation: cont, start: "left 95%", end: "right 5%" }
      : { trigger: scene, start: "top 85%", end: "bottom top" };
    cfg.onEnter = cfg.onEnterBack = play;
    cfg.onLeave = cfg.onLeaveBack = stop;
    ScrollTrigger.create(cfg);

    if (cont) {
      gsap.fromTo(video, { scale: 1.14 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: scene, containerAnimation: cont, start: "left right", end: "left left", scrub: true }
      });
    } else {
      gsap.fromTo(video, { scale: 1.1 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: scene, start: "top bottom", end: "top top", scrub: 1 }
      });
    }
  }

  /* ==========================================================================
     Der Streifen
     Eine Unterseite kann Abschnitte der Startseite weglassen: fehlt die Buehne,
     wird der ganze Block uebersprungen, statt an einem leeren Knoten zu brechen.
     ========================================================================== */
  if (reel && stage && view && track && rail && fill) {
  if (!isPhone) {

    /* Die Fahrt: senkrechtes Scrollen wird zur waagerechten Bewegung.
       0.72 heisst: der Streifen läuft etwas schneller als das Rad, sonst
       würde die Seite auf 20 000 px anwachsen.                              */
    var RATIO = .72;
    /* Rastpunkte: die Fahrt kommt nur dort zur Ruhe, wo ein Kader buendig an
       der linken Kante steht. Ohne Raster hielt das Rad mitten im Wort: auf
       1440 waren in den meisten Ruhelagen zwei von drei Kadern von den
       Bildschirmkanten zerschnitten, auf der Unterseite auch die Marken-
       flaeche samt Schaltflaeche (gesehen 05.09.2026).                       */
    function nearestSnap(value) {
      var best = snaps[0], dist = Infinity;
      for (var i = 0; i < snaps.length; i++) {
        var d = Math.abs(snaps[i] - value);
        if (d < dist) { dist = d; best = snaps[i]; }
      }
      return best;
    }
    pan = gsap.to(track, {
      x: function () { return -maxX(); },
      ease: "none",
      scrollTrigger: {
        trigger: stage, start: "top top",
        end: function () { return "+=" + Math.round(maxX() * RATIO); },
        pin: true, pinSpacing: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
        // inertia aus: mit Schwungrechnung nimmt ScrollTrigger die Geschwindigkeit
        // als Vorhersage, und ein Sprung (Anker, Marke, Pruefskript) hat rechnerisch
        // enorme Geschwindigkeit - die Fahrt schoss dann ueber mehrere Kader hinaus
        // (gemessen 05.09.2026: Ziel 0,17 - Ruhelage 0,88). Gerastet wird auf den
        // naechstgelegenen Kader zur Stelle, an der das Rad stehenblieb.
        snap: { snapTo: nearestSnap, duration: { min: .2, max: .45 }, delay: .05, ease: "power1.inOut", directional: false, inertia: false },
        onToggle: function (self) { document.documentElement.classList.toggle("reel-live", self.isActive); },
        onUpdate: function (self) {
          var p = self.progress, d = maxX(), off = p * d;
          depths.forEach(function (layer) { gsap.set(layer, { x: -off * parseFloat(layer.dataset.depth) }); });
          // Die Perforation läuft mit dem Streifen mit, ein Loch je 48 px.
          gsap.set(perfs, { x: -(off % 48) });
          gsap.set(fill, { scaleX: p });
          var center = off + view.clientWidth * .5, idx = 0;
          for (var i = 0; i < bounds.length; i++) { if (center >= bounds[i]) idx = i; }
          setActive(idx);
        }
      }
    });

    /* Springt der Scrollstand in einem Satz - Bild-ab-Taste, Sprungmarke, ein
       Rastschritt -, folgen keine weiteren Scrollereignisse nach. Die Auftritte
       der Kader haengen aber am containerAnimation und werden nur bei einem
       Ereignis nachgerechnet: der Kader stand dann leer im Bild, Text auf
       Deckkraft 0 und Video ohne Quelle (gemessen 05.09.2026 auf 1440).
       Solange der Scrub die Fahrt noch einholt, stossen wir ScrollTrigger
       deshalb Bild fuer Bild selbst an; im Ruhezustand kostet das nichts. */
    gsap.ticker.add(function () {
      var st = pan && pan.scrollTrigger;
      var tw = st && st.getTween && st.getTween();
      if (tw && tw.isActive()) ScrollTrigger.update();
    });

    /* Masse: Gruppenkanten für die Marken, Breite der Tiefenebenen.          */
    function measure() {
      var total = track.scrollWidth || 1, d = maxX(), vw = view.clientWidth;
      bounds = groups.map(function (g) { return g.offsetLeft; });
      // Kaderkanten als Fortschrittswerte; die letzten Kader fallen auf 1
      // zusammen, weil der Streifen dort schon buendig rechts steht.
      var seen = {};
      snaps = [];
      $$(".frame", track).forEach(function (f) {
        var p = Math.min(1, Math.max(0, f.offsetLeft / d)), k = p.toFixed(5);
        if (!seen[k]) { seen[k] = 1; snaps.push(p); }
      });
      if (!snaps.length || snaps[0] > 0) snaps.unshift(0);
      if (snaps[snaps.length - 1] < 1) snaps.push(1);
      groups.forEach(function (g, i) {
        if (marks[i]) marks[i].style.flexGrow = String(g.offsetWidth / total * 100);
      });
      depths.forEach(function (layer) { layer.style.width = Math.round(vw + d * parseFloat(layer.dataset.depth)) + "px"; });
    }
    measure();
    ScrollTrigger.addEventListener("refresh", measure);

    $$(".frame").forEach(function (f) { reveal(f, pan); });
    $$("[data-case]").forEach(function (s) { wireCase(s, pan); });

    /* Tastatur: der Fokus kann in einen Kader springen, der seitlich aus dem
       Bild gefahren ist. Dann faehrt der Streifen ihm nach. */
    track.addEventListener("focusin", function (e) {
      var f = e.target.closest ? e.target.closest(".frame") : null;
      if (!f) return;
      // Ein Bild spaeter: der Browser holt den Fokus zuerst selbst heran, erst
      // danach darf der Streifen an die richtige Stelle fahren.
      requestAnimationFrame(function () {
        var r = f.getBoundingClientRect();
        if (r.left >= 0 && r.right <= window.innerWidth) return;
        var y = targetY(f);
        if (y !== null) lenis.scrollTo(y);
      });
    });

  } else {

    /* Telefon: keine Fahrt, kein Pin. Der Streifen steht senkrecht, das
       Laufwerk wird zur Kopfzeile mit dem Namen des Abschnitts.             */

    /* Die Tiefenebenen gehoeren zur waagerechten Fahrt und sind senkrecht per
       CSS ausgeblendet. Als display:none holt der Browser ihr lazy-Bild nie:
       acht Bildhuellen blieben ungeladen stehen (gemessen 05.09.2026, auf
       Startseite wie Unterseite). Sie fliegen deshalb raus, wie im schonenden Modus. */
    depths.forEach(function (l) { l.remove(); });
    depths = [];

    ScrollTrigger.create({
      trigger: reel, start: "top 70%", end: "bottom 30%",
      onToggle: function (self) { document.documentElement.classList.toggle("reel-live", self.isActive); }
    });
    setActive(0);
    gsap.fromTo(fill, { scaleX: 0 }, {
      scaleX: 1, ease: "none",
      scrollTrigger: {
        trigger: reel, start: "top top", end: "bottom bottom", scrub: .3,
        onUpdate: function () {
          // Aktiv ist der Abschnitt, dessen Oberkante zuletzt die Blickhoehe passiert hat.
          var mid = window.innerHeight * .45, idx = 0;
          groups.forEach(function (g, i) { if (g.getBoundingClientRect().top <= mid) idx = i; });
          setActive(idx);
        }
      }
    });
    $$(".frame").forEach(function (f) { reveal(f, null); });
    $$("[data-case]").forEach(function (s) { wireCase(s, null); });
  }
  }

  /* ------------------------------------------- Zwischentitel der Unterseite
     Die Markenflaeche wischt herein, erst danach steigt die Schrift darauf.
     Der Kader steht am Anfang des Streifens und ist schon zu sehen, waehrend
     der Streifen heraufkommt: sein Stichwort ist deshalb die senkrechte
     Annaeherung, nicht die waagerechte Vorbeifahrt.                          */
  $$("[data-plane]").forEach(function (plane) {
    var frame = plane.closest(".frame") || plane;
    // Steht der Kader im Streifen, hat ihn reveal() schon versorgt.
    if (frame.dataset.revealed === "1") return;
    var bits = $$(".card__in > *", frame);
    // pinnedContainer: der Kader steht in der festgehaltenen Buehne; damit rechnet
    // ScrollTrigger die Haltestrecke korrekt in die Ausloesehoehe ein.
    var cfg = { trigger: frame, start: "top 85%" };
    if (pan && stage) cfg.pinnedContainer = stage;
    var tl = gsap.timeline({ scrollTrigger: cfg });
    tl.fromTo(plane, { scaleX: 0 }, { scaleX: 1, duration: .8, ease: "expo.out" });
    if (bits.length) tl.fromTo(bits, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .7, stagger: .08, ease: "power3.out" }, "-=.35");
  });

  /* Die Tiefenebenen gehoeren zu keinem Kader: sie laden mit dem Streifen. */
  if (reel && depths.length) (function () {
    var cfg = { trigger: reel, start: "top 95%" };
    cfg.onEnter = cfg.onEnterBack = function () { depths.forEach(function (l) { arm(l); }); };
    ScrollTrigger.create(cfg);
  })();

  /* ------------------------------------- Allgemeines Auftauchen (.rise)
     Auch hier gilt die Stelle, nicht die Uhr: der Wert steht fest, sobald die
     Zeile auf 64 % der Anzeige steht. Startwerte ausdruecklich als fromTo,
     damit der Twen nicht die Null aus dem Vorspann als Start merkt (v1).      */
  $$(".rise").forEach(function (el) {
    gsap.fromTo(el, { opacity: 0, y: 26 }, {
      opacity: 1, y: 0, ease: "none",
      scrollTrigger: { trigger: el, start: "top 92%", end: "top 64%", scrub: true }
    });
  });

  /* --------------------------------- Nach dem Laden aller Bilder neu messen */
  window.addEventListener("load", function () { safeRefresh(); });
})();
