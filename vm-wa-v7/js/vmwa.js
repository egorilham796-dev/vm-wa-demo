/* ==========================================================================
   V&M Werbeagentur - Variante 7 "Kacheln"
   Die Kachel ist die Einheit der Bewegung: sie fliegt in ihr Fach, neigt sich
   unter dem Zeiger, nimmt die Reihe ein. Alles Scroll-Getriebene laeuft ueber
   GSAP ScrollTrigger, kein eigener scroll-Listener. Nur transform und opacity.

   Diese Datei bedient beide Seiten: die Startseite und die Unterseite
   "Professionelles Webdesign". Die Unterseite hat weniger Abschnitte, darum
   fragt jeder Block zuerst nach seinen Knoten und steigt sonst still aus -
   ein fehlender Abschnitt darf keine Meldung in der Konsole erzeugen.
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reduce  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isPhone = window.matchMedia("(max-width: 900px)").matches;
  var fine    = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ------------------------------------------------------ Fenster im Film
     Der Innova-Streifen beginnt und endet mit einer leeren Farbflaeche: die
     ersten sieben und die letzten einundzwanzig Einzelbilder sind ein
     einziger Ton (gemessen 05.09.2026, Y einheitlich 134). Die groesste
     Kachel des ersten Bildschirms stand darum als brauner Block da. Traegt
     das Video data-in/data-out, laeuft die Schleife nur durch den Teil mit
     Inhalt.                                                              */
  function filmWindow(v) {
    var a = parseFloat(v.dataset.in), b = parseFloat(v.dataset.out);
    if (!(a >= 0) || !(b > a)) return;
    // Gesprungen wird nur, wenn der Server Bereiche liefert - das sagt
    // seekable. Der Probeserver (Python SimpleHTTP) liefert keine: dort
    // meldet seekable [0,0], und ein Sprung (ueber #t= oder currentTime)
    // liess das Video bei readyState 1 stehen, es lief gar nicht mehr
    // (zweimal gemessen 05.09.2026). Ohne Bereiche bleibt das Fenster still
    // und der Streifen laeuft wie zuvor ganz durch.
    function ready() {
      return v.readyState >= 3 && v.seekable.length > 0 && v.seekable.end(v.seekable.length - 1) >= b;
    }
    function toStart() { if (ready()) v.currentTime = a; }
    ["loadeddata", "canplay", "canplaythrough", "progress"].forEach(function (ev) {
      v.addEventListener(ev, function () { if (v.currentTime < a - .1 || v.currentTime > b) toStart(); });
    });
    // timeupdate meldet sich viermal je Sekunde: das Ende des Fensters liegt
    // darum mit Abstand vor der leeren Flaeche, ein Ueberschiessen faellt
    // noch in den Teil mit Inhalt.
    v.addEventListener("timeupdate", function () {
      if (v.currentTime > b || v.currentTime < a - .1) toStart();
    });
  }
  $$("video[data-src]").forEach(filmWindow);

  /* ---------------------------------------------------------------- Menue */
  var burger = $("#burger"), menu = $("#menu"), menuClose = $("#menuClose");
  function setMenu(open) {
    if (!menu || !burger) return;
    menu.dataset.open = open ? "true" : "false";
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
    if (open) menu.querySelector("a").focus();
  }
  if (burger && menu && menuClose) {
    burger.addEventListener("click", function () { setMenu(true); });
    menuClose.addEventListener("click", function () { setMenu(false); });
    $$("#menu a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  /* ------------------------------------------------------------- Formular */
  var form = $("#form"), note = $("#note"), send = $("#send");
  if (form && note && send) {
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
  }

  /* ---------------------------------------------- Ohne Bewegung: Schluss.
     Kein ScrollTrigger, nichts angeheftet, alles sichtbar. Die Filme zeigen
     ihr erstes Bild, laufen aber nicht.                                     */
  if (reduce) {
    $$("video[data-src]").forEach(function (v) {
      v.preload = "metadata";
      // Der Zeitanker holt das erste Bild: ohne ihn bleibt die Flaeche leer,
      // weil ohne Abspielen kein Einzelbild gezeichnet wird.
      v.src = v.dataset.src + "#t=0.1";
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

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

  /* ---------------------------------------------- Fortschritt am Seitenrand */
  gsap.to("#progress", {
    scaleX: 1, ease: "none",
    scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: .3 }
  });

  /* ======================================================== 1. Held
     Die fuenf Kacheln sitzen zusammengeschoben in der Mitte und fliegen in
     ihre Faecher. Danach bewegt sich nur noch der Inhalt in den Kacheln,
     der Rahmen des Rasters bleibt starr.                                    */
  (function () {
    var bento = $("#heroBento");
    if (!bento) return;
    var tiles = $$(".hero__t", bento);
    if (!tiles.length) return;
    var box = bento.getBoundingClientRect();
    var cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    var tl = gsap.timeline({ delay: .06 });

    tiles.forEach(function (t, i) {
      var r = t.getBoundingClientRect();
      var dx = (cx - (r.left + r.width / 2)) * .58;
      var dy = (cy - (r.top + r.height / 2)) * .58;
      tl.fromTo(t,
        { opacity: 0, x: dx, y: dy, scale: .74 },
        { opacity: 1, x: 0, y: 0, scale: 1, duration: 1.05, ease: "expo.out", clearProps: "transform" },
        i * .075);
    });

    // Tiefe beim Scrollen: der Kristall dreht sich weg, die Zeilen gehen
    // auseinander, der Filmstreifen zieht nach. Alles innerhalb der Kacheln.
    var depth = {
      trigger: "#hero", start: "top top", end: "bottom top", scrub: .8
    };
    function depthTo(sel, vars) {
      if (!$(sel)) return;                    // fehlt der Knoten, faellt der Tween weg
      vars.ease = "none"; vars.scrollTrigger = depth;
      gsap.to(sel, vars);
    }
    depthTo(".hero__crystal", { yPercent: -16, rotate: 9 });
    depthTo(".hero__title .line:first-child", { x: -14 });
    depthTo(".hero__title .line--acid", { x: 22 });
    depthTo(".hero__film", { scale: 1.12 });
  })();

  /* -------------------------------------------------------- 2. Laufschrift */
  (function () {
    var track = $("#bandTrack");
    if (!track) return;
    var half = track.scrollWidth / 2;
    var loop = gsap.to(track, {
      x: -half, duration: 26, ease: "none", repeat: -1,
      modifiers: { x: function (x) { return gsap.utils.wrap(-half, 0, parseFloat(x)) + "px"; } }
    });
    ScrollTrigger.create({
      trigger: "#hero", start: "top bottom", end: "bottom top",
      onUpdate: function (self) {
        var v = gsap.utils.clamp(-5, 5, self.getVelocity() / 300);
        loop.timeScale(self.direction === -1 ? -(1 + Math.abs(v)) : 1 + Math.abs(v));
      },
      onLeave: function () { loop.timeScale(1); },
      onLeaveBack: function () { loop.timeScale(1); }
    });
  })();

  /* ------------------------------------------------- Kacheln kommen an
     Jedes Raster laesst seine Kacheln versetzt in ihr Fach fallen. Start-
     werte stehen explizit im fromTo: die CSS-Regel .js .tl haelt sie auf 0,
     ein blosses from() wuerde genau diese 0 als Ziel festschreiben.        */
  function land(container, items, startAt, from, to) {
    if (!container || !items.length) return;
    var tw = gsap.fromTo(items,
      from || { opacity: 0, y: 38, scale: .965 },
      to || { opacity: 1, y: 0, scale: 1, duration: .85, ease: "expo.out",
              stagger: { each: .07, from: "start" }, paused: true });
    tw.pause(0);
    ScrollTrigger.create({
      trigger: container, start: startAt || "top 84%",
      onEnter: function () { tw.play(); },
      // Ein Sprung im Scroll (Anker, Tastatur, neu vermessene Seite) kann das
      // Auftauchen ueberspringen. Dann wird es beim naechsten Messen fertig
      // gestellt, statt die Kachel unsichtbar stehen zu lassen.
      onRefresh: function (self) { if (self.progress > 0 || self.isActive) tw.progress(1); }
    });
  }
  land($("#svcsGrid"), $$("#svcsGrid .svc"));
  land($(".vcs__grid"), $$(".vcs__grid .vc"));
  land($(".nws__grid"), $$(".nws__grid .nw"));
  land($(".ctc__grid"), $$(".ctc__grid .tl"));
  // Nur auf der Unterseite Webdesign vorhanden; sonst greift die Null-Pruefung.
  land($("#ofrGrid"), $$("#ofrGrid .tl"), "top 90%");
  land($("#wdsGrid"), $$("#wdsGrid .wd"));
  land($("#whysGrid"), $$("#whysGrid .why"));

  // Die Kundenzellen sind keine eigenen Kacheln, sie gehoeren zu einer Flaeche.
  land($("#clsGrid"), $$(".cls__cell"), "top 84%",
    { opacity: 0, y: 26 },
    { opacity: 1, y: 0, duration: .7, ease: "power3.out", stagger: { each: .04, from: "start" }, paused: true });

  /* ============================================ 3. Leistungen: Neigung
     Die Kachel neigt sich zum Zeiger, der Render hebt sich (CSS).          */
  if (fine && !isPhone) {
    $$("#svcsGrid .svc, #wdsGrid .wd, #whysGrid .why").forEach(function (tile) {
      var rx = gsap.quickTo(tile, "rotationX", { duration: .5, ease: "power3" });
      var ry = gsap.quickTo(tile, "rotationY", { duration: .5, ease: "power3" });
      tile.addEventListener("pointermove", function (e) {
        var r = tile.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - .5;
        var py = (e.clientY - r.top) / r.height - .5;
        rx(-py * 6.5);
        ry(px * 8);
      });
      tile.addEventListener("pointerleave", function () {
        gsap.to(tile, { rotationX: 0, rotationY: 0, duration: .7, ease: "power3.out" });
      });
    });
  }

  /* ==================================== 4. Projekte: FLIP in der Reihe
     Die aktive Kachel nimmt die Reihe ein, die beiden anderen weichen zu
     Streifen. Gemessen wird vor dem Klassenwechsel, animiert wird aus den
     alten Positionen - nur transform, der Inhalt wird gegengerechnet.      */
  (function () {
    var stage = $("#pjsStage"), row = $("#pjsRow");
    if (!stage || !row) return;
    var pjs = $$(".pj", row);
    if (!pjs.length) return;
    var cur = 0;

    function media(p) { return p.querySelector("video"); }

    function playOnly(i) {
      pjs.forEach(function (p, k) {
        var v = media(p);
        if (k === i) {
          if (!v.src) v.src = v.dataset.src;
          v.play().catch(function () { /* Autoplay verweigert: erstes Bild bleibt stehen */ });
        } else {
          v.pause();
        }
      });
    }
    function pauseAll() { pjs.forEach(function (p) { media(p).pause(); }); }

    function mark(i) {
      pjs.forEach(function (p, k) { p.dataset.state = k === i ? "on" : "off"; });
    }

    // Eine schnelle Fahrt kann das Auftauchen mitten im Lauf abschneiden und die
    // Kachel halbdurchsichtig stehen lassen. Wer die Reihe erreicht, sieht sie ganz.
    function flipTo(i) {
      if (i === cur) return;
      var inners = pjs.map(function (p) { return $(".pj__in", p); });
      var first = pjs.map(function (p) { return p.getBoundingClientRect(); });

      // Nur die Lage wird abgeraeumt, nicht das Auftauchen: sonst friert eine
      // schnelle Fahrt in den Abschnitt die Kachel auf halber Deckkraft ein.
      gsap.killTweensOf(pjs, "x,y,scaleX,scaleY,scale");
      gsap.killTweensOf(inners, "x,y,scaleX,scaleY,scale");
      gsap.set(pjs, { clearProps: "transform", opacity: 1 });
      gsap.set(inners, { clearProps: "transform" });

      row.dataset.active = String(i);
      cur = i;
      mark(i);

      var last = pjs.map(function (p) { return p.getBoundingClientRect(); });

      pjs.forEach(function (p, k) {
        var f = first[k], l = last[k], inner = inners[k];
        var sx = l.width ? f.width / l.width : 1;
        var sy = l.height ? f.height / l.height : 1;
        gsap.set(p, { x: f.left - l.left, y: f.top - l.top, scaleX: sx, scaleY: sy, transformOrigin: "0 0" });
        gsap.set(inner, { scaleX: 1 / sx, scaleY: 1 / sy, transformOrigin: "0 0" });
        // 0,6s statt 0,8s: das Fenster der ankommenden Kachel ist damit nach
        // 0,26s breiter als ihre Tafel, und erst dann blendet die Tafel ein
        // (Wartezeit in der CSS-Regel) - so wird kein Satz angeschnitten.
        gsap.to(p, {
          x: 0, y: 0, scaleX: 1, scaleY: 1, duration: .6, ease: "expo.out",
          onUpdate: function () {
            var csx = gsap.getProperty(p, "scaleX") || 1;
            var csy = gsap.getProperty(p, "scaleY") || 1;
            gsap.set(inner, { scaleX: 1 / csx, scaleY: 1 / csy });
          },
          onComplete: function () { gsap.set(inner, { clearProps: "transform" }); }
        });
      });

      playOnly(i);
    }
    window.__vmFlip = flipTo;   // Messhaken fuer die Abnahme im Browser

    if (isPhone) {
      // Telefon: Stapel statt Reihe, jede Kachel spielt in ihrem Fenster.
      pjs.forEach(function (p) {
        var v = media(p);
        ScrollTrigger.create({
          trigger: p, start: "top 85%", end: "bottom top",
          onEnter: function () { if (!v.src) v.src = v.dataset.src; v.play().catch(function () {}); },
          onEnterBack: function () { v.play().catch(function () {}); },
          onLeave: function () { v.pause(); },
          onLeaveBack: function () { v.pause(); }
        });
      });
    } else {
      row.dataset.flip = "on";
      mark(0);
      ScrollTrigger.create({
        trigger: stage, start: "top top",
        end: function () { return "+=" + Math.round(window.innerHeight * 2.1); },
        pin: true, pinSpacing: true, invalidateOnRefresh: true,
        onEnter: function () { playOnly(cur); },
        onEnterBack: function () { playOnly(cur); },
        onLeave: pauseAll,
        onLeaveBack: pauseAll,
        onUpdate: function (self) {
          var i = self.progress < 1 / 3 ? 0 : (self.progress < 2 / 3 ? 1 : 2);
          if (i !== cur) flipTo(i);
        }
      });
      // Beim Herankommen holen sich alle drei ihr erstes Bild; laufen tut nur
      // die aktive Kachel, die ruhenden stehen auf ihrem Standbild.
      ScrollTrigger.create({
        trigger: stage, start: "top 92%", once: true,
        onEnter: function () {
          pjs.forEach(function (p, k) {
            var v = media(p);
            if (v.src) return;
            v.preload = "metadata";
            v.src = v.dataset.src;
            if (k !== cur) v.load();
          });
        }
      });
    }
  })();

  /* ============================== 5. Kunden: Licht laeuft durch die Fugen */
  var grid = $("#clsGrid"), glow = $("#clsGlow");
  if (fine && grid && glow) {
    var gx = gsap.quickTo(glow, "x", { duration: .55, ease: "power3" });
    var gy = gsap.quickTo(glow, "y", { duration: .55, ease: "power3" });
    grid.addEventListener("pointerenter", function (e) {
      var r = grid.getBoundingClientRect();
      gsap.set(glow, { x: e.clientX - r.left, y: e.clientY - r.top });
      gsap.to(glow, { opacity: 1, duration: .35, ease: "power2.out" });
    });
    grid.addEventListener("pointermove", function (e) {
      var r = grid.getBoundingClientRect();
      gx(e.clientX - r.left);
      gy(e.clientY - r.top);
    });
    grid.addEventListener("pointerleave", function () {
      gsap.to(glow, { opacity: 0, duration: .45, ease: "power2.out" });
    });
  }

  /* ------------------------------------------------- Film im Heldenraster
     Der Streifen ist Teil des ersten Bildschirms, aber nicht seiner Last:
     die Quelle wird erst nach dem Laden gesetzt.                            */
  (function () {
    var film = $("#heroFilm");
    if (!film) return;
    function start() {
      if (!film.src) film.src = film.dataset.src;
      film.play().catch(function () {});
    }
    window.addEventListener("load", function () {
      if (window.requestIdleCallback) window.requestIdleCallback(start, { timeout: 1400 });
      else window.setTimeout(start, 700);
    });
    ScrollTrigger.create({
      trigger: "#hero", start: "top bottom", end: "bottom top",
      onLeave: function () { film.pause(); },
      onEnterBack: function () { if (film.src) film.play().catch(function () {}); }
    });
  })();

  /* Wenn Schriften und Bilder stehen, sind die Hoehen andere: einmal neu messen. */
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });

})();
