// js/agent.js
// Demo "Agente en vivo": chat con Brasita + la traza de lo que hizo el agente
// (cada vuelta del modelo y cada herramienta, con argumentos y resultados).
(function () {
  var API = '/api/agent';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(s) { return document.querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function money(n) { return '$' + Math.round(Number(n) || 0).toLocaleString('es-AR'); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, reduced ? 0 : ms); }); }

  var msgs = $('#agMsgs'), chips = $('#agChips'), form = $('#agForm'), input = $('#agInput');
  var trace = $('#agTrace'), stats = $('#agStats');
  if (!msgs) return;

  var history = [];   // { role: 'user' | 'model', text }
  var busy = false, turn = 0;

  var START = [
    'Tomo café con leche en moka, ¿qué me recomendás?',
    'Quiero 2 kg del blend con envío a Bahía Blanca',
    '¿Me conviene el Combo Inicio o comprar suelto?',
    'Mandame un descafeinado a Neuquén, CP 8300'
  ];
  var CONFIRM = ['Sí, confirmo', 'Pago con transferencia', 'Cambiar algo'];

  function setChips(list) {
    chips.innerHTML = list.map(function (q) { return '<button class="chip" type="button">' + esc(q) + '</button>'; }).join('');
    chips.hidden = !list.length;
  }
  chips.addEventListener('click', function (e) {
    if (e.target.classList.contains('chip')) send(e.target.textContent);
  });

  function addMsg(kind, html) {
    var el = document.createElement('div');
    el.className = 'msg msg--' + kind;
    el.innerHTML = html;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }
  // Texto del bot → HTML seguro (escapo todo y después solo **negrita** y listas)
  function renderReply(text) {
    return esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^\s*[*-]\s+/gm, '• ');
  }

  // ---------- resumen corto de cada resultado, para la traza ----------
  function summary(name, r) {
    if (!r) return '';
    if (r.error) return '<span class="t-err">⚠ ' + esc(r.error) + '</span>';
    switch (name) {
      case 'buscar_productos':
        if (!r.cantidad) return 'Sin resultados.';
        return r.cantidad + ' producto' + (r.cantidad > 1 ? 's' : '') + ': ' + r.resultados.slice(0, 4).map(function (p) {
          return esc(p.nombre) + ' <b>' + money(p.precio) + '</b>' + (p.stock === 0 ? ' <span class="t-err">sin stock</span>' : '');
        }).join(' · ') + (r.cantidad > 4 ? ' …' : '');
      case 'cotizar':
        return 'Subtotal ' + money(r.subtotal) + (r.descuento_promos ? ' · promos <span class="t-ok">−' + money(r.descuento_promos) + '</span>' : '') +
          ' · <b>total ' + money(r.total_productos) + '</b>' + (r.sin_stock ? ' · <span class="t-err">sin stock: ' + esc(r.sin_stock.join(', ')) + '</span>' : '');
      case 'calcular_envio':
        return esc(r.modalidad) + ' · <b>' + (r.costo ? money(r.costo) : 'gratis') + '</b> · ' + esc(r.demora);
      case 'info_local':
        return 'Horarios, dirección, pagos y cambios';
      case 'crear_pedido':
        return '<span class="t-ok">Pedido ' + esc(r.pedido) + ' creado</span> · <b>total ' + money(r.total) + '</b>';
      default:
        return '';
    }
  }

  function argsLine(args) {
    var keys = Object.keys(args || {});
    if (!keys.length) return '';
    return keys.map(function (k) {
      var v = args[k];
      if (Array.isArray(v)) v = v.map(function (x) { return x && x.id ? x.cantidad + '× ' + x.id : JSON.stringify(x); }).join(', ');
      else if (typeof v === 'object') v = JSON.stringify(v);
      return '<span class="t-k">' + esc(k) + '</span>=<span class="t-v">' + esc(v) + '</span>';
    }).join(', ');
  }

  function traceEl(cls, html) {
    var el = document.createElement('div');
    el.className = cls;
    el.innerHTML = html;
    trace.appendChild(el);
    trace.scrollTop = trace.scrollHeight;
    return el;
  }

  // Dibuja la traza de a un paso, para que se vea "en vivo"
  async function playTrace(group, items) {
    for (var i = 0; i < items.length; i++) {
      var t = items[i];
      if (t.type === 'model') {
        var what = t.decision === 'tools'
          ? 'decide usar ' + t.tools.map(function (n) { return '<code>' + esc(n) + '</code>'; }).join(' + ')
          : 'tiene todo: <b>responde</b>';
        group.appendChild(node('t-step t-model', '<span class="t-ico">◆</span><div><b>Vuelta ' + t.step + '</b> · el modelo ' + what +
          '<div class="t-meta">' + esc(t.model) + ' · ' + t.ms + ' ms' + (t.tokens ? ' · ' + t.tokens + ' tokens' : '') + '</div></div>'));
      } else if (t.type === 'tool') {
        group.appendChild(node('t-step t-tool' + (t.ok ? '' : ' t-tool--err'),
          '<span class="t-ico">⚙</span><div class="t-body"><div class="t-call"><code>' + esc(t.name) + '</code>(' + argsLine(t.args) + ')</div>' +
          '<div class="t-res">→ ' + summary(t.name, t.result) + '</div>' +
          '<details class="peek"><summary>ver JSON</summary><pre>' + esc(JSON.stringify({ argumentos: t.args, resultado: t.result }, null, 2)) + '</pre></details>' +
          '<div class="t-meta">ejecutada en el servidor · ' + t.ms + ' ms</div></div>'));
      } else if (t.type === 'limit') {
        group.appendChild(node('t-step t-tool--err', '<span class="t-ico">!</span><div>Llegó al límite de 6 vueltas y se cortó el loop.</div>'));
      }
      trace.scrollTop = trace.scrollHeight;
      await sleep(t.type === 'tool' ? 420 : 300);
    }
  }
  function node(cls, html) {
    var el = document.createElement('div');
    el.className = cls;
    el.innerHTML = html;
    requestAnimationFrame(function () { el.classList.add('in'); });
    return el;
  }

  function ticketHtml(o) {
    var rows = o.lineas.map(function (l) {
      return '<tr><td>' + l.cantidad + '× ' + esc(l.nombre) + '</td><td>' + money(l.total) + '</td></tr>';
    }).join('');
    (o.promociones || []).forEach(function (p) { rows += '<tr class="tk-disc"><td>' + esc(p.promo) + '</td><td>−' + money(p.ahorro) + '</td></tr>'; });
    if (o.descuento_pago) rows += '<tr class="tk-disc"><td>' + esc(o.medio_pago) + '</td><td>−' + money(o.descuento_pago) + '</td></tr>';
    rows += '<tr><td>Envío · ' + esc(o.envio.modalidad) + '</td><td>' + (o.envio.costo ? money(o.envio.costo) : 'gratis') + '</td></tr>';
    return '<div class="ticket"><div class="tk-head"><span>Brasa Tostadores</span><span class="mono">' + esc(o.pedido) + '</span></div>' +
      '<table>' + rows + '</table><div class="tk-total"><span>Total</span><b>' + money(o.total) + '</b></div>' +
      '<p class="tk-foot">Pedido de prueba · nadie te va a cobrar 😉</p></div>';
  }

  async function post(body) {
    if (location.protocol === 'file:') throw new Error('La demo funciona cuando la web está publicada (Vercel o "vercel dev").');
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 60000);
    var res;
    try {
      res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'El agente tardó demasiado, probá de nuevo.' : 'No me pude conectar con el servidor.');
    } finally {
      clearTimeout(timer);
    }
    var data = null;
    try { data = await res.json(); } catch (e) { /* no JSON */ }
    if (!res.ok || !data) {
      var err = new Error((data && data.error) || (res.status === 404 ? 'La demo funciona cuando la web está publicada en Vercel.' : 'El servidor no está disponible.'));
      err.trace = data && data.trace;
      throw err;
    }
    return data;
  }

  async function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    busy = true;
    setChips([]);
    input.value = '';
    addMsg('user', esc(text));
    var typing = addMsg('bot', '<span class="typing"><i></i><i></i><i></i></span>');

    turn++;
    if (trace.querySelector('.trace__empty')) trace.innerHTML = '';
    var group = traceEl('t-group', '<p class="t-title">$ mensaje #' + turn + ': "' + esc(text.length > 54 ? text.slice(0, 54) + '…' : text) + '"</p>');
    var thinking = traceEl('t-step t-wait in', '<span class="spinner"></span><div>El agente está trabajando…</div>');
    group.appendChild(thinking);

    try {
      var data = await post({ message: text, history: history });
      thinking.remove();
      await playTrace(group, data.trace || []);
      var tools = (data.trace || []).filter(function (t) { return t.type === 'tool'; }).length;
      var rounds = (data.trace || []).filter(function (t) { return t.type === 'model'; }).length;
      group.appendChild(node('t-step t-done', '<span class="t-ico">✓</span><div><b>Respuesta</b> · ' + rounds + ' vuelta' + (rounds > 1 ? 's' : '') + ', ' + tools + ' herramienta' + (tools === 1 ? '' : 's') + ' · ' + data.ms + ' ms en total</div>'));
      stats.textContent = data.tokens ? data.tokens.toLocaleString('es-AR') + ' tokens' : '';
      trace.scrollTop = trace.scrollHeight;

      typing.innerHTML = renderReply(data.reply);
      if (data.order) addMsg('bot msg--ticket', ticketHtml(data.order));
      history.push({ role: 'user', text: text }, { role: 'model', text: data.reply });
      // Si el agente pide confirmación, ofrezco respuestas rápidas
      if (!data.order && /confirm|¿te lo armo|¿lo pido|¿avanzo|¿cerramos|¿seguimos/i.test(data.reply)) setChips(CONFIRM);
    } catch (err) {
      thinking.remove();
      if (err.trace) await playTrace(group, err.trace);
      group.appendChild(node('t-step t-tool--err', '<span class="t-ico">!</span><div>' + esc(err.message) + '</div>'));
      typing.className = 'msg msg--error';
      typing.textContent = err.message;
    }
    msgs.scrollTop = msgs.scrollHeight;
    busy = false;
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });

  addMsg('bot', '¡Hola! Soy Brasita ☕ Puedo recomendarte cafés, cotizarte con las promos, calcular el envío y armarte el pedido. ¿Qué andás buscando?');
  setChips(START);
})();
