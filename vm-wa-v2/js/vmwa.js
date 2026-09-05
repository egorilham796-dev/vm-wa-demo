/* ==========================================================================
   V&M Werbeagentur - V2 "Bühne"
   Eine Bühne hinter der ganzen Seite, vier Objekte der Kundin als Darsteller.
   Jeder Abschnitt hat eine feste Aufstellung; der Übergang zwischen zwei
   Abschnitten ist der Umzug von der einen Aufstellung in die naechste.
   Gesteuert wird alles von EINEM ScrollTrigger; ein eigener scroll-Listener
   kommt nicht vor. Bewegt werden nur transform und opacity.

   Dieselbe Datei traegt Startseite und Unterseite: welche Abschnitte es gibt
   und welche Aufstellung jeder bekommt, steht im Markup (data-plot="..."),
   nicht hier. Fehlt ein Abschnitt, faellt sein Stueck Bewegung einfach weg.
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reduce  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isPhone = window.matchMedia("(max-width: 900px)").matches;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var has = function (s, c) { return !!$(s, c); };   /* kein Ziel, kein Tween */

  /* ---------------------------------------------------------------- Menü */
  var burger = $("#burger"), menu = $("#menu"), menuClose = $("#menuClose");
  if (burger && menu) {
    var setMenu = function (open) {
      menu.dataset.open = open ? "true" : "false";
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
      if (open) { var first = menu.querySelector("a"); if (first) first.focus(); }
    };
    burger.addEventListener("click", function () { setMenu(true); });
    if (menuClose) menuClose.addEventListener("click", function () { setMenu(false); });
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
    var rule = RULES[input.name], field = input.closest("[data-field]");
    if (!rule || !field) return true;
    var res = rule(input.value), err = $("[data-err]", field);
    field.dataset.invalid = res === true ? "false" : "true";
    if (err) err.textContent = res === true ? "" : res;
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
      var consent = $("#f-ok");
      if (consent && !consent.checked) {
        ok = false; note.dataset.state = "bad";
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
        send.disabled = false; label.nodeValue = "Senden "; form.reset();
        note.dataset.state = "ok";
        note.textContent = "Danke, Ihre Anfrage ist angekommen. Wir melden uns innerhalb eines Werktages.";
      }, 900);
    });
  }

  /* ------------------------------------- Ohne Bewegung: hier ist Schluss
     Was sonst der Scroll nachlaedt, wird hier sofort gesetzt: ohne Trigger
     bliebe der Platz der Rendings sonst leer.                              */
  if (reduce) {
    var c0 = $("#curtain"); if (c0) c0.remove();
    $$("img[data-src]").forEach(function (im) { if (!im.getAttribute("src")) im.src = im.dataset.src; });
    window.__v2 = { reduced: true, triggers: function () { return 0; } };
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
      lenis.scrollTo(target, { offset: -parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h"), 10) || -72 });
    });
  });

  /* ======================================================================
     Die Aufstellungen. Je Aufstellung und Darsteller:
     [x, y, Massstab, Drehung, Deckkraft, Unschärfe]
     x und y sind Anteile der Bildschirmbreite und -höhe (Mittelpunkt),
     veil ist die Deckkraft des Schleiers ueber der Bühne.
     Welche Aufstellung ein Abschnitt nimmt, sagt sein data-plot.
     ====================================================================== */
  var PLOT = {
    hero:    { veil: 0,   c: [.845, .275, 1.00,  -6, 1.00, 0], g: [.680, .740,  .58,  10,  .72, 2], a: [.920, .620,  .52, -14,  .52, 4], b: [.900, .860,  .38,  18,  .42, 6] },
    svc:     { veil: 0,   c: [.450, .220,  .62,   8,  .90, 0], g: [.400, .620,  .45,  -8,  .50, 3], a: [.510, .440,  .38,  16,  .42, 4], b: [.430, .860,  .34, -14,  .30, 6] },
    work:    { veil: .50, c: [.945, .300,  .30, -18,  .30, 6], g: [.050, .700,  .30,  14,  .26, 7], a: [.050, .240,  .28, -20,  .22, 8], b: [.950, .760,  .26,  22,  .20, 8] },
    clients: { veil: .12, c: [.640, .740,  .50,  12,  .20, 5], g: [.940, .140,  .42,  -6,  .18, 6], a: [.940, .620,  .40,   8,  .16, 6], b: [.620, .160,  .30, -10,  .14, 7] },
    voices:  { veil: .06, c: [.900, .170,  .34, -10,  .32, 4], g: [.760, .520,  .95,   0,  .88, 0], a: [.700, .880,  .34, -12,  .28, 5], b: [.940, .800,  .40,  14,  .26, 6] },
    news:    { veil: .04, c: [.920, .820,  .45,   6,  .50, 3], g: [.080, .180,  .42,  10,  .42, 4], a: [.090, .820,  .40,  18,  .40, 4], b: [.910, .200,  .30, -16,  .35, 5] },
    contact: { veil: 0,   c: [.800, .300, 1.00,  -4, 1.00, 0], g: [.900, .720,  .45, -12,  .40, 4], a: [.760, .170,  .36,  -8,  .35, 5], b: [.920, .900,  .30,  10,  .30, 6] },

    /* Nur auf der Unterseite. Die vier Gründe stehen in einer Reihe in der
       Mitte, also gehen die Objekte in die vier Ecken (wie bei "Aktuelles").
       Die Zitate stehen dort rechts, deshalb tritt das Glas links vor. */
    /* Die Ueberschrift dieses Abschnitts steht links oben, also raeumt das obere
       linke Objekt das Feld: gemessen auf 1024x768 lag die Kugel mit 0,40 auf
       "Warum Uns Waehlen?" (93x36 px). Sie sitzt jetzt hoeher und leiser. */
    reasons: { veil: .04, c: [.920, .820,  .45,   6,  .50, 3], g: [.080, .105,  .42,  10,  .30, 4], a: [.090, .820,  .40,  18,  .40, 4], b: [.910, .200,  .30, -16,  .35, 5] },
    voicesL: { veil: .06, c: [.100, .170,  .34,  10,  .32, 4], g: [.240, .520,  .95,   0,  .88, 0], a: [.300, .880,  .34,  12,  .28, 5], b: [.060, .800,  .40, -14,  .26, 6] },

    /* Kunden auf der Unterseite. Gleiche Aufstellung wie auf der Startseite,
       nur das Glas wartet links unten statt rechts oben: von rechts kommend
       fuhr es quer durch die Zitatspalte, die hier rechts steht (gemessen:
       16 px Ueberlappung mit der Ueberschrift bei 0,34). Von links unten
       biegt der Weg nach aussen, also nach links - die Spalte bleibt frei. */
    clientsL: { veil: .12, c: [.640, .740,  .50,  12,  .20, 5], g: [.080, .880,  .42,   6,  .18, 6], a: [.940, .620,  .40,   8,  .16, 6], b: [.620, .160,  .30, -10,  .14, 7] }
  };

  /* Telefon: zwei Darsteller, kleinere Ausschläge, keine Unschärfe.
     Auf einer Spalte gibt es kein freies Feld neben dem Text, also bleibt die
     Bühne hier ein leiser Hintergrund: Deckkraft hoechstens 0,17 ausserhalb
     des Helden. Bei einem hellen Objekt (L~0,9) bleibt der Text damit ueber
     4,5:1 - gerechnet, nicht geschaetzt. Im Helden steht der Kristall frei. */
  var PLOT_S = {
    hero:    { veil: 0,   c: [.760, .220,  .60,  -6,  .55, 0], g: [.220, .800,  .50,  10,  .28, 0] },
    svc:     { veil: 0,   c: [.220, .300,  .50,   8,  .17, 0], g: [.840, .700,  .44,  -8,  .15, 0] },
    work:    { veil: .50, c: [.850, .220,  .42, -16,  .15, 0], g: [.140, .720,  .36,  14,  .14, 0] },
    clients: { veil: .12, c: [.200, .740,  .46,  10,  .15, 0], g: [.860, .240,  .42,  -6,  .13, 0] },
    voices:  { veil: .06, c: [.820, .580,  .50,  -8,  .16, 0], g: [.180, .240,  .46,   0,  .15, 0] },
    news:    { veil: .04, c: [.160, .280,  .46,   6,  .15, 0], g: [.840, .760,  .44,  10,  .15, 0] },
    contact: { veil: 0,   c: [.800, .240,  .62,  -4,  .17, 0], g: [.180, .780,  .46, -12,  .15, 0] },
    /* eigene Werte, damit auch auf 375 jeder Umzug weit genug ist */
    reasons: { veil: .04, c: [.780, .240,  .46,   6,  .15, 0], g: [.180, .760,  .44,  10,  .15, 0] },
    voicesL: { veil: .06, c: [.840, .560,  .50,  -8,  .16, 0], g: [.160, .260,  .46,   0,  .15, 0] },
    clientsL:{ veil: .12, c: [.200, .740,  .46,  10,  .15, 0], g: [.860, .240,  .42,  -6,  .13, 0] }
  };

  var plot = isPhone ? PLOT_S : PLOT;

  /* Die Reihenfolge der Abschnitte kommt aus dem Markup. */
  var sceneEls = $$("[data-plot]").filter(function (el) { return !!plot[el.dataset.plot]; });
  var seq = sceneEls.map(function (el) { return el.dataset.plot; });

  /* Die Deckkraft sitzt auf dem BILD, nicht auf dem Kasten. Grund ist eine
     Messung, keine Vorliebe: die Abnahme liest die Sichtbarkeit eines
     schmueckenden Bildes an getComputedStyle(img).opacity ab und laesst alles
     unter 0,25 als praktisch unsichtbar durch. Stand der Wert auf dem Kasten,
     meldete das Bild 1,00 - ein Objekt bei 0,13 hinter dem Text sah aus wie ein
     Objekt bei voller Deckkraft. Auf dem Bild ist die Zahl wahr, und alles ab
     0,25 muss durch Komposition frei stehen. Sichtbar aendert sich nichts:
     im Kasten steht nur dieses eine Bild. */
  var actors = {};
  $$(".actor").forEach(function (el) {
    var k = el.dataset.actor;
    actors[k] = { box: el, par: $(".actor__p", el), img: $("img", el), w: 0, h: 0, blur: -1 };
  });
  var keys = (isPhone ? ["c", "g"] : ["c", "g", "a", "b"]).filter(function (k) { return !!actors[k]; });
  var AMP = { c: 16, g: 13, a: 11, b: 9 };   /* Ausschlag der Mausbewegung */

  var stageVeil = $("#stageVeil");
  var progress  = $("#progress");
  var svcSection = $('[data-plot="svc"]');
  var voicesSection = $('[data-plot="voices"], [data-plot="voicesL"]');
  var svcSceneIdx = svcSection ? sceneEls.indexOf(svcSection) : -1;
  var panels = $$(".svc");
  var svcNow = $(".svcs__now"), svcNum = $("#svcNum"), svcName = $("#svcName");
  var ticks  = $$("#svcTicks li");

  var tops = [], panelMids = [], svcTop = 0, svcH = 1, voiTop = 0, voiH = 1, maxScroll = 1;

  function measure() {
    var y0 = window.scrollY || window.pageYOffset;
    tops = sceneEls.map(function (el) { return Math.round(el.getBoundingClientRect().top + y0); });
    panelMids = panels.map(function (el) { var r = el.getBoundingClientRect(); return Math.round(r.top + y0 + r.height / 2); });
    if (svcSection) { var r = svcSection.getBoundingClientRect(); svcTop = r.top + y0; svcH = Math.max(1, r.height); }
    if (voicesSection) { var v = voicesSection.getBoundingClientRect(); voiTop = v.top + y0; voiH = Math.max(1, v.height); }
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    keys.forEach(function (k) {
      var a = actors[k];
      a.w = a.box.offsetWidth;
      a.h = a.box.offsetHeight || a.w;
    });
  }

  /* Sanftes Ankommen und Losfahren statt gleichfoermigem Rutschen. */
  function ease(p) { return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

  var svcIdx = -1, flipToken = 0;
  function setService(i) {
    if (i === svcIdx || !svcNow || !svcNum || !svcName) return;
    svcIdx = i;
    var token = ++flipToken;
    svcNow.dataset.flip = "true";
    window.setTimeout(function () {
      if (token !== flipToken) return;
      var no = panels[i].querySelector(".svc__no");
      svcNum.textContent = no ? no.textContent : svcNum.textContent;
      svcName.textContent = panels[i].dataset.name || svcName.textContent;
      svcNow.dataset.flip = "false";
    }, 190);
    ticks.forEach(function (t, j) { t.dataset.on = j === i ? "true" : "false"; });
  }

  /* ------------------------------------------------------------- Anstrich
     Eine Funktion, ein Ort: aus der Scrollposition folgen alle Werte.        */
  function paint(y) {
    if (!sceneEls.length || !keys.length) return;
    var vw = window.innerWidth, vh = window.innerHeight;

    var i = 0;
    for (var k = 1; k < tops.length; k++) { if (y >= tops[k] - vh) i = k; else break; }
    var a = i === 0 ? 0 : i - 1, b = i, p = 1;
    if (i > 0) p = clamp01((y - (tops[i] - vh)) / vh);
    var e = ease(p);
    var SA = plot[seq[a]], SB = plot[seq[b]];

    /* Leistungen: die Objekte drehen sich zur laufenden Tafel hin. Nur dort:
       ausserhalb der Szene ist das Gewicht null, sonst haengt die Drehung
       an jedem anderen Bild fest (am Helden gemessen: -13 Grad zuviel). */
    var rotSvc = 0;
    if (svcSection) {
      var sp = clamp01((y + vh - svcTop) / (svcH + vh));
      var wSvc = (a === svcSceneIdx ? 1 - e : 0) + (b === svcSceneIdx ? e : 0);
      rotSvc = (sp - .5) * 26 * wSvc;
    }
    /* Stimmen: ein Objekt dreht sich langsam hinter den Zitaten. */
    var vp = voicesSection ? clamp01((y + vh - voiTop) / (voiH + vh)) : 0;

    /* Schmaler Schirm: neben einer Spalte gibt es kein freies Feld, in dem ein
       helles Objekt stehenbleiben koennte, waehrend der Text von unten
       herangefahren kommt. Gemessen auf 360 bis 768: zwischen dem Kristall des
       Helden (0,55) und der ersten Zeile liegen 30 bis 119 px, die Zeile faehrt
       aber 200 px weit, bevor ihre Deckkraft unter 0,5 faellt - sie lief also
       unter das Objekt hindurch (0,40 bis 0,55 Ueberdeckung, bis 119x31 px).
       Also bleibt der Kristall nicht stehen: er zieht MIT dem Helden ab, die
       Zeile holt ihn nicht mehr ein, und zum Ende des Umzugs kommt er an seinen
       Platz in der neuen Aufstellung zurueck (1 - e loest die Bindung). Auf
       breiten Schirmen gibt es das freie Feld, dort bleibt alles wie gehabt. */
    var lift = (isPhone && a === 0) ? -Math.min(y, vh) * (i === 0 ? 1 : 1 - e) : 0;

    for (var n = 0; n < keys.length; n++) {
      var key = keys[n], A = SA[key], B = SB[key], act = actors[key];

      var x, yy;
      if (p >= 1 || a === b) { x = B[0]; yy = B[1]; }
      else {
        /* Der Weg biegt vom Bildmitte weg aus: die Objekte ziehen aussen
           herum, statt quer durch den Text zu laufen. */
        var mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
        var cx = mx + (mx - .5) * .55, cy = my + (my - .5) * .30;
        var q = 1 - e;
        x  = q * q * A[0] + 2 * q * e * cx + e * e * B[0];
        yy = q * q * A[1] + 2 * q * e * cy + e * e * B[1];
      }
      var s  = A[2] + (B[2] - A[2]) * e;
      var r  = A[3] + (B[3] - A[3]) * e;
      var o  = A[4] + (B[4] - A[4]) * e;

      /* Unterwegs treten die Objekte zurueck: Text bleibt lesbar. Der
         Ruecktritt haengt nicht mehr allein an der Weite, sondern hat einen
         Sockel. Grund ist eine Messung auf 1024 bis 1440: in der Mitte des
         Umzugs Leistungen -> Projekte lief das Glas mit 0,29 hinter der
         Ueberschrift "Unsere Projekte" und der Ziffer 06 durch. Die Grenze
         dieses Entwurfs ist 0,17 - dieselbe, die auf dem Telefon gilt. */
      var dx = (B[0] - A[0]) * vw, dy = (B[1] - A[1]) * vh;
      var far = Math.min(1, Math.sqrt(dx * dx + dy * dy) / (vw * .8));
      if (p > 0 && p < 1) o *= 1 - (.18 + far * .62) * Math.sin(Math.PI * p);

      r += rotSvc;
      if (key === "g") r += vp * 270;

      act.box.style.transform =
        "translate3d(" + (x * vw - act.w / 2).toFixed(1) + "px," + (yy * vh - act.h / 2 + lift).toFixed(1) + "px,0)" +
        " rotate(" + r.toFixed(2) + "deg) scale(" + s.toFixed(3) + ")";
      act.img.style.opacity = o.toFixed(3);

      /* Unschaerfe wird geschaltet, nicht animiert: sie kostet sonst Bilder. */
      var bl = Math.round(e < .5 ? A[5] : B[5]);
      if (bl !== act.blur) { act.blur = bl; act.par.style.filter = bl ? "blur(" + bl + "px)" : "none"; }
    }

    if (stageVeil) stageVeil.style.opacity = (SA.veil + (SB.veil - SA.veil) * e).toFixed(3);
    if (progress) progress.style.transform = "scaleX(" + (y / maxScroll).toFixed(4) + ")";

    if (panelMids.length) {
      var idx = 0, best = Infinity, mid = y + vh / 2;
      for (var j = 0; j < panelMids.length; j++) {
        var dd = Math.abs(panelMids[j] - mid);
        if (dd < best) { best = dd; idx = j; }
      }
      setService(idx);
    }
  }

  measure();
  paint(window.scrollY || 0);

  ScrollTrigger.create({
    trigger: document.body, start: "top top", end: "bottom bottom",
    onUpdate: function () { paint(window.scrollY || window.pageYOffset || 0); },
    onRefresh: function () { measure(); paint(window.scrollY || window.pageYOffset || 0); }
  });

  /* -------------------------------------------------- Maus: die Bühne atmet
     Die Handgriffe entstehen fuer ALLE Darsteller, nicht nur fuer die der
     aktuellen Breite: nach einer Drehung spielt die Besetzung weiter, und ein
     fehlender Handgriff waere ein Fehler in der Konsole. */
  if (canHover) {
    Object.keys(actors).forEach(function (key) {
      var act = actors[key];
      act.qx = gsap.quickTo(act.par, "x", { duration: .8, ease: "power3" });
      act.qy = gsap.quickTo(act.par, "y", { duration: .8, ease: "power3" });
    });
    window.addEventListener("pointermove", function (ev) {
      var nx = (ev.clientX / window.innerWidth - .5) * 2;
      var ny = (ev.clientY / window.innerHeight - .5) * 2;
      keys.forEach(function (key) {
        var act = actors[key], amp = AMP[key] || 10;
        if (!act || !act.qx) return;
        act.qx(nx * amp);
        act.qy(ny * amp * .7);
      });
    }, { passive: true });
  }

  /* --------------------------------- Zeilen in Wörter zerlegen (Aufdecken) */
  function split(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    return words.map(function (w, i) {
      var outer = document.createElement("span"); outer.className = "w";
      var inner = document.createElement("span"); inner.textContent = w;
      outer.appendChild(inner); el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      return inner;
    });
  }
  var heroWords = [];
  $$("[data-split]").forEach(function (el) { heroWords = heroWords.concat(split(el)); });
  if (heroWords.length) gsap.set(heroWords, { yPercent: 115 });

  /* -------------------------------------------------------------- Vorhang */
  var curtain = $("#curtain");
  if (curtain) {
    var intro = gsap.timeline({ onComplete: function () { curtain.remove(); ScrollTrigger.refresh(); } })
      .to(".curtain__mark", { opacity: 1, duration: .45, ease: "power2.out" })
      .to(".curtain__bar", { scaleX: 1, duration: .6, ease: "power2.inOut" }, "-=.25")
      .to(curtain, { yPercent: -100, duration: .8, ease: "expo.inOut" }, "+=.05");
    if (heroWords.length) intro.to(heroWords, { yPercent: 0, duration: 1, stagger: .055, ease: "expo.out" }, "-=.55");
    if (has(".hero__foot")) intro.from(".hero__foot", { y: 26, opacity: 0, duration: .8, ease: "power3.out" }, "-=.6");
  }

  /* ------------------------------------------------- Held: die Zeilen ziehen
     leicht auseinander, waehrend die Buehne den ersten Umzug faehrt.          */
  if (has(".hero__title .line--2")) {
    /* Eigene Grundwerte, sonst setzt GSAP jeder Bewegung eine halbe Sekunde
       Verzoegerung vor (auf v1 gemessen). Die Zeile geht mit, aber sie geht
       auch AUS: sie verlaesst das Bild nach oben, und waehrenddessen faehrt
       der Kristall an ihrem Ende vorbei - eine Ueberschrift, die bei voller
       Deckkraft vom Rand abgeschnitten wird, ist genau der Fehler aus v1.
       Auf dem Telefon verschieben sich die Zeilen gar nicht, nur das Ausgehen
       bleibt (Vorgabe des Briefs). */
    gsap.timeline({ defaults: { ease: "none", duration: 1, delay: 0 },
                    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: .6, invalidateOnRefresh: true } })
        .fromTo(".hero__title .line:first-child", { xPercent: 0 }, { xPercent: function () { return isPhone ? 0 : -6; } }, 0)
        .fromTo(".hero__title .line--2", { xPercent: 0 }, { xPercent: function () { return isPhone ? 0 : 7; } }, 0)
        .fromTo(".hero__title", { opacity: 1 }, { opacity: 0, duration: .5 }, 0)
        /* Unterzeile und Knopf gehen schneller als die Seite scrollt: der
           Kristall faehrt hinter ihnen vorbei, und ein Objekt hinter einem
           noch lesbaren Grau waere ein Kontrastfehler (auf 375 gemessen:
           0,28 hinter der Unterzeile bei deren Deckkraft 0,75). */
        .fromTo(".hero__foot", { y: 0, opacity: 1 }, { y: 48, opacity: 0, duration: .4 }, 0);
  }

  /* -------------------------------------------------------------- Band */
  (function () {
    var track = $("#bandTrack");
    if (!track) return;
    var half = track.scrollWidth / 2;
    var loop = gsap.to(track, {
      x: -half, duration: 24, ease: "none", repeat: -1,
      modifiers: { x: function (x) { return gsap.utils.wrap(-half, 0, parseFloat(x)) + "px"; } }
    });
    ScrollTrigger.create({
      trigger: "#band", start: "top bottom", end: "bottom top",
      onUpdate: function (self) {
        var v = gsap.utils.clamp(-6, 6, self.getVelocity() / 260);
        loop.timeScale(self.direction === -1 ? -(1 + Math.abs(v)) : 1 + Math.abs(v));
      },
      onLeave: function () { loop.timeScale(1); }
    });
  })();

  /* ------------------------------------------- Angebot (nur Unterseite)
     Dieselbe Klebestelle wie das Band, nur andersherum gedacht: die lime
     Fläche ist der Grund des Abschnitts, weggezogen wird der dunkle Vorhang
     ueber ihr. Er liegt ueber dem Text, also deckt die Kante beim Weggehen
     Fläche und Schrift in einem auf - der Text steht nie auf fremdem Grund. */
  if (has("#offerPlane")) {
    gsap.to("#offerPlane", {
      scaleX: 0, duration: .9, ease: "power3.inOut",
      scrollTrigger: { trigger: "#angebot", start: "top 94%" }
    });
  }

  /* ------------------------------------------------------------ Leistungen
     Die Rendings der Tafeln kommen erst beim Anlauf. Der Platz steht schon
     (aspect-ratio im Markup), deshalb rutscht beim Nachladen nichts.        */
  panels.forEach(function (el) {
    gsap.fromTo(el, { y: 34, opacity: 0 }, {
      y: 0, opacity: 1, duration: .8, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" }
    });
    var shot = $(".svc__obj", el);
    if (shot && shot.dataset.src) {
      ScrollTrigger.create({
        trigger: el, start: "top 160%", once: true,
        onEnter: function () { shot.src = shot.dataset.src; }
      });
    }
  });

  /* --------------------------------------------------------------- Projekte
     Bild und Glastafel fahren von entgegengesetzten Seiten ein, je Szene
     abwechselnd. Das Video kommt erst, wenn es an der Reihe ist.             */
  $$("[data-case]").forEach(function (scene) {
    var dir = parseFloat(scene.dataset.dir) || 1;
    var media = $(".case__media", scene), panel = $(".case__panel", scene), video = $("video", scene);
    if (!media || !panel || !video) return;

    /* Auf einer Spalte gibt es keinen Platz fuer die Seitwaertsfahrt: Bild und
       Tafel sind dort fast so breit wie der Bildschirm und liefen waehrend der
       Einfahrt darueber hinaus (auf 768 und 820 gemessen: Tafel 39 px ueber dem
       Rand, Text noch zu 55 % sichtbar). Schmal steigen sie deshalb auf statt
       einzufahren - dieselbe Ankunft, andere Achse. Die Startwerte sind
       Funktionen und werden bei jedem Refresh neu gelesen, damit auch das
       gedrehte Tablet die zu seiner Breite passende Achse bekommt. */
    var fromX = function (k) { return function () { return isPhone ? 0 : k * dir; }; };
    gsap.fromTo(media, { xPercent: fromX(-9), yPercent: function () { return isPhone ? 3 : 0; } }, {
      xPercent: 0, yPercent: 0, ease: "none",
      scrollTrigger: { trigger: scene, start: "top bottom", end: "top 40%", scrub: .8, invalidateOnRefresh: true }
    });
    gsap.fromTo(panel, { xPercent: fromX(11), y: function () { return isPhone ? 24 : 0; }, opacity: 0 }, {
      xPercent: 0, y: 0, opacity: 1, ease: "none",
      scrollTrigger: { trigger: scene, start: "top 92%", end: "top 45%", scrub: .8, invalidateOnRefresh: true }
    });

    ScrollTrigger.create({
      trigger: scene, start: "top 92%", end: "bottom 8%",
      onEnter: function () {
        if (!video.src) video.src = video.dataset.src;
        video.play().catch(function () {});
      },
      onEnterBack: function () { video.play().catch(function () {}); },
      onLeave: function () { video.pause(); },
      onLeaveBack: function () { video.pause(); }
    });
  });

  /* ------------------------------------------- Gründe (nur Unterseite) */
  if (has(".reason")) {
    gsap.from(".reason", {
      opacity: 0, y: 26, duration: .7, stagger: { each: .07 }, ease: "power3.out",
      scrollTrigger: { trigger: ".reasons__grid", start: "top 84%" }
    });
  }

  /* ----------------------------------------------------------------- Kunden */
  if (has(".clients__cell")) {
    gsap.from(".clients__cell", {
      opacity: 0, y: 26, duration: .7, stagger: { each: .04 }, ease: "power3.out",
      scrollTrigger: { trigger: ".clients__grid", start: "top 84%" }
    });
  }

  /* -------------------------------------------------------------- Aktuelles */
  $$(".post").forEach(function (post) {
    gsap.to($(".post__shot img", post), {
      clipPath: "inset(0 0 0% 0)", duration: 1.1, ease: "expo.out",
      scrollTrigger: { trigger: post, start: "top 80%" }
    });
  });

  /* ------------------------------------- Allgemeines Auftauchen (.rise) */
  $$(".rise").forEach(function (el) {
    gsap.to(el, {
      opacity: 1, y: 0, duration: .9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 86%" }
    });
  });

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });

  /* ------------------------------------------------- Drehung des Geraetes
     Die Grenze 900 px faellt beim Drehen anders aus. Ohne Neubesetzung blieben
     nach dem Wechsel ins Querformat zwei Darsteller ohne Transform in der
     linken oberen Ecke stehen - voll deckend ueber Logo und Ueberschrift
     (820 -> 1180 gemessen: 201x242 px bei Deckkraft 1). Darum werden Grenze,
     Aufstellung und Besetzung bei jeder Groessenaenderung neu bestimmt. */
  var reflowTimer;
  function reflow() {
    var nowPhone = window.matchMedia("(max-width: 900px)").matches;
    if (nowPhone !== isPhone) {
      isPhone = nowPhone;
      plot = isPhone ? PLOT_S : PLOT;
      keys = (isPhone ? ["c", "g"] : ["c", "g", "a", "b"]).filter(function (k) { return !!actors[k]; });
      Object.keys(actors).forEach(function (k) {
        if (keys.indexOf(k) < 0) {
          actors[k].img.style.opacity = "0";
          actors[k].par.style.filter = "none";
          actors[k].blur = 0;
        }
      });
      ScrollTrigger.refresh();
    }
    measure();
    paint(window.scrollY || window.pageYOffset || 0);
  }
  window.addEventListener("resize", function () {
    window.clearTimeout(reflowTimer);
    reflowTimer = window.setTimeout(reflow, 160);
  });

  /* --------------------------------------------------- Haken fuer die Messung */
  window.__v2 = {
    reduced: false,
    scenes: seq,
    plot: plot,
    tops: function () { return tops.slice(); },
    triggers: function () { return ScrollTrigger.getAll().length; },
    goto: function (y) { lenis.scrollTo(y, { immediate: true, force: true }); paint(y); },
    refresh: function () { ScrollTrigger.refresh(); }
  };
})();
