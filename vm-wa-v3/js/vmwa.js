/* ==========================================================================
   V&M Werbeagentur - Variante 3 "Licht"
   Alles Scroll-Getriebene laeuft ueber GSAP ScrollTrigger, kein eigener
   scroll-Listener. Lenis glaettet das Rad und meldet jede Bewegung an
   ScrollTrigger, damit Masken, Blenden und Kabel im selben Takt laufen.
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isPhone = window.matchMedia("(max-width: 900px)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  /* Dieselbe Datei bedient Startseite und Innenseite. Auf der Innenseite
     fehlen ganze Abschnitte, deshalb wird jedes Ziel vorher geprueft:
     any() gibt die Treffer zurueck oder null - GSAP bekommt nie ein leeres Ziel. */
  var any = function (s, c) { var e = $$(s, c); return e.length ? e : null; };

  /* ---------------------------------------------------------------- Menue */
  var burger = $("#burger"), menu = $("#menu"), menuClose = $("#menuClose");
  if (burger && menu && menuClose) {
    var setMenu = function (open) {
      menu.dataset.open = open ? "true" : "false";
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
      if (open) menu.querySelector("a").focus();
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
    if (!input) return true;
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
  if (form && note && send) form.addEventListener("submit", function (e) {
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
    // Ladezustand. Der echte Endpunkt wird bei der Integration hier eingehaengt.
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

  /* ------------------------------------------------- Ohne Bewegung: Schluss
     Kein ScrollTrigger, keine Maske, kein Vorhang. Das CSS zeigt alles.       */
  if (reduce) {
    var c0 = $("#curtain");
    if (c0) c0.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ==================================================================
     Zeitleisten, die ihren Wert als Inline-Stil schreiben (Blende, Maske,
     Lichtspur), muessen nach jedem Refresh erzwungen neu zeichnen.
     Gemessen 05.09.2026: beim Neuvermessen stellt GSAP sie auf den Anfang
     zurueck und ruft onUpdate erst bei der naechsten Bewegung wieder auf -
     wer die Seite mitten im Dokument neu laedt, saehe eine geschlossene
     Blende und einen dunklen Abschnitt, bis er das Rad anfasst.
     ================================================================== */
  var litAnims = [];
  function keepLit(anim) { if (anim) litAnims.push(anim); return anim; }
  ScrollTrigger.addEventListener("refresh", function () {
    litAnims.forEach(function (a) {
      var st = a.scrollTrigger;
      if (!st || typeof a.render !== "function") return;
      a.render(st.progress * a.duration(), false, true);
    });
  });

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

  /* ==================================================================
     Die belichtete Kopie einer Ueberschrift.
     Kein zweiter Text im Dokument: die Kopie ist aria-hidden und wird
     erst hier erzeugt, damit ohne JS nichts doppelt vorgelesen wird.
     ================================================================== */
  function makeLit(el, cls) {
    if (!el) return null;
    var copy = document.createElement("span");
    copy.className = cls;
    copy.setAttribute("aria-hidden", "true");
    copy.innerHTML = el.innerHTML;
    el.appendChild(copy);
    return copy;
  }
  var heroTitle = $("#heroTitle");
  var heroLit = makeLit(heroTitle, "hero__title hero__lit");

  /* -------------------------------------------------------------- Vorhang
     Der Raum ist dunkel, der Lichtkegel faellt ein, dann hebt sich alles.   */
  var curtain = $("#curtain");
  if (curtain) {
    var intro = gsap.timeline({ onComplete: function () {
      curtain.remove();
      buildHero();
      ScrollTrigger.refresh();
    } });
    intro.fromTo(".curtain__beam", { opacity: 0, scaleY: .6 }, { opacity: 1, scaleY: 1, duration: .55, ease: "power2.out" })
         .fromTo(".curtain__mark", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .45, ease: "power2.out" }, "-=.25")
         .to(curtain, { opacity: 0, duration: .5, ease: "power2.inOut" }, "+=.15");
    if (any(".hero__title .line")) {
      intro.fromTo(".hero__title .line", { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, stagger: .1, ease: "expo.out" }, "-=.35");
    }
    if (any(".hero__foot")) intro.fromTo(".hero__foot", { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: "power3.out" }, "-=.6");
    if (any(".hero__crystal")) intro.fromTo(".hero__crystal", { opacity: 0, scale: .94 }, { opacity: 1, scale: 1, duration: 1, ease: "power3.out" }, "-=1");
  } else {
    buildHero();
  }

  /* ------------------------------------------ Fortschritt am oberen Rand */
  if ($("#progress")) gsap.to("#progress", {
    scaleX: 1, ease: "none",
    scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: .3 }
  });

  /* ==================================================================
     Das wandernde Licht des Raumes.
     Es sinkt mit dem Scrollen durch die Seite und folgt am Zeigegeraet
     zusaetzlich dem Cursor. Nur transform, nichts wird neu gezeichnet.
     ================================================================== */
  if ($("#roomDrift")) gsap.fromTo("#roomDrift", { yPercent: -16, xPercent: -7 }, {
    yPercent: 18, xPercent: 9, ease: "none",
    scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1 }
  });
  if (fine && $("#roomPool")) {
    var poolX = gsap.quickTo("#roomPool", "x", { duration: .9, ease: "power3" });
    var poolY = gsap.quickTo("#roomPool", "y", { duration: .9, ease: "power3" });
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      poolX(e.clientX - window.innerWidth / 2);
      poolY(e.clientY - window.innerHeight / 2);
    }, { passive: true });
  }

  /* ==================================================================
     1. Held: das Licht laeuft ueber die Ueberschrift, der Kristall
     bekommt seinen Reflex. Beides haengt am Scrollfortschritt des Helden.
     ================================================================== */
  function buildHero() {
    if (!$("#hero")) return;
    var sw = { v: 68 };
    var tl = keepLit(gsap.timeline({
      scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: .6, invalidateOnRefresh: true }
    }));
    // Explizite Startwerte: der Vorhang haelt die Zeilen beim Aufbau noch fest,
    // ein blosses .to() wuerde genau diesen Zustand als Ausgangspunkt festschreiben.
    if (heroLit) {
      tl.fromTo(sw, { v: 68 }, { v: -8, ease: "none", onUpdate: function () {
        heroLit.style.setProperty("--sw", sw.v + "%");
      } }, 0);
      heroLit.style.setProperty("--sw", "68%");
    }
    if (any(".hero__glint i")) tl.fromTo(".hero__glint i", { xPercent: -180 }, { xPercent: 300, ease: "none" }, 0);
    // Nur die echte Ueberschrift, nicht ihre belichtete Kopie: die traegt
    // dieselbe Klasse und wuerde sonst ein zweites Mal verschoben - der Text
    // stuende doppelt und versetzt (gemessen 05.09.2026: 24 px Versatz).
    if (heroTitle)             tl.fromTo(heroTitle, { y: 0 }, { y: -70, ease: "none" }, 0);
    if (any(".hero__foot"))    tl.fromTo(".hero__foot", { y: 0, opacity: 1 }, { y: 40, opacity: 0, ease: "none" }, 0);
    if (any(".hero__crystal")) tl.fromTo(".hero__crystal", { y: 0, scale: 1 }, { y: 120, scale: 1.06, ease: "none" }, 0);
    if (any(".hero__obj"))     tl.fromTo(".hero__obj", { y: 0 }, { y: -110, ease: "none" }, 0);
    if (any(".hero__beam"))    tl.fromTo(".hero__beam", { opacity: 1, scaleY: 1 }, { opacity: .35, scaleY: 1.12, ease: "none" }, 0);
  }

  /* ==================================================================
     2. Band: die Leistungen laufen durch einen feststehenden Lichtspalt.
     Zwei deckungsgleiche Spuren, die obere ist die belichtete Kopie.
     ================================================================== */
  (function () {
    var tracks = $$("[data-band]");
    if (!tracks.length) return;
    var half = tracks[0].scrollWidth / 2;
    gsap.to(tracks, {
      x: -half, duration: 30, ease: "none", repeat: -1,
      modifiers: { x: function (x) { return gsap.utils.wrap(-half, 0, parseFloat(x)) + "px"; } }
    });
  })();

  /* ==================================================================
     Lichtkabel: zeichnet sich zwischen den Abschnitten, der Knoten
     leuchtet auf, sobald die Leitung angekommen ist.
     ================================================================== */
  $$("[data-cable]").forEach(function (cable) {
    var paths = $$(".cable__p", cable);
    var bar = $(".cable__bar", cable);
    gsap.set(paths, { strokeDasharray: 1, strokeDashoffset: 1 });
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: cable, start: "top 92%", end: "bottom 58%", scrub: .5,
        onUpdate: function (self) { cable.classList.toggle("is-lit", self.progress > .9); }
      }
    });
    tl.fromTo(paths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none" }, 0)
      .fromTo(bar, { scaleY: 0 }, { scaleY: 1, ease: "none" }, 0);
  });

  /* ==================================================================
     Masken: der Abschnitt liegt im Dunkeln, das Licht oeffnet ihn.
     Radius als CSS-Variable, damit nur die eigene Flaeche neu gezeichnet
     wird und nicht der ganze Bildschirm.
     ================================================================== */
  function openWithLight(target, opts) {
    opts = opts || {};
    var el = typeof target === "string" ? $(target) : target;
    if (!el) return;
    var from = opts.from === undefined ? 32 : opts.from;
    var to   = opts.to === undefined ? 240 : opts.to;
    var s = { v: from };
    el.style.setProperty("--lr", from + "%");
    return keepLit(gsap.fromTo(s, { v: from }, {
      v: to, ease: "none",
      onUpdate: function () { el.style.setProperty("--lr", s.v + "%"); },
      scrollTrigger: {
        trigger: opts.trigger || el,
        start: opts.start || "top 92%",
        end: opts.end || "top 40%",
        scrub: opts.scrub === undefined ? .5 : opts.scrub
      }
    }));
  }

  /* ==================================================================
     3. Leistungen: das Licht wandert Tafel fuer Tafel nach unten.
     ================================================================== */
  $$("[data-svc]").forEach(function (svc) {
    openWithLight(svc, { start: "top 95%", end: "top 45%" });
    ScrollTrigger.create({
      trigger: svc, start: "top 66%", end: "bottom 42%",
      onToggle: function (self) { svc.dataset.lit = self.isActive ? "true" : "false"; }
    });
  });

  /* ==================================================================
     4. Projekte: jede Szene oeffnet sich wie eine Blende und schliesst
     sich wieder. Der Ring sitzt genau auf der Kante der Blende.
     Geladen wird ein Video erst, wenn es an der Reihe ist.
     ================================================================== */
  $$("[data-case]").forEach(function (scene) {
    var media = $(".case__media", scene);
    var ring  = $(".case__ring", scene);
    var panel = $(".case__panel", scene);
    var video = $("video", scene);
    var state = { p: 4 };

    /* Die Tafel haengt an ihrer eigenen Lage im Bild, nicht am Fortschritt der
       Szene. Am Fortschritt gehaengt fuhr sie bei voller Deckkraft unter die
       Kopfzeile, und ihre Ueberschrift stand halb abgeschnitten (gemessen
       05.09.2026 auf 1440: 67 bis 72 px verdeckt bei y 4650, 5550 und 6490).
       So kommt sie von unten herauf und ist wieder dunkel, bevor ihr Kopf die
       Leiste beruehrt - auf jedem Schirm, ohne feste Zahl im Zeitplan. */
    var panelTop = 0, headOff = 0, navH = 72;
    var panelHead = $("h2, h3", panel);
    function measurePanel() {
      var y = parseFloat(gsap.getProperty(panel, "y")) || 0;
      var r = panel.getBoundingClientRect();
      panelTop = r.top + window.scrollY - y;
      // Gemessen wird die Ueberschrift, nicht der Kartenrand: auf dem kurzen
      // Querformat ist die Tafel fast so hoch wie der Schirm, und eine Grenze
      // am Rand haette ihren Fuss mitsamt Verweis aus dem Bild geschoben
      // (gemessen 05.09.2026 auf 844x390: Verweis bei 400 von 390).
      headOff = panelHead ? panelHead.getBoundingClientRect().top - r.top : 0;
      navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 72;
    }
    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function drivePanel() {
      var vh = window.innerHeight;
      var top = panelTop - window.scrollY;
      var into = clamp01((vh - top) / (vh * .3));                    // steigt von unten ins Bild
      var free = clamp01((top + headOff - (navH + 4)) / 40);         // Abstand der Ueberschrift zur Kopfzeile
      gsap.set(panel, { opacity: Math.min(into, free), y: (1 - into) * 34 - (1 - free) * 24 });
    }
    measurePanel();
    drivePanel();

    function apply() {
      var p = state.p;
      media.style.clipPath = "circle(" + p + "% at 50% 50%)";
      // circle(p%) rechnet den Radius aus der Diagonale: r = p% * hypot(w,h)/sqrt(2)
      var r = (p / 100) * Math.hypot(scene.clientWidth, scene.clientHeight) / Math.SQRT2;
      var op = 1 - Math.abs(p - 40) / 40;
      gsap.set(ring, { scale: r / 100, opacity: op < 0 ? 0 : op * .9 });
    }
    apply();

    keepLit(gsap.timeline({
      scrollTrigger: {
        trigger: scene, start: "top bottom", end: "bottom top", scrub: .5, invalidateOnRefresh: true,
        onUpdate: drivePanel,
        onToggle: drivePanel,
        onRefresh: function () { measurePanel(); drivePanel(); }
      }
    })
      // Gemessen: bei Oeffnung ab Fortschritt 0 war die Blende schon offen,
      // bevor die Szene ueberhaupt im Bild stand. Sie oeffnet jetzt erst,
      // wenn die Szene den Schirm fuellt, und schliesst beim Verlassen.
      .fromTo(state, { p: 4 }, { p: 4, duration: .18, onUpdate: apply }, 0)
      .fromTo(state, { p: 4 }, { p: 78, ease: "power2.out", duration: .27, onUpdate: apply }, .18)
      .to({}, { duration: .54 }, .45)
      .fromTo(state, { p: 78 }, { p: 4, ease: "power2.in", duration: .28, onUpdate: apply }, .72));

    // Auf der Innenseite steht in derselben Blende ein Rendering statt eines
    // Films: dann gibt es nichts zu laden und nichts abzuspielen.
    if (!video) return;
    ScrollTrigger.create({
      trigger: scene, start: "top 92%", end: "bottom 8%",
      onEnter: function () {
        if (!video.src) video.src = video.dataset.src;
        video.play().catch(function () { /* Autoplay verweigert: Standbild bleibt */ });
      },
      onEnterBack: function () { video.play().catch(function () {}); },
      onLeave: function () { video.pause(); },
      onLeaveBack: function () { video.pause(); }
    });
  });

  /* ==================================================================
     Innenseite: das Angebot laeuft durch den Lichtspalt.
     Dieselbe belichtete Kopie wie im Helden, nur an den Fortschritt
     des Abschnitts gehaengt statt an den des Helden.
     ================================================================== */
  (function () {
    var title = $("[data-offer]");
    if (!title) return;
    var lit = makeLit(title, "offer__lit");
    var s = { v: 96 };
    lit.style.setProperty("--sw", "96%");
    keepLit(gsap.fromTo(s, { v: 96 }, {
      v: -22, ease: "none",
      onUpdate: function () { lit.style.setProperty("--sw", s.v + "%"); },
      scrollTrigger: { trigger: title, start: "top 96%", end: "bottom 32%", scrub: .6 }
    }));
  })();

  /* ==================================================================
     Innenseite: vier Gruende. Die Maske oeffnet das Feld, danach fuellt
     das Licht die Ziffern - eine Karte nach der anderen.
     ================================================================== */
  (function () {
    var grid = $("#reasonsGrid");
    if (!grid) return;
    openWithLight(grid, { start: "top 92%", end: "top 38%" });
    $$("[data-reason]").forEach(function (card) {
      ScrollTrigger.create({
        trigger: card, start: "top 82%", end: "bottom 28%",
        onToggle: function (self) { card.dataset.lit = self.isActive ? "true" : "false"; }
      });
    });
  })();

  /* ==================================================================
     5. Kunden: die Zeichen leuchten auf, wenn das Licht vorbeikommt.
     ================================================================== */
  (function () {
    var grid = $("#clientsGrid");
    if (!grid) return;
    openWithLight(grid, { start: "top 92%", end: "top 38%" });
    gsap.fromTo($$(".clients__cell img", grid), { opacity: .2 }, {
      opacity: 1, ease: "none", duration: .5,
      stagger: { amount: 1.3, grid: [3, 4], from: "start" },
      scrollTrigger: { trigger: grid, start: "top 88%", end: "top 30%", scrub: .4 }
    });
  })();

  /* ==================================================================
     6. Stimmen: ein einziger Lichtfleck wandert von Zitat zu Zitat.
     Immer genau eine Karte traegt das Licht - deshalb wird die naechste
     aus der Mitte des Bildschirms bestimmt und nicht per Einzeltrigger.
     ================================================================== */
  (function () {
    var cards = $$("[data-voice]");
    if (!cards.length) return;
    cards.forEach(function (card) { openWithLight(card, { start: "top 92%", end: "top 48%" }); });

    var mids = [];
    function measure() {
      mids = cards.map(function (c) {
        var r = c.getBoundingClientRect();
        return r.top + window.scrollY + r.height / 2;
      });
    }
    measure();
    ScrollTrigger.addEventListener("refresh", measure);

    ScrollTrigger.create({
      trigger: ".voices", start: "top bottom", end: "bottom top",
      onUpdate: function () {
        var c = window.scrollY + window.innerHeight / 2, best = 0, d = Infinity;
        for (var i = 0; i < mids.length; i++) {
          var dd = Math.abs(mids[i] - c);
          if (dd < d) { d = dd; best = i; }
        }
        cards.forEach(function (card, i) { card.dataset.lit = i === best ? "true" : "false"; });
      }
    });
  })();

  /* ==================================================================
     7. Aktuelles
     ================================================================== */
  $$("[data-post]").forEach(function (post) {
    openWithLight(post, { start: "top 92%", end: "top 44%" });
  });

  /* ==================================================================
     8. Kontakt: das Licht geht ganz an, die Schaltflaeche bekommt
     genau einen Reflex - einmal, nicht als Schleife.
     ================================================================== */
  openWithLight("#contactIn", { start: "top 95%", end: "top 30%", from: 30, to: 300 });
  if ($("#contactLamp") && $("#kontakt")) gsap.fromTo("#contactLamp", { opacity: 0 }, {
    opacity: 1, ease: "none",
    scrollTrigger: { trigger: "#kontakt", start: "top 90%", end: "top 25%", scrub: .6 }
  });
  if ($("#send") && $("#btnGlint i")) ScrollTrigger.create({
    trigger: "#send", start: "top 88%", once: true,
    onEnter: function () {
      // Bewegt wird der Streifen INNERHALB der Blende, nicht die Blende selbst:
      // sonst wandert der Reflex aus der Schaltflaeche heraus und blaeht ihre
      // Scrollbreite auf, obwohl er unsichtbar ist.
      gsap.fromTo("#btnGlint i", { xPercent: -200 }, { xPercent: 620, duration: 1.15, ease: "power2.inOut" });
    }
  });

  /* ------------------------------------- Allgemeines Auftauchen (.rise) */
  $$(".rise").forEach(function (el) {
    gsap.to(el, {
      opacity: 1, y: 0, duration: .9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" }
    });
  });

  /* --------------------------------- Nach dem Laden aller Bilder neu messen */
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });

  void isPhone;
})();
