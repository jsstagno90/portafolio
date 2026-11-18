// js/rag.js
// Demo "Creá tu chatbot": RAG completo con el vector store en el navegador.
// Pipeline: extracción → chunking → embeddings → índice → retrieval → generación.
// Cada paso se dibuja en el panel "pipeline.log" para que se vea qué pasa.
(function () {
  var API = '/api/rag';
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

  var MAX_FILES = 3;
  var MAX_FILE_MB = 5;
  var MAX_CHARS = 60000;     // texto total que se indexa
  var CHUNK_SIZE = 700;      // caracteres por fragmento
  var CHUNK_OVERLAP = 120;   // caracteres que se repiten entre fragmentos
  var MAX_CHUNKS = 100;
  var BATCH = 50;            // fragmentos por request de embeddings
  var TOP_K = 4;

  function $(s) { return document.querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function kb(n) { return n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function fmt(n) { return n.toLocaleString('es-AR'); }

  var persona = $('#ragPersona'), fileInput = $('#ragFiles'), drop = $('#ragDrop'), fileList = $('#ragFileList');
  var buildBtn = $('#ragBuild'), pipe = $('#ragPipe'), chatBox = $('#ragChat'), msgs = $('#ragMsgs');
  var form = $('#ragForm'), input = $('#ragInput');

  // Estado: archivos elegidos y el índice armado
  var docs = [];   // { name, size, file? , text? }
  var index = [];  // { id, source, text, vector }
  var history = [];
  var busy = false, questionCount = 0;

  // ---------- ejemplo precargado ----------
  var SAMPLE_PERSONA = 'Sos "Tinta", el asistente virtual de la librería Páginas del Sur. Hablás con buena onda y en rioplatense. Recomendá libros del catálogo según lo que busque la persona, decí el precio y si hay stock. Si preguntan por horarios, envíos o pagos, respondé con esa info.';
  var SAMPLE_DOC = [
    'LIBRERÍA PÁGINAS DEL SUR — Información general',
    '',
    'Dirección: Av. Alem 1234, Bahía Blanca. Teléfono / WhatsApp: 291 555-0101.',
    'Horarios: lunes a viernes de 9 a 13 y de 16 a 20. Sábados de 10 a 14. Domingos y feriados cerrado.',
    'Medios de pago: efectivo (10% de descuento), transferencia, Mercado Pago y tarjetas de débito y crédito. Hasta 3 cuotas sin interés con tarjetas bancarias.',
    'Envíos: dentro de Bahía Blanca, $3.500 (gratis en compras de más de $40.000), llegan en 24 a 48 hs. Al resto del país por Correo Argentino, entre 3 y 7 días hábiles; el costo depende del destino.',
    'Retiro en el local: sin cargo, el pedido queda reservado 72 horas.',
    'Cambios: dentro de los 30 días con el ticket y el libro en buen estado.',
    'Encargos: si un libro no está en stock, lo pedimos a la editorial; demora entre 7 y 15 días y se pide una seña del 30%.',
    '',
    'CATÁLOGO (título — autor — género — precio — stock)',
    'Ficciones — Jorge Luis Borges — cuentos — $24.900 — 6 unidades',
    'Rayuela — Julio Cortázar — novela — $28.500 — 3 unidades',
    'El túnel — Ernesto Sabato — novela — $16.900 — 8 unidades',
    'Las aventuras de la China Iron — Gabriela Cabezón Cámara — novela — $22.000 — 2 unidades',
    'Nuestra parte de noche — Mariana Enriquez — terror — $39.900 — 4 unidades',
    'Las cosas que perdimos en el fuego — Mariana Enriquez — cuentos de terror — $21.500 — sin stock (se puede encargar)',
    'Cien años de soledad — Gabriel García Márquez — novela — $31.000 — 5 unidades',
    'El principito — Antoine de Saint-Exupéry — infantil — $12.900 — 10 unidades',
    'Harry Potter y la piedra filosofal — J. K. Rowling — juvenil / fantasía — $27.900 — 7 unidades',
    'Sapiens — Yuval Noah Harari — ensayo / historia — $33.500 — 3 unidades',
    'Hábitos atómicos — James Clear — autoayuda — $26.900 — 9 unidades',
    'El Eternauta (edición integral) — Oesterheld y Solano López — historieta — $45.000 — 2 unidades',
    'Mafalda: todas las tiras — Quino — historieta / humor — $49.900 — 4 unidades',
    'Clean Code — Robert C. Martin — programación — $52.000 — 1 unidad',
    '',
    'PROMOCIONES',
    'Martes de clásicos: 15% de descuento en Borges, Cortázar, Sabato y García Márquez.',
    'Club de lectura: el primer jueves de cada mes a las 19 hs, gratis, con inscripción por WhatsApp. Este mes se lee "Nuestra parte de noche".'
  ].join('\n');

  // ---------- panel del pipeline ----------
  function clearPipe() { pipe.innerHTML = ''; }
  function pipeGroup(title) {
    var g = document.createElement('div');
    g.className = 'pipe__group';
    g.innerHTML = '<p class="pipe__title mono">' + esc(title) + '</p>';
    pipe.appendChild(g);
    pipe.scrollTop = pipe.scrollHeight;
    return g;
  }
  // Agrega un paso "en curso" y devuelve funciones para marcarlo ok / error
  function pipeStep(group, label) {
    var el = document.createElement('div');
    el.className = 'step step--run';
    el.innerHTML = '<span class="step__ico"></span><div class="step__main"><b>' + esc(label) + '</b><div class="step__detail mono"></div></div><span class="step__ms mono"></span>';
    group.appendChild(el);
    pipe.scrollTop = pipe.scrollHeight;
    var t0 = performance.now();
    return {
      ok: function (detailHtml, extraHtml) {
        el.className = 'step step--ok';
        el.querySelector('.step__detail').innerHTML = detailHtml || '';
        el.querySelector('.step__ms').textContent = Math.round(performance.now() - t0) + ' ms';
        if (extraHtml) el.querySelector('.step__main').insertAdjacentHTML('beforeend', extraHtml);
        pipe.scrollTop = pipe.scrollHeight;
      },
      fail: function (msg) {
        el.className = 'step step--err';
        el.querySelector('.step__detail').textContent = msg;
      }
    };
  }

  // ---------- archivos ----------
  function renderFiles() {
    fileList.innerHTML = docs.map(function (d, i) {
      return '<li><span class="mono">' + (/\.pdf$/i.test(d.name) ? 'PDF' : 'TXT') + '</span>' + esc(d.name) +
        ' <span class="muted small">' + kb(d.size) + '</span><button type="button" class="rag__rm" data-i="' + i + '" aria-label="Quitar ' + esc(d.name) + '">✕</button></li>';
    }).join('');
  }
  function addFiles(list) {
    var errors = [];
    Array.prototype.forEach.call(list, function (f) {
      if (docs.length >= MAX_FILES) { errors.push('Máximo ' + MAX_FILES + ' archivos.'); return; }
      if (!/\.(pdf|txt|md|csv)$/i.test(f.name)) { errors.push(f.name + ': formato no soportado.'); return; }
      if (f.size > MAX_FILE_MB * 1024 * 1024) { errors.push(f.name + ': pesa más de ' + MAX_FILE_MB + ' MB.'); return; }
      docs.push({ name: f.name, size: f.size, file: f });
    });
    renderFiles();
    if (errors.length) alertPipe(errors.join(' '));
  }
  function alertPipe(msg) {
    var p = document.createElement('p');
    p.className = 'pipe__warn mono';
    p.textContent = '⚠ ' + msg;
    if (pipe.querySelector('.pipe__empty')) clearPipe();
    pipe.appendChild(p);
  }
  fileInput.addEventListener('change', function () { addFiles(fileInput.files); fileInput.value = ''; });
  fileList.addEventListener('click', function (e) {
    var b = e.target.closest('.rag__rm');
    if (b) { docs.splice(+b.dataset.i, 1); renderFiles(); }
  });
  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('drop--over'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('drop--over'); });
  });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer) addFiles(e.dataTransfer.files); });

  $('#ragSample').addEventListener('click', function () {
    persona.value = SAMPLE_PERSONA;
    docs = [{ name: 'libreria-paginas-del-sur.txt', size: SAMPLE_DOC.length, text: SAMPLE_DOC }];
    renderFiles();
    buildBtn.focus();
  });

  // ---------- 1. extracción ----------
  var pdfjsReady = null;
  function loadPdfJs() {
    if (pdfjsReady) return pdfjsReady;
    pdfjsReady = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js';
      s.onload = function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      s.onerror = function () { pdfjsReady = null; reject(new Error('No se pudo cargar el lector de PDF.')); };
      document.head.appendChild(s);
    });
    return pdfjsReady;
  }
  async function extractText(doc) {
    if (doc.text != null) return { text: doc.text, pages: null };
    if (!/\.pdf$/i.test(doc.name)) return { text: await doc.file.text(), pages: null };
    var lib = await loadPdfJs();
    var pdf = await lib.getDocument({ data: await doc.file.arrayBuffer() }).promise;
    var pages = [];
    for (var i = 1; i <= pdf.numPages; i++) {
      var page = await pdf.getPage(i);
      var content = await page.getTextContent();
      // hasEOL marca fin de línea: así se conservan los saltos del PDF
      pages.push(content.items.map(function (it) { return it.str + (it.hasEOL ? '\n' : ' '); }).join(''));
    }
    return { text: pages.join('\n\n'), pages: pdf.numPages };
  }

  // ---------- 2. chunking ----------
  // Parte por párrafos y los junta hasta ~CHUNK_SIZE. Si un párrafo es muy
  // largo, lo corta por oraciones. Cada chunk arranca con el final del
  // anterior (overlap) para que una idea partida al medio no se pierda.
  function chunkText(text) {
    var clean = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    var pieces = [];
    clean.split(/\n\s*\n/).forEach(function (para) {
      para = para.trim();
      if (!para) return;
      if (para.length <= CHUNK_SIZE) { pieces.push(para); return; }
      var sentences = para.match(/[^.!?\n]+[.!?]*\s*|\n/g) || [para];
      var buf = '';
      sentences.forEach(function (s) {
        if ((buf + s).length > CHUNK_SIZE && buf) { pieces.push(buf.trim()); buf = ''; }
        while (s.length > CHUNK_SIZE) { pieces.push(s.slice(0, CHUNK_SIZE)); s = s.slice(CHUNK_SIZE); }
        buf += s;
      });
      if (buf.trim()) pieces.push(buf.trim());
    });

    var chunks = [], cur = '';
    pieces.forEach(function (p) {
      if (cur && (cur + '\n\n' + p).length > CHUNK_SIZE) {
        chunks.push(cur);
        var tail = cur.slice(-CHUNK_OVERLAP);
        var cut = tail.indexOf(' ');
        cur = (cut > -1 ? tail.slice(cut + 1) : tail) + '\n\n' + p;
      } else {
        cur = cur ? cur + '\n\n' + p : p;
      }
    });
    if (cur) chunks.push(cur);
    return chunks;
  }

  // ---------- llamadas al backend ----------
  async function post(body) {
    if (location.protocol === 'file:') throw new Error('La demo funciona cuando la web está publicada (Vercel o "vercel dev").');
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 40000);
    var res;
    try {
      res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'Tardó demasiado, probá de nuevo.' : 'No me pude conectar con el servidor.');
    } finally {
      clearTimeout(timer);
    }
    var data = null;
    try { data = await res.json(); } catch (e) { /* no JSON */ }
    if (!res.ok || !data) {
      throw new Error((data && data.error) || (res.status === 404 ? 'La demo funciona cuando la web está publicada en Vercel.' : 'El servidor no está disponible.'));
    }
    return data;
  }

  // Similitud coseno. Los vectores ya vienen normalizados del server, así
  // que alcanza con el producto punto.
  function cosine(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  function vectorPreview(v) {
    return '[' + v.slice(0, 6).map(function (x) { return x.toFixed(4); }).join(', ') + ', … ]';
  }

  // ---------- armar el bot ----------
  buildBtn.addEventListener('click', async function () {
    if (busy) return;
    if (!docs.length) { alertPipe('Subí al menos un documento (o cargá el ejemplo).'); return; }
    busy = true;
    buildBtn.disabled = true;
    buildBtn.textContent = 'Procesando…';
    clearPipe();
    index = []; history = []; questionCount = 0;
    msgs.innerHTML = '';
    chatBox.hidden = true;

    var g = pipeGroup('$ indexando ' + docs.length + ' documento' + (docs.length > 1 ? 's' : ''));
    try {
      // 1. Extracción
      var step = pipeStep(g, '1 · Extracción de texto');
      var texts = [], total = 0, lines = [];
      for (var i = 0; i < docs.length; i++) {
        var r = await extractText(docs[i]);
        var t = r.text.slice(0, Math.max(0, MAX_CHARS - total));
        total += t.length;
        texts.push({ source: docs[i].name, text: t });
        lines.push(esc(docs[i].name) + ' → ' + fmt(t.length) + ' caracteres' + (r.pages ? ' (' + r.pages + ' págs.)' : ''));
      }
      if (total < 20) throw new Error('No encontré texto. Si el PDF es escaneado (una imagen), no tiene texto para leer.');
      step.ok(lines.join('<br>') + (total >= MAX_CHARS ? '<br><span class="warn">recortado a ' + fmt(MAX_CHARS) + ' caracteres (límite de la demo)</span>' : ''));

      // 2. Chunking
      step = pipeStep(g, '2 · Chunking');
      var chunks = [];
      texts.forEach(function (d) {
        chunkText(d.text).forEach(function (c) { chunks.push({ source: d.source, text: c }); });
      });
      chunks = chunks.slice(0, MAX_CHUNKS);
      var avg = Math.round(chunks.reduce(function (s, c) { return s + c.text.length; }, 0) / chunks.length);
      step.ok(fmt(chunks.length) + ' fragmentos · ~' + avg + ' caracteres c/u · overlap ' + CHUNK_OVERLAP,
        '<details class="peek"><summary>ver fragmentos</summary>' + chunks.slice(0, 8).map(function (c, i) {
          return '<div class="peek__item"><span class="mono">#' + (i + 1) + ' · ' + esc(c.source) + ' · ' + c.text.length + ' car.</span><p>' + esc(c.text) + '</p></div>';
        }).join('') + (chunks.length > 8 ? '<p class="muted small">…y ' + (chunks.length - 8) + ' más</p>' : '') + '</details>');

      // 3. Embeddings (en lotes)
      step = pipeStep(g, '3 · Embeddings');
      var vectors = [], model = '', dims = 0;
      for (var b = 0; b < chunks.length; b += BATCH) {
        var batch = chunks.slice(b, b + BATCH);
        var data = await post({ action: 'embed', taskType: 'RETRIEVAL_DOCUMENT', texts: batch.map(function (c) { return c.text; }) });
        vectors = vectors.concat(data.vectors);
        model = data.model; dims = data.dims;
      }
      step.ok(esc(model) + ' · ' + fmt(vectors.length) + ' vectores de ' + dims + ' dimensiones',
        '<div class="vec mono">#1 = ' + esc(vectorPreview(vectors[0])) + '</div>');

      // 4. Índice en memoria
      step = pipeStep(g, '4 · Índice vectorial');
      index = chunks.map(function (c, i) { return { id: i + 1, source: c.source, text: c.text, vector: vectors[i] }; })
        .filter(function (c) { return c.vector && c.vector.length; });
      var approxKb = Math.round(index.length * dims * 8 / 1024);
      step.ok(fmt(index.length) + ' fragmentos en memoria (navegador) · ~' + approxKb + ' KB · búsqueda por similitud coseno');

      var p = pipeGroup('✓ chatbot listo — hacele una pregunta');
      p.classList.add('pipe__group--ready');

      chatBox.hidden = false;
      $('#ragBotInfo').textContent = docs.map(function (d) { return d.name; }).join(', ') + ' · ' + index.length + ' fragmentos';
      addMsg('bot', '¡Listo! Ya leí ' + (docs.length > 1 ? 'tus documentos' : 'tu documento') + '. ¿En qué te ayudo?');
      chatBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      input.focus();
    } catch (err) {
      if (step) step.fail(err.message);
    }
    busy = false;
    buildBtn.disabled = false;
    buildBtn.textContent = index.length ? 'Volver a crear' : 'Crear mi chatbot';
  });

  // ---------- chat ----------
  function addMsg(kind, text) {
    var el = document.createElement('div');
    el.className = 'msg msg--' + kind;
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }
  function renderReply(text) {
    return esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q || busy || !index.length) return;
    busy = true;
    input.value = '';
    addMsg('user', q);
    var typing = addMsg('bot', '');
    typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    questionCount++;
    var g = pipeGroup('$ pregunta #' + questionCount + ': "' + (q.length > 60 ? q.slice(0, 60) + '…' : q) + '"');
    var step;

    try {
      // 5. Embedding de la pregunta
      step = pipeStep(g, '5 · Embedding de la pregunta');
      var qe = await post({ action: 'embed', taskType: 'RETRIEVAL_QUERY', texts: [q] });
      var qv = qe.vectors[0];
      step.ok('RETRIEVAL_QUERY · ' + qe.dims + ' dims', '<div class="vec mono">q = ' + esc(vectorPreview(qv)) + '</div>');

      // 6. Retrieval
      step = pipeStep(g, '6 · Búsqueda semántica (top ' + TOP_K + ')');
      var ranked = index.map(function (c) { return { c: c, score: cosine(qv, c.vector) }; })
        .sort(function (a, b) { return b.score - a.score; });
      var top = ranked.slice(0, TOP_K);
      step.ok('comparó contra ' + index.length + ' fragmentos', '<ol class="hits">' + top.map(function (h) {
        var pct = Math.max(0, Math.min(100, Math.round(h.score * 100)));
        return '<li><div class="hit__bar"><i style="width:' + pct + '%"></i></div><span class="mono">' + h.score.toFixed(3) + '</span> ' +
          '<details><summary>#' + h.c.id + ' · ' + esc(h.c.source) + '</summary><p>' + esc(h.c.text) + '</p></details></li>';
      }).join('') + '</ol>');

      // 7. Generación
      step = pipeStep(g, '7 · Prompt + generación');
      var data = await post({
        action: 'chat',
        persona: persona.value.trim(),
        question: q,
        history: history,
        chunks: top.map(function (h) { return { source: h.c.source, text: h.c.text }; })
      });
      var u = data.usage || {};
      step.ok(esc(data.model) + (u.promptTokenCount ? ' · ' + fmt(u.promptTokenCount) + ' tokens de entrada, ' + fmt(u.candidatesTokenCount || 0) + ' de salida' : ''),
        '<details class="peek"><summary>ver el prompt que recibió el modelo</summary><pre>' + esc(data.systemPrompt) + '\n\n=== PREGUNTA ===\n' + esc(q) + '</pre></details>');

      typing.innerHTML = renderReply(data.reply);
      var sources = [];
      top.forEach(function (h) { if (sources.indexOf(h.c.source) === -1) sources.push(h.c.source); });
      typing.insertAdjacentHTML('beforeend', '<div class="msg__src mono">fuentes: ' + top.map(function (h) {
        return '#' + h.c.id + ' (' + h.score.toFixed(2) + ')';
      }).join(' · ') + ' — ' + esc(sources.join(', ')) + '</div>');
      history.push({ role: 'user', text: q }, { role: 'model', text: data.reply });
    } catch (err) {
      if (step) step.fail(err.message);
      typing.className = 'msg msg--error';
      typing.textContent = err.message;
    }
    msgs.scrollTop = msgs.scrollHeight;
    busy = false;
    input.focus();
  });
})();
