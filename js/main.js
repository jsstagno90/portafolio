// js/main.js
// Dibuja la página a partir de data/profile.js y maneja el chat y el match.
(function () {
  var P = window.PROFILE;
  var API = '/api/chat';

  // ---------- utilidades ----------
  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function ext(url, label) {
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + ' ↗</a>';
  }
  function projectById(id) {
    for (var i = 0; i < P.projects.length; i++) if (P.projects[i].id === id) return P.projects[i];
    return null;
  }

  async function post(body) {
    // Abierto como archivo (file://) no hay servidor que responda
    if (location.protocol === 'file:') {
      throw new Error('El asistente funciona cuando la web está publicada (Vercel o "vercel dev").');
    }
    var res;
    try {
      res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error('No me pude conectar con el asistente.');
    }
    var data = null;
    try { data = await res.json(); } catch (e) { /* respuesta no JSON */ }
    if (!res.ok || !data) {
      var msg = (data && data.error) || 'El asistente no está disponible en este momento.';
      if (res.status === 404) msg = 'El asistente funciona cuando la web está publicada en Vercel.';
      throw new Error(msg);
    }
    return data;
  }

  // ---------- hero ----------
  $('#heroLocation').textContent = P.location;
  $('#heroRole').textContent = P.role;
  $('#heroTagline').textContent = P.tagline;
  var liveCount = P.projects.filter(function (p) { return p.live; }).length;
  $('#heroStats').innerHTML = [
    ['' + P.projects.length, 'proyectos destacados'],
    ['' + liveCount, 'en producción'],
    ['' + P.projects.filter(function (p) { return p.stack.join(' ').match(/Gemini|OpenAI|MCP/); }).length, 'con IA integrada']
  ].map(function (s) { return '<li><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></li>'; }).join('');

  // ---------- proyectos ----------
  function decisionsHtml(p) {
    if (!p.decisions || !p.decisions.length) return '';
    return '<details class="decisions"><summary>Decisiones técnicas (' + p.decisions.length + ')</summary><ol>' +
      p.decisions.map(function (d) {
        return '<li class="decision"><dl>' +
          '<dt class="p">Problema</dt><dd>' + esc(d.problem) + '</dd>' +
          '<dt class="d">Decisión</dt><dd>' + esc(d.decision) + '</dd>' +
          '<dt class="w">Por qué</dt><dd>' + esc(d.why) + '</dd>' +
          '</dl></li>';
      }).join('') + '</ol></details>';
  }

  function projectHtml(p) {
    var links = [];
    if (p.live) links.push(ext(p.live, 'Ver demo'));
    if (p.repo) links.push(ext(p.repo, 'Código'));
    if (p.extraLink) links.push(ext(p.extraLink.url, p.extraLink.label));

    var body =
      '<p class="card__kind">' + esc(p.kind) + '</p>' +
      '<h3>' + esc(p.name) + '</h3>' +
      '<p>' + esc(p.summary) + '</p>' +
      (p.metrics ? '<div class="metrics">' + p.metrics.map(function (m) { return '<span class="metric">' + esc(m) + '</span>'; }).join('') + '</div>' : '') +
      '<ul class="tags">' + p.stack.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      decisionsHtml(p) +
      '<div class="card__links">' + links.join('') + '</div>';

    if (!p.featured) {
      return '<article class="card" id="project-' + esc(p.id) + '">' + body + '</article>';
    }
    var visual = p.image
      ? '<div class="card__visual"><img src="' + esc(p.image) + '" alt="Captura de ' + esc(p.name) + '" loading="lazy"></div>'
      : '<div class="card__visual card__visual--placeholder"><div><div class="visual-name">' + esc(p.name) + '</div>' +
        '<div class="visual-metrics">' + (p.metrics || []).map(function (m) { return '<span class="metric">' + esc(m) + '</span>'; }).join('') + '</div></div></div>';
    return '<article class="card card--featured" id="project-' + esc(p.id) + '"><div class="card__content">' + body + '</div>' + visual + '</article>';
  }
  $('#projects').innerHTML = P.projects.map(projectHtml).join('');

  // ---------- experiencia ----------
  $('#experience').innerHTML = P.experience.map(function (e) {
    return '<div class="xp__item"><div class="xp__period">' + esc(e.period) + '</div><div>' +
      '<h3>' + esc(e.title) + '</h3><div class="xp__org">' + esc(e.org) + '</div>' +
      '<p>' + esc(e.summary) + '</p>' +
      (e.highlight ? '<p class="xp__highlight">' + esc(e.highlight) + (e.link ? ' ' + ext(e.link, e.linkLabel || 'Ver') : '') + '</p>' : '') +
      '</div></div>';
  }).join('');

  // ---------- stack / formación / contacto ----------
  $('#stack').innerHTML = Object.keys(P.stack).map(function (group) {
    return '<div class="stack-group stack-group--' + esc(group.split(' ')[0]) + '"><h4>' + esc(group) + '</h4><ul class="tags">' +
      P.stack[group].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
  }).join('');
  $('#about').innerHTML = P.about.map(function (a) { return '<p>' + esc(a) + '</p>'; }).join('');
  $('#education').innerHTML = P.education.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('');
  $('#contactLinks').innerHTML =
    '<a class="btn btn--primary" href="mailto:' + esc(P.email) + '">' + esc(P.email) + '</a>' +
    '<a class="btn btn--ghost" href="' + esc(P.linkedin) + '" target="_blank" rel="noopener">LinkedIn ↗</a>' +
    '<a class="btn btn--ghost" href="' + esc(P.github) + '" target="_blank" rel="noopener">GitHub ↗</a>';

  // ---------- tema ----------
  $('#themeToggle').addEventListener('click', function () {
    var root = document.documentElement;
    var current = root.dataset.theme || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // ---------- chat ----------
  var chat = $('#chat'), fab = document.querySelector('.chat-fab');
  var body = $('#chatBody'), input = $('#chatInput'), chips = $('#chatChips');
  var history = []; // { role: 'user' | 'model', text }
  var busy = false;

  function addMsg(kind, text) {
    var el = document.createElement('div');
    el.className = 'msg msg--' + kind;
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  function openChat() {
    chat.hidden = false;
    fab.hidden = true;
    if (!body.children.length) {
      addMsg('bot', '¡Hola! Soy el asistente de Juan. Preguntame lo que quieras sobre sus proyectos, cómo trabaja o qué sabe hacer. Respondo solo con información real.');
    }
    input.focus();
  }
  function closeChat() { chat.hidden = true; fab.hidden = false; fab.focus(); }

  document.querySelectorAll('[data-open-chat]').forEach(function (b) { b.addEventListener('click', openChat); });
  $('#chatClose').addEventListener('click', closeChat);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !chat.hidden) closeChat(); });

  chips.innerHTML = P.suggestedQuestions.map(function (q) { return '<button class="chip" type="button">' + esc(q) + '</button>'; }).join('');
  chips.addEventListener('click', function (e) {
    if (e.target.classList.contains('chip')) ask(e.target.textContent);
  });

  async function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    chips.hidden = true;
    addMsg('user', text);
    input.value = '';
    var typing = addMsg('bot', '');
    typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    try {
      var data = await post({ mode: 'chat', message: text, history: history });
      typing.textContent = data.reply;
      history.push({ role: 'user', text: text }, { role: 'model', text: data.reply });
    } catch (err) {
      typing.className = 'msg msg--error';
      typing.textContent = err.message + ' Mientras tanto, podés escribirle a Juan a ' + P.email + '.';
    }
    body.scrollTop = body.scrollHeight;
    busy = false;
  }
  $('#chatForm').addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });

  // ---------- match con oferta ----------
  var jobText = $('#jobText'), jobCount = $('#jobCount'), matchBtn = $('#matchBtn'), result = $('#matchResult');
  var SAMPLE_JOB =
    'Desarrollador/a Full Stack Jr. — Remoto\n\n' +
    'Buscamos una persona para sumarse a nuestro equipo de producto. Vas a trabajar en una plataforma SaaS para pymes.\n\n' +
    'Requisitos:\n- React y TypeScript\n- Node.js / Express\n- Bases de datos SQL (PostgreSQL)\n- Consumo e integración de APIs REST\n- Git y trabajo con Pull Requests\n\n' +
    'Suma:\n- Experiencia integrando LLMs (OpenAI, Gemini)\n- Automatizaciones con n8n o similares\n- Inglés intermedio para leer documentación y reuniones ocasionales';

  function updateCount() { jobCount.textContent = jobText.value.length + ' / 6000'; }
  jobText.addEventListener('input', updateCount);
  $('#matchSample').addEventListener('click', function () { jobText.value = SAMPLE_JOB; updateCount(); jobText.focus(); });

  function renderMatch(r) {
    var matches = (r.matches || []).map(function (m) {
      var p = projectById(m.projectId);
      if (!p) return '';
      return '<a class="match-proj" href="#project-' + esc(p.id) + '" data-proj="' + esc(p.id) + '"><b>' + esc(p.name) + ' →</b><span>' + esc(m.reason) + '</span></a>';
    }).join('');
    var list = function (arr) { return '<ul>' + (arr || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
    var fit = ['alto', 'medio', 'bajo'].indexOf(r.fit) !== -1 ? r.fit : 'medio';
    result.innerHTML =
      '<span class="fit fit--' + fit + '">Encaje ' + esc(fit) + '</span>' +
      '<p class="match__headline">' + esc(r.headline) + '</p>' +
      '<div class="match__grid"><div><h4>Proyectos que lo demuestran</h4>' + (matches || '<p class="muted">Ninguno aplica directamente.</p>') + '</div>' +
      '<div><h4>Puntos fuertes</h4>' + list(r.strengths) + '<h4>Lo que me falta</h4>' + list(r.gaps) + '</div></div>' +
      (r.questionToAsk ? '<h4 class="mono small muted">PREGUNTA PARA LA ENTREVISTA</h4><p class="match__ask">' + esc(r.questionToAsk) + '</p>' : '');
  }

  result.addEventListener('click', function (e) {
    var a = e.target.closest('[data-proj]');
    if (!a) return;
    var card = document.getElementById('project-' + a.dataset.proj);
    if (card) {
      card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
      var d = card.querySelector('details'); if (d) d.open = true;
    }
  });

  $('#matchForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var job = jobText.value.trim();
    result.hidden = false;
    if (job.length < 40) {
      result.innerHTML = '<p class="muted">Pegá la descripción completa del puesto para que el análisis tenga sentido.</p>';
      return;
    }
    matchBtn.disabled = true;
    result.innerHTML = '<div class="loading"><span class="spinner"></span> Cruzando la oferta con mis proyectos…</div>';
    try {
      renderMatch(await post({ mode: 'match', job: job }));
    } catch (err) {
      result.innerHTML = '<p class="muted">' + esc(err.message) + '</p>';
    }
    matchBtn.disabled = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
})();
