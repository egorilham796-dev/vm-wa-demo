/* ==========================================================================
   V&M Werbeagentur - Scroll-Bühne
   Alles Scroll-Getriebene läuft über GSAP ScrollTrigger, kein eigener
   scroll-Listener. Lenis glättet das Rad und meldet jede Bewegung an
   ScrollTrigger, damit Pin und Scrub im selben Takt laufen.

   Dieselbe Datei bedient Startseite und Unterseite. Jeder Block prüft erst,
   ob seine Knoten da sind: fehlt eine Sektion, bleibt der Block still.
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isPhone = window.matchMedia("(max-width: 900px)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------- Menü */
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
  }

  /* ------------------------------------------------- Ohne Bewegung: Schluss */
  if (reduce) {
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

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -Math.max(64, parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 72) });
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
  if (heroWords.length) gsap.set(heroWords, { yPercent: 115 });

  /* -------------------------------------------------------------- Vorhang */
  var curtain = $("#curtain");
  var heroFoot = $(".hero__foot");
  var intro = gsap.timeline({ onComplete: function () { if (curtain) curtain.remove(); ScrollTrigger.refresh(); } });
  if (curtain) {
    intro.to(".curtain__mark", { opacity: 1, duration: .45, ease: "power2.out" })
         .to(".curtain__bar", { scaleX: 1, duration: .6, ease: "power2.inOut" }, "-=.25")
         .to(curtain, { yPercent: -100, duration: .8, ease: "expo.inOut" }, "+=.05");
  }
  // Die Überschrift steigt hinter dem Vorhang hervor: ein Bewegungsfluss, kein zweiter Auftritt.
  if (heroWords.length) intro.to(heroWords, { yPercent: 0, duration: 1, stagger: .055, ease: "expo.out" }, curtain ? "-=.55" : 0);
  if (heroFoot) intro.from(heroFoot, { y: 26, opacity: 0, duration: .8, ease: "power3.out" }, "-=.6");

  /* ------------------------------------------ Fortschritt am oberen Rand */
  if ($("#progress")) {
    gsap.to("#progress", {
      scaleX: 1, ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: .3 }
    });
  }

  /* -------------------------------------------------------------- 1. Held
     Die Kamera fährt zwischen die beiden Zeilen hindurch: Zeile eins weicht
     nach links oben, Zeile zwei nach rechts unten, die Bühne wächst.
     Das erzählt den Übergang, statt die Sektion nur auszublenden.            */
  if ($("#hero") && $("#heroStage")) {
    // Правило приёмки: элемент, покидающий экран, гаснет раньше, чем режется краем.
    // На телефоне строки не сдвигаются вовсе - только гашение и лёгкий наезд.
    var HX = isPhone ? 0 : 6, HY = isPhone ? 0 : 26, HS = isPhone ? 1.06 : 1.14;
    ScrollTrigger.create({
      trigger: "#hero", start: "top top", end: "+=90%", pin: "#heroStage", pinSpacing: true,
      animation: gsap.timeline({ defaults: { ease: "none", duration: 1, delay: 0 } })   // глобальные gsap.defaults сюда не проникают
        .to(".hero__title .line--1", { xPercent: -HX, yPercent: -HY, ease: "none" }, 0)
        .to(".hero__title .line--2", { xPercent: HX, yPercent: HY, ease: "none" }, 0)
        .fromTo(".hero__title", { opacity: 1 }, { opacity: 0, duration: .45, ease: "none" }, 0)   // гаснет за половину хода, до выхода за край
        // Explizite Startwerte: der Vorhang haelt die Zeile beim Aufbau noch auf 0,
        // ein blosses .to() wuerde genau diese 0 als Ausgangspunkt festschreiben.
        .fromTo(".hero__foot", { y: 0, opacity: 1 }, { y: 40, opacity: 0, duration: .45, ease: "none" }, 0)
        .to("#heroStage", { scale: HS, ease: "none" }, 0)
        .to(".hero__glow", { scale: 1.6, opacity: .35, ease: "none" }, 0),
      scrub: .6, invalidateOnRefresh: true
    });

    // Tiefe: die Objekte laufen unterschiedlich schnell, das erzeugt Raum.
    $$(".hero__obj").forEach(function (obj) {
      gsap.to(obj, {
        yPercent: -100 * parseFloat(obj.dataset.depth) * 3,
        rotate: parseFloat(obj.dataset.depth) * 26,
        ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 1 }
      });
    });
  }

  /* -------------------------------------------------------------- 2. Band
     Endlose Schleife, deren Tempo an der Scroll-Geschwindigkeit hängt und
     deren Richtung mit der Scroll-Richtung kippt.  (nur Startseite)          */
  (function () {
    var track = $("#bandTrack");
    if (!track) return;
    var half = track.scrollWidth / 2;
    var loop = gsap.to(track, { x: -half, duration: 22, ease: "none", repeat: -1,
      modifiers: { x: function (x) { return gsap.utils.wrap(-half, 0, parseFloat(x)) + "px"; } } });
    ScrollTrigger.create({
      trigger: "#band", start: "top bottom", end: "bottom top",
      onUpdate: function (self) {
        var v = gsap.utils.clamp(-6, 6, self.getVelocity() / 260);
        loop.timeScale(self.direction === -1 ? -(1 + Math.abs(v)) : 1 + Math.abs(v));
      },
      onLeave: function () { loop.timeScale(1); }
    });
    // CSS gibt die Grundneigung von -1.6deg vor, hier laeuft sie auf +1.6deg durch.
    gsap.fromTo("#band", { rotation: 0 }, { rotation: 3.2, ease: "none",
      scrollTrigger: { trigger: "#band", start: "top bottom", end: "bottom top", scrub: 1.2 } });
  })();

  /* -------------------------------------------------- 3. Leistungen (Fahrt)
     Senkrechtes Scrollen wird zur waagerechten Fahrt durch sechs Tafeln.
     Auf dem Telefon nicht: dort ist der Stapel die bessere Bedienung.        */
  (function () {
    var view = $("#svcsView"), track = $("#svcsTrack");
    if (isPhone || !view || !track) return;
    // Последняя панель встаёт с тем же полем, что и первая: считаем от её правого края, не от scrollWidth
    var dist = function () { var last = track.lastElementChild, gut = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      return Math.max(0, last.offsetLeft + last.offsetWidth + gut - view.clientWidth); };
    gsap.to(track, {
      x: function () { return -dist(); }, ease: "none",
      scrollTrigger: {
        trigger: view, start: "top top", end: function () { return "+=" + dist(); },
        pin: true, scrub: 1, invalidateOnRefresh: true,
        // Остановка приземляет на ближайшую панель: в покое ни одна панель не режется краем
        snap: { snapTo: function (v) { var n = track.children.length - 1; return Math.round(v * n) / n; }, duration: { min: .2, max: .5 }, ease: "power2.out" },
        onUpdate: function (self) { gsap.set("#svcsRail", { scaleX: self.progress }); }
      }
    });
  })();

  /* ------------------------------------------- 3b. Angebot (Unterseite)
     Die Markenfläche liegt schon da, fortgezogen wird die dunkle Decke.
     So ist der dunkle Text auf Gelb nie unsichtbar.                          */
  (function () {
    var plane = $("#offerPlane");
    if (!plane) return;
    gsap.fromTo(plane,
      { scaleX: 1, transformOrigin: "100% 50%" },
      { scaleX: 0, ease: "none",
        scrollTrigger: { trigger: "#angebot", start: "top 88%", end: "top 42%", scrub: .6 } });
  })();

  /* ------------------------------------------------ 4. Projekte (Filmszenen)
     Jede Szene liegt sticky. Das Video setzt sich beim Eintreten von 1.18 auf
     1.0 (die Kamera kommt zur Ruhe), die Glastafel fährt herein, die vorige
     Szene tritt zurück. Geladen wird ein Video erst, wenn es an der Reihe ist. */
  $$("[data-case]").forEach(function (scene, i, all) {
    var video = $("video", scene);

    ScrollTrigger.create({
      trigger: scene, start: "top 80%", end: "bottom top",
      onEnter: function () {
        if (!video.src) video.src = video.dataset.src;
        video.play().catch(function () { /* Autoplay verweigert: Poster bleibt stehen */ });
      },
      onEnterBack: function () { video.play().catch(function () {}); },
      onLeave: function () { video.pause(); },
      onLeaveBack: function () { video.pause(); }
    });

    gsap.fromTo(video, { scale: 1.18 }, {
      scale: 1, ease: "none",
      scrollTrigger: { trigger: scene, start: "top bottom", end: "top top", scrub: 1 }
    });

    gsap.from($(".case__panel", scene), {
      y: 70, opacity: 0, duration: 1, ease: "expo.out",
      scrollTrigger: { trigger: scene, start: "top 55%" }
    });

    // Die Szene tritt zurück, sobald die nächste aufsteigt: der Rahmen bleibt
    // deckend, nur eine dunkle Lage legt sich darüber. Das Bild fährt leicht weg.
    if (i < all.length - 1) {
      var recede = { trigger: all[i + 1], start: "top bottom", end: "top top", scrub: true };
      gsap.to($(".case__veil", scene), { opacity: .8, ease: "none", scrollTrigger: recede });
      gsap.to($(".case__media", scene), { scale: 1.06, ease: "none", scrollTrigger: recede });
    }
  });

  /* -------------------------------------- 4b. Textszenen (Unterseite)
     Dieselbe Kamerasprache ohne Film: das Objekt setzt sich von 1.14 auf 1.0,
     die Glastafel fährt herein, die weichende Szene bekommt die Vuaille.      */
  $$("[data-scene]").forEach(function (scene, i, all) {
    var shot = $(".scene__media img", scene);
    var panel = $(".scene__panel", scene);

    if (shot) {
      gsap.fromTo(shot, { scale: 1.14 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: scene, start: "top bottom", end: "top top", scrub: 1 }
      });
    }
    if (panel) {
      gsap.from(panel, {
        y: 70, opacity: 0, duration: 1, ease: "expo.out",
        scrollTrigger: { trigger: scene, start: "top 55%" }
      });
    }
    if (i < all.length - 1) {
      var recede = { trigger: all[i + 1], start: "top bottom", end: "top top", scrub: true };
      gsap.to($(".scene__veil", scene), { opacity: .82, ease: "none", scrollTrigger: recede });
      gsap.to($(".scene__media", scene), { scale: 1.06, ease: "none", scrollTrigger: recede });
    }
  });

  /* ------------------------------- 4c. Warum uns wählen (Unterseite) */
  if ($(".reasons__grid")) {
    gsap.from(".reason", {
      opacity: 0, y: 30, duration: .7, stagger: .07, ease: "power3.out",
      scrollTrigger: { trigger: ".reasons__grid", start: "top 82%" }
    });
    gsap.to(".reasons__deco", {
      rotation: 90, ease: "none",
      scrollTrigger: { trigger: ".reasons", start: "top bottom", end: "bottom top", scrub: 1 }
    });
  }

  /* ------------------------------------------------------------ 5. Kunden */
  if ($(".clients__grid")) {
    gsap.from(".clients__cell", {
      opacity: 0, y: 30, duration: .7, stagger: { each: .045, from: "start" }, ease: "power3.out",
      scrollTrigger: { trigger: ".clients__grid", start: "top 82%" }
    });
  }

  /* --------------------------------------------------- 6. Stimmen (Stapel)
     Echter Sticky-Stapel: jede Karte bleibt oben stehen und schrumpft, wenn
     die nächste ankommt.                                                     */
  (function () {
    var cards = $$("[data-voice]");
    cards.forEach(function (card, i) {
      if (i === cards.length - 1) return;
      var st = { trigger: cards[i + 1], start: "top bottom", end: "top top", scrub: true };
      gsap.to(card, { scale: .94, ease: "none", scrollTrigger: st });
      // Abdunkeln statt durchsichtig machen, damit die naechste Karte nicht durchscheint.
      gsap.to(card.querySelector(".voice__veil"), { opacity: .82, ease: "none", scrollTrigger: st });
    });
  })();

  /* --------------------------------------------------------- 7. Aktuelles
     Das Bild wird aufgezogen statt eingeblendet: die Kante läuft nach oben. */
  $$(".post").forEach(function (post) {
    gsap.to($(".post__shot img", post), {
      clipPath: "inset(0 0 0% 0)", duration: 1.1, ease: "expo.out",
      scrollTrigger: { trigger: post, start: "top 78%" }
    });
    gsap.from($("h3", post), { y: 24, opacity: 0, duration: .8, ease: "power3.out",
      scrollTrigger: { trigger: post, start: "top 78%" } });
  });

  /* ----------------------------------------------------------- 8. Kontakt
     Die Markenfläche zieht als Vorhang durch und legt den Abschluss frei.   */
  if ($("#sweep") && $("#kontakt")) {
  // Однократный вайп при входе секции: скраб парковал плоскость на любом промежуточном положении скролла
  var sweepTl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } })
      .fromTo("#sweep", { scaleY: 0, transformOrigin: "50% 0%" },   { scaleY: 1, duration: .55 })
      .fromTo("#sweep", { scaleY: 1, transformOrigin: "50% 100%" }, { scaleY: 0, duration: .65 });
  ScrollTrigger.create({ trigger: "#kontakt", start: "top 78%", once: true, onEnter: function () { sweepTl.play(); } });
  }

  /* ------------------------------------- Allgemeines Auftauchen (.rise) */
  $$(".rise").forEach(function (el) {
    gsap.to(el, {
      opacity: 1, y: 0, duration: .9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%" }
    });
  });

  /* --------------------------------- Nach dem Laden aller Bilder neu messen */
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
