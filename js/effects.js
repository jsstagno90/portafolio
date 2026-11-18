// js/effects.js
// Efectos visuales: animación del hero (un chatbot que se arma solo),
// aparición de secciones al scrollear y el brillo que sigue al mouse.
(function () {
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- aparición al scrollear ----------
  var toReveal = document.querySelectorAll('.reveal, .card, .xp__item');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    toReveal.forEach(function (el, i) {
      el.classList.add('will-reveal');
      // las tarjetas de una misma grilla entran escalonadas
      if (el.classList.contains('card') || el.classList.contains('xp__item')) el.style.transitionDelay = (i % 3) * 80 + 'ms';
      io.observe(el);
    });
  }

  // ---------- brillo que sigue al mouse ----------
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest && e.target.closest('.spot, .card');
    if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  // ---------- en el celu, el botón flotante no tapa el chat de la demo ----------
  var ragChat = document.getElementById('ragChat');
  if (ragChat && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      document.body.classList.toggle('fab-off', entries[0].isIntersecting);
    }).observe(ragChat);
  }

  // ---------- animación del hero ----------
  var demo = document.getElementById('heroDemo');
  if (!demo) return;
  var $ = function (id) { return document.getElementById(id); };
  var persona = $('dPersona'), file = $('dFile'), prog = $('dProg'), steps = $('dSteps'), tiles = $('dTiles'), chat = $('dChat');
  var stepEls = steps.querySelectorAll('span');

  var PERSONA = 'Sos Brasita, el asistente de Brasa Tostadores. Recomendá cafés con buena onda.';
  var QUESTION = '¿Qué café me recomendás para filtro?';
  var ANSWER = '¡El Etiopía Yirgacheffe! ☕ Tueste claro, con notas florales y a limón, ideal para V60. Sale $14.500 y quedan 18.';
  var N_TILES = 28, HIT = 9;

  for (var i = 0; i < N_TILES; i++) tiles.appendChild(document.createElement('i'));
  var tileEls = tiles.querySelectorAll('i');

  var run = 0;            // cada vuelta tiene su id; si cambia, la vuelta vieja se corta
  var visible = true;
  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }
  // espera, pero se "congela" mientras la animación no está en pantalla
  async function wait(ms, id) {
    await sleep(ms);
    while (!visible || document.hidden) { await sleep(300); }
    if (id !== run) throw new Error('cancel');
  }
  async function type(el, text, speed, id) {
    for (var i = 1; i <= text.length; i++) {
      el.textContent = text.slice(0, i);
      await wait(speed, id);
    }
  }
  function bubble(kind) {
    var b = document.createElement('div');
    b.className = 'dmsg dmsg--' + kind;
    chat.appendChild(b);
    requestAnimationFrame(function () { b.classList.add('in'); });
    return b;
  }

  function reset() {
    demo.classList.remove('is-done', 'is-fade');
    persona.textContent = '';
    file.classList.remove('in');
    prog.style.width = '0%';
    stepEls.forEach(function (s) { s.className = ''; });
    tileEls.forEach(function (t) { t.className = ''; });
    chat.innerHTML = '';
  }

  // Estado final, sin animar (para quien tiene "reducir movimiento")
  function finalState() {
    persona.textContent = PERSONA;
    file.classList.add('in');
    prog.style.width = '100%';
    stepEls.forEach(function (s) { s.className = 'ok'; });
    tileEls.forEach(function (t, i) { t.className = 'on vec' + (i === HIT ? ' hit' : ''); });
    bubble('user').textContent = QUESTION;
    var b = bubble('bot');
    b.textContent = ANSWER;
    b.insertAdjacentHTML('beforeend', '<span class="dsrc">catalogo-brasa.pdf · fragmento #' + (HIT + 1) + ' · 0.82</span>');
    demo.classList.add('is-done');
  }

  async function loop() {
    var id = ++run;
    try {
      while (true) {
        reset();
        await wait(500, id);
        await type(persona, PERSONA, 22, id);
        await wait(350, id);

        // subir el PDF
        file.classList.add('in');
        await wait(250, id);
        for (var p = 0; p <= 100; p += 5) { prog.style.width = p + '%'; await wait(28, id); }

        // 1. extracción
        stepEls[0].className = 'run'; await wait(450, id); stepEls[0].className = 'ok';
        // 2. chunks: aparecen los fragmentos
        stepEls[1].className = 'run';
        for (var c = 0; c < N_TILES; c++) { tileEls[c].className = 'on'; await wait(26, id); }
        stepEls[1].className = 'ok';
        // 3. embeddings: cada fragmento se "convierte" en vector
        stepEls[2].className = 'run';
        for (var v = 0; v < N_TILES; v++) { tileEls[v].className = 'on vec'; await wait(30, id); }
        stepEls[2].className = 'ok';
        // 4. índice
        stepEls[3].className = 'run'; await wait(380, id); stepEls[3].className = 'ok';
        demo.classList.add('is-done');
        await wait(500, id);

        // pregunta
        var u = bubble('user');
        await type(u, QUESTION, 30, id);
        await wait(300, id);

        // búsqueda: se ilumina el fragmento más parecido
        tileEls.forEach(function (t) { t.classList.add('dim'); });
        for (var s = 0; s < 3; s++) {
          var r = Math.floor(Math.random() * N_TILES);
          tileEls[r].classList.add('scan'); await wait(140, id); tileEls[r].classList.remove('scan');
        }
        tileEls[HIT].classList.add('hit');
        await wait(300, id);

        // respuesta escrita de a palabras, como si viniera en streaming
        var b = bubble('bot');
        b.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
        await wait(800, id);
        b.textContent = '';
        var words = ANSWER.split(' ');
        for (var w = 1; w <= words.length; w++) { b.textContent = words.slice(0, w).join(' '); await wait(55, id); }
        b.insertAdjacentHTML('beforeend', '<span class="dsrc">catalogo-brasa.pdf · fragmento #' + (HIT + 1) + ' · 0.82</span>');

        await wait(4200, id);
        demo.classList.add('is-fade');
        await wait(600, id);
      }
    } catch (e) { /* cancelado */ }
  }

  if (reduced) { finalState(); return; }

  // Solo anima cuando se ve: no gasta CPU con la animación fuera de pantalla
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(demo);
  }
  loop();
})();
