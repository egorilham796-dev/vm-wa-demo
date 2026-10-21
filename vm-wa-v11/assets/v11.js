/* V&M V11 - движок прокрутки: сглаживание, «пластины» с подгонкой cover, слово между слоями, слайдер услуг.
   Каждый кадр пишет только transform / opacity / visibility прямо в элементы (гайд 16.10: без blur и переменных на корне). */
(function(){
  'use strict';
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ss = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (s, a, b, c, d) => { const en = ss(a, b, s), ex = ss(c, d, s); return { en, ex, on: en * (1 - ex) }; };
  const n2 = n => (+n).toFixed(2), n4 = n => (+n).toFixed(4);

  function vis(el, o){ const v = o > 0.002 ? 'visible' : 'hidden'; if (el._v !== v) { el.style.visibility = v; el._v = v; } }
  function O(el, o){ if (!el) return; o = clamp(o); const v = n4(o); if (el._o !== v) { el.style.opacity = v; el._o = v; } vis(el, o); }
  // T - сдвиг в px и масштаб; C - то же для элементов, центрированных через -50%
  function T(el, x, y, s, o){ if (!el) return; const v = 'translate3d(' + n2(x || 0) + 'px,' + n2(y || 0) + 'px,0) scale(' + n4(s === undefined ? 1 : s) + ')'; if (el._t !== v) { el.style.transform = v; el._t = v; } if (o !== undefined) O(el, o); }
  function C(el, x, y, s, o){ if (!el) return; const v = 'translate3d(calc(-50% + ' + n2(x || 0) + 'px),calc(-50% + ' + n2(y || 0) + 'px),0) scale(' + n4(s === undefined ? 1 : s) + ')'; if (el._t !== v) { el.style.transform = v; el._t = v; } if (o !== undefined) O(el, o); }

  const BASE = (document.currentScript && document.currentScript.src || '').replace(/v11\.js.*$/, '');
  // шесть услуг с их сайта (тексты и ссылки как на vm-wa.de)
  const SERVICES = [
    ['Grafikdesign', 'svc-01-grafik', 'Grafikdesign ist essenziell für eine erfolgreiche Online-Präsenz, denn es zieht Kunden an und stärkt die Markenidentität.', 'https://vm-wa.de/grafikdesign/'],
    ['Webdesign', 'svc-02-webdesign', 'Ein professionelles Webdesign mit WordPress bietet unzählige Möglichkeiten.', 'https://vm-wa.de/webdesign/'],
    ['Webentwicklung', 'svc-03-dev', 'Von der Landingpage bis zur komplexen Webanwendung, zu transparenten Preisen.', 'https://vm-wa.de/webentwicklung-und-technische-umsetzung/'],
    ['Foto und Video', 'svc-04-foto', 'Ein Business-Fotoshooting hebt die Marke hervor und schafft Vertrauen. Hochwertige Bilder tragen Ihre Botschaft auf Webseiten, in Marketingmaterialien und in sozialen Medien.', ''],
    ['Soziale Netzwerke', 'svc-05-social', 'Gezielte Instagram Werbung, Meta Business Suite, Facebook und Google Ads.', 'https://vm-wa.de/soziale-netzwerke/'],
    ['360-Grad-Marketing', 'svc-06-360', 'Lösungen, die alle Aspekte des modernen Marketings abdecken, von SEO bis Influencer Marketing. Maßgeschneiderte Strategien für Ihre Sichtbarkeit im Netz.', '']
  ];

  // X - центрирование только по горизонтали (left:50%)
  function X(el, x, y, s, o){ if (!el) return; const v = 'translate3d(calc(-50% + ' + n2(x || 0) + 'px),' + n2(y || 0) + 'px,0) scale(' + n4(s === undefined ? 1 : s) + ')'; if (el._t !== v) { el.style.transform = v; el._t = v; } if (o !== undefined) O(el, o); }

  const VM = window.VM = { clamp, ss, lerp, seg, T, C, X, O, $: s => document.querySelector(s), $$: s => [...document.querySelectorAll(s)] };

  VM.run = function(cfg){
    const section = document.querySelector('.cinema-scroll');
    section.style.height = 'calc(100vh + ' + cfg.length + 'px)';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const plates = VM.$$('[data-plate]'), words = VM.$$('[data-word]');
    const G = { s: 0, mx: 0, my: 0, W: innerWidth, H: innerHeight, plates: {} };
    let target = 0, smooth = 0, init = false, raf = false, tMX = 0, tMY = 0, mx = 0, my = 0;
    const K = cfg.ease || 0.14;

    function layout(){
      G.W = innerWidth; G.H = innerHeight;
      plates.forEach(p => {
        const [iw, ih] = p.dataset.plate.split('x').map(Number);
        const host = p.parentElement, hw = host.clientWidth, hh = host.clientHeight;
        const fx = +(p.dataset.fx || 0.5), fy = +(p.dataset.fy || 0.5), over = +(p.dataset.over || 1);
        const k = Math.max(hw / iw, hh / ih) * over, pw = iw * k, ph = ih * k, l = (hw - pw) * fx, t = (hh - ph) * fy;
        Object.assign(p.style, { width: pw + 'px', height: ph + 'px', left: l + 'px', top: t + 'px' });
        const g = { k, w: pw, h: ph, l, t, hw, hh, el: p };
        g.x = fr => l + fr * pw; g.y = fr => t + fr * ph;   // доля картинки -> px хоста
        p._g = g; if (p.id) G.plates[p.id] = g;
      });
      words.forEach(w => {
        const frac = +(w.dataset.word || 0.9);
        w.style.fontSize = '100px';
        const host = w.closest('[data-plate]'), g = host && host._g;
        const hostW = g ? g.hw : innerWidth;
        w.style.fontSize = (100 * Math.min(hostW * frac, +(w.dataset.max || 1e9)) / w.scrollWidth) + 'px';
        if (g) {
          const cx = w.dataset.wx !== undefined ? g.x(+w.dataset.wx) : hostW / 2;
          w.style.left = (cx - g.l - w.offsetWidth / 2) + 'px';
          if (w.dataset.wy !== undefined) w.style.top = (+w.dataset.wy * g.h) + 'px';
        }
      });
      const hdr = document.querySelector('.site-header');
      if (hdr) document.querySelectorAll('.sights-slider,.sights-head,.sights-controls').forEach(e => e.style.setProperty('--slider-top', (hdr.offsetHeight + 74) + 'px'));
      if (cfg.layout) cfg.layout(G);
    }

    const dist = () => clamp(-section.getBoundingClientRect().top, 0, section.offsetHeight - innerHeight);
    function update(){
      raf = false;
      target = dist();
      if (!init || reduce.matches) { smooth = target; init = true; } else smooth = lerp(smooth, target, K);
      if (Math.abs(smooth - target) < 0.08) smooth = target;
      mx = lerp(mx, tMX, 0.1); my = lerp(my, tMY, 0.1);
      G.s = smooth; G.mx = reduce.matches ? 0 : mx; G.my = reduce.matches ? 0 : my;
      cfg.update(smooth, G);
      if (Math.abs(smooth - target) > 0.08 || Math.abs(mx - tMX) > 0.0008 || Math.abs(my - tMY) > 0.0008) tick();
    }
    function tick(){ if (!raf) { raf = true; requestAnimationFrame(update); } }
    VM.tick = tick;
    // для проверок: мгновенно в точку без сглаживания
    VM.jump = y => { scrollTo(0, section.offsetTop + y); target = smooth = dist(); tMX = tMY = mx = my = 0; G.s = smooth; G.mx = G.my = 0; cfg.update(smooth, G); return smooth; };
    VM.length = cfg.length;

    // ссылки шапки ведут в точку прокрутки: data-s="px"
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-s]'); if (!a) return;
      e.preventDefault(); scrollTo({ top: section.offsetTop + (+a.dataset.s), behavior: 'smooth' });
    });

    addEventListener('scroll', tick, { passive: true });
    addEventListener('resize', () => { layout(); slider.place(); tick(); });
    addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; tMX = e.clientX / innerWidth - 0.5; tMY = e.clientY / innerHeight - 0.5; tick(); }, { passive: true });

    const slider = setupSlider();
    layout(); tick();
    const fonts = ['800 100px Syne', '700 20px Syne', '400 16px Poppins', '500 16px Poppins'].map(f => document.fonts.load(f));
    Promise.all(fonts).then(() => { layout(); slider.place(); init = false; tick(); document.documentElement.dataset.ready = '1'; });
    const yq = +new URLSearchParams(location.search).get('y'); if (yq) setTimeout(() => VM.jump(yq), 900);
    return G;
  };

  // бесконечный слайдер услуг (из V9): карточка со ссылкой открывает страницу, без ссылки раскрывает текст
  function setupSlider(){
    const track = document.querySelector('.sights-track');
    const api = { place(){} };
    if (!track) return api;
    if (!track.children.length) SERVICES.forEach(([t, img, p, href], i) => {
      const a = document.createElement('article');
      a.className = 'sight-card'; a.tabIndex = 0; a.setAttribute('role', href ? 'link' : 'button');
      if (href) a.dataset.href = href;
      a.innerHTML = '<span class="sight-kicker">Leistung 0' + (i + 1) + '</span><img class="sight-pin" src="' + BASE + 'img/' + img + '.webp" alt=""><h3>' + t + '</h3><p>' + p + '</p>' + (href ? '<span class="go" aria-hidden="true">&#8599;</span>' : '');
      track.appendChild(a);
    });
    const originals = [...track.children], N = originals.length; let cards = [], active = N;
    track.replaceChildren();
    for (let set = 0; set < 3; set++) originals.forEach((c, i) => { const k = c.cloneNode(true); k.dataset.i = set * N + i; if (set !== 1) { k.setAttribute('aria-hidden', 'true'); k.tabIndex = -1; } track.appendChild(k); });
    cards = [...track.children];
    function place(){ if (!cards[0]) return; const w = cards[0].offsetWidth, gap = parseFloat(getComputedStyle(track).columnGap || '0'); track.style.setProperty('--shift', (-(w + gap) * active) + 'px'); }
    function activate(c){
      if (track.dataset.swiped) return;
      if (c.dataset.href) { window.open(c.dataset.href, '_blank', 'noopener'); return; }
      const open = !c.classList.contains('is-open');
      cards.forEach(k => k.classList.remove('is-open'));
      if (open) c.classList.add('is-open');
      active = +c.dataset.i; place();
    }
    const move = d => { active += d; place(); };
    function jump(i){ track.classList.add('is-jumping'); active = i; place(); requestAnimationFrame(() => requestAnimationFrame(() => track.classList.remove('is-jumping'))); }
    cards.forEach(c => { c.addEventListener('click', () => activate(c)); c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(c); } }); });
    track.addEventListener('transitionend', e => { if (e.target !== track) return; if (active >= N * 2) jump(active - N); else if (active < N) jump(active + N); });
    let x0 = null;
    track.addEventListener('pointerdown', e => { x0 = e.clientX; });
    track.addEventListener('pointerup', e => { if (x0 !== null && Math.abs(e.clientX - x0) > 40) { move(e.clientX < x0 ? 1 : -1); track.dataset.swiped = '1'; setTimeout(() => delete track.dataset.swiped, 50); } x0 = null; });
    const p = document.getElementById('prev'), n = document.getElementById('next');
    if (p) p.addEventListener('click', () => move(-1));
    if (n) n.addEventListener('click', () => move(1));
    api.place = place; place();
    return api;
  }
})();
