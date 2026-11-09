const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============ Прелоадер ============ */
// Логотип заливается слева направо по ходу загрузки первого экрана (шрифты + фото),
// заливка тянется к прогрессу плавно (lerp), а не прыгает. Когда залился — падает красная точка,
// потом снимаем is-loading: шторка уходит вверх, первый экран начинает своё появление (всё в CSS).
(function preloader() {
  const el = document.getElementById('preloader');
  const fill = document.getElementById('preloaderFill');
  if (!el || !root.classList.contains('is-loading')) return;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  // Повторный заход в той же вкладке — короче, чтобы не раздражать
  let seen = false;
  try { seen = sessionStorage.getItem('tochka-seen') === '1'; sessionStorage.setItem('tochka-seen', '1'); } catch (e) {}
  const MIN = reduce ? 0 : seen ? 450 : 1300;   // мс: чтобы заливка успела считаться глазом
  const MAX = 5000;                             // потолок: не висеть дольше, что бы ни случилось
  const t0 = performance.now();

  // Векторный логотип вставляем inline — так можно отдельно уронить точку
  fetch(fill.dataset.src || 'images/tild6166-3066-4637-a137-303936363762__photo.svg')
    .then((r) => r.text())
    .then((svg) => {
      fill.innerHTML = svg;
      fill.querySelectorAll('[fill="#E73233"]').forEach((p) => p.classList.add('p-dot'));
    })
    .catch(() => {});

  let fontsOk = false, posterOk = false, done = false, shown = 0;
  document.fonts.ready.then(() => { fontsOk = true; });
  const poster = new Image();
  poster.onload = poster.onerror = () => { posterOk = true; };
  poster.src = 'images/tild3935-3861-4865-b239-653362353735__005.jpg';

  const finish = () => {
    if (done) return;
    done = true;
    fill.style.clipPath = 'inset(0 0% 0 0)';
    el.classList.add('is-dotted');
    setTimeout(() => {
      root.classList.remove('is-loading');
      window.dispatchEvent(new Event('site:ready'));
      setTimeout(() => { el.style.display = 'none'; }, 1100);
    }, reduce ? 0 : 650);
  };

  let last = t0;
  const tick = (now) => {
    if (done) return;
    const elapsed = now - t0;
    const dt = Math.min((now - last) / 1000, 0.25);   // кламп: после паузы вкладки не прыгать, но и на слабом устройстве не тормозить
    last = now;
    const ready = fontsOk && posterOk;
    // По времени тянемся максимум к 90%, остальное — когда всё реально загрузилось
    const target = ready && elapsed >= MIN ? 1 : Math.min(0.9, elapsed / Math.max(MIN, 1) * 0.9);
    shown += (target - shown) * (1 - Math.exp(-9 * dt));   // одинаково при 30, 60 и 120 кадрах
    fill.style.clipPath = `inset(0 ${(1 - shown) * 100}% 0 0)`;
    if (shown > 0.995 || elapsed > MAX) finish();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

/* ============ Шапка ============ */
const header = document.getElementById('header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* ============ Мобильное меню ============ */
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
let lenis = null;
const lockScroll = (on) => {
  // Одного overflow мало: Lenis крутит страницу сам, его тоже останавливаем
  document.body.style.overflow = on ? 'hidden' : '';
  if (lenis) on ? lenis.stop() : lenis.start();
};
const setMenu = (open) => {
  burger.setAttribute('aria-expanded', open);
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  nav.classList.toggle('is-open', open);
  lockScroll(open);
};
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });

/* ============ Появление блоков ниже первого экрана ============ */
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-in');
    io.unobserve(entry.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll('main > section:not(.hero) .reveal').forEach((el, i) => {
  el.style.transitionDelay = `${Math.min(i, 5) * 0.12}s`;
  io.observe(el);
});

/* ============ Галерея проекта ============ */
(function lightbox() {
  const box = document.getElementById('lightbox');
  const img = document.getElementById('lbImg');
  const title = document.getElementById('lbTitle');
  const count = document.getElementById('lbCount');
  const tags = document.getElementById('lbTags');
  const thumbs = document.getElementById('lbThumbs');
  let project = null, index = 0, lastFocus = null;

  const show = (i) => {
    const list = project.images;
    index = (i + list.length) % list.length;
    img.classList.add('is-swap');
    const next = new Image();
    next.onload = () => {
      img.src = next.src;
      img.alt = `Проект «${project.name}», фото ${index + 1}`;
      img.classList.remove('is-swap');
    };
    next.src = 'images/' + list[index];
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
    thumbs.querySelectorAll('button').forEach((b, k) => b.classList.toggle('is-on', k === index));
    const on = thumbs.children[index];
    if (on) thumbs.scrollTo({ left: on.offsetLeft - thumbs.clientWidth / 2 + on.clientWidth / 2, behavior: 'smooth' });
  };

  const open = (p) => {
    project = window.PROJECTS[p];
    lastFocus = document.activeElement;
    title.textContent = `Проект «${project.name}»`;
    tags.textContent = project.tags;
    thumbs.innerHTML = project.images
      .map((src, k) => `<button type="button" aria-label="Фото ${k + 1}"><img src="images/${src}" alt="" loading="lazy"></button>`)
      .join('');
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('is-open'));
    lockScroll(true);
    show(0);
    document.getElementById('lbClose').focus();
  };

  const close = () => {
    box.classList.remove('is-open');
    lockScroll(false);
    setTimeout(() => { box.hidden = true; img.removeAttribute('src'); }, 450);
    if (lastFocus) lastFocus.focus();
  };

  document.querySelectorAll('.pcard').forEach((card) => {
    card.addEventListener('click', () => open(+card.dataset.project));
  });
  document.getElementById('lbClose').addEventListener('click', close);
  document.getElementById('lbPrev').addEventListener('click', () => show(index - 1));
  document.getElementById('lbNext').addEventListener('click', () => show(index + 1));
  thumbs.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) show([...thumbs.children].indexOf(b));
  });

  // Свайп на телефоне
  let x0 = null;
  img.parentElement.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  img.parentElement.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!box.hidden) close(); else setMenu(false); }
    if (box.hidden) return;
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  });
})();

/* ============ Плавный скролл и сцены (GSAP + ScrollTrigger + Lenis) ============ */
// Скрипты подключены с defer и идут до этого файла, так что здесь они уже есть (если CDN доступен).
(function scenes() {
  if (!window.gsap || !window.ScrollTrigger) return;   // без библиотек сайт остаётся в простом виде
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Lenis только на мыши: на таче у системы своя инерция, поверх неё прокрутка становится вязкой
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (!touch && !reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));   // gsap.ticker отдаёт секунды
    gsap.ticker.lagSmoothing(0);
    if (root.classList.contains('is-loading')) lenis.stop();
    window.addEventListener('site:ready', () => lenis.start(), { once: true });
  }

  // Якоря — через Lenis, иначе обычная прокрутка дерётся с инерцией
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    const target = hash.length > 1 && document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    const top = hash === '#top' ? 0 : target;
    if (lenis) lenis.scrollTo(top, { offset: hash === '#top' ? 0 : -10, duration: 1.4 });
    else window.scrollTo({ top: hash === '#top' ? 0 : target.getBoundingClientRect().top + scrollY - 10, behavior: 'smooth' });
  });

  if (reduce) return;   // без анимаций: блоки стоят в простом виде

  // Сцены с закреплением — только на широких экранах; на телефоне и планшете блоки в потоке
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px)', () => {
    root.classList.add('has-scenes');

    /* --- Портфолио: лента карточек едет справа налево, заголовок «прогоняется» лентой --- */
    const pf = document.querySelector('.portfolio');
    const stage = pf.querySelector('.portfolio__stage');
    const track = document.getElementById('pfTrack');
    const head = pf.querySelector('.portfolio__head');
    const cards = gsap.utils.toArray('.pcard', track);
    const counter = document.getElementById('pfCurrent');
    const startX = () => window.innerWidth * 0.42;
    const endX = () => -(track.scrollWidth - window.innerWidth * 0.94);   // последняя карточка встаёт у правого края
    const dist = () => startX() - endX();

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pf, start: 'top top', end: () => '+=' + dist() * 1.1,
        pin: stage, scrub: 1, invalidateOnRefresh: true, refreshPriority: 2, anticipatePin: 1,
        onUpdate: (self) => {
          const i = Math.min(cards.length, Math.max(1, Math.round(self.progress * (cards.length - 1)) + 1));
          counter.textContent = String(i).padStart(2, '0');
        },
      },
    });
    // Заголовок едет ровно с лентой, как её начало: расстояние до первой карточки не меняется, наездов нет
    tl.fromTo(track, { x: startX }, { x: endX, ease: 'none', duration: 1 }, 0)
      .fromTo(head, { x: 0 }, { x: () => -dist(), ease: 'none', duration: 1 }, 0);
    // Карточки, которые видны сразу, поднимаются при подходе к блоку; остальные въезжают справа с лентой
    const firstVisible = cards.filter((c) => startX() + c.offsetLeft < window.innerWidth);
    gsap.fromTo([head, ...firstVisible], { autoAlpha: 0, y: 70 }, {
      autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: pf, start: 'top 65%', toggleActions: 'play none none reverse' },
    });
    // Параллакс фото внутри карточки: картинка чуть отстаёт от рамки
    cards.forEach((c) => {
      tl.fromTo(c.querySelector('img'), { xPercent: -7 }, { xPercent: 7, ease: 'none', duration: 1 }, 0);
    });

    /* --- Этапы: степпер. Крупная цифра меняется, кадр в арке — шторкой снизу --- */
    const st = document.querySelector('.stages');
    const bigs = gsap.utils.toArray('.sbig', st);
    const shots = gsap.utils.toArray('.sshot', st);
    const items = gsap.utils.toArray('.sitem', st);
    const bar = document.getElementById('stagesBar');
    const N = bigs.length;
    gsap.set(bigs, { autoAlpha: 0, y: 50 });
    gsap.set(bigs[0], { autoAlpha: 1, y: 0 });
    gsap.set(shots, { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(shots[0], { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(shots.map((s) => s.querySelector('img')), { scale: 1.18 });
    gsap.set(shots[0].querySelector('img'), { scale: 1 });
    let current = -1;
    const mark = (i) => {
      if (i === current) return;
      current = i;
      items.forEach((it, k) => it.classList.toggle('is-on', k === i));
      bar.style.transform = `scaleY(${(i + 1) / N})`;
    };
    mark(0);
    const stl = gsap.timeline({
      scrollTrigger: {
        trigger: st, start: 'top top', end: () => '+=' + window.innerHeight * N * 0.6,
        pin: st.querySelector('.stages__stage'), scrub: 1, invalidateOnRefresh: true, refreshPriority: 1, anticipatePin: 1,
        // Активный пункт считаем от прогресса, а не set()-ами в таймлайне: те не откатываются при скролле вверх
        onUpdate: (self) => mark(Math.min(N - 1, Math.floor(self.progress * N))),
      },
    });
    for (let i = 1; i < N; i++) {
      const at = i / N;
      stl.to(bigs[i - 1], { autoAlpha: 0, y: -50, duration: 0.05 }, at - 0.04)
        .to(bigs[i], { autoAlpha: 1, y: 0, duration: 0.06 }, at)
        .to(shots[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.08, ease: 'power2.inOut' }, at - 0.03)
        .to(shots[i].querySelector('img'), { scale: 1, duration: 0.14, ease: 'power2.out' }, at - 0.03);
    }
    stl.to({}, { duration: 0.04 });

    return () => root.classList.remove('has-scenes');
  });

  // Пересчёт после шрифтов и полной загрузки: до них высоты другие
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
