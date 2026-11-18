// data/brasa.js
// ---------------------------------------------------------------------------
// La "tienda" del agente de la demo: Brasa Tostadores (empresa ficticia).
// Catálogo, reglas de negocio y las herramientas que el agente puede llamar.
//
// Regla de oro: el modelo DECIDE qué herramienta usar, pero las cuentas
// (precios, descuentos, envío, total) las hace este código. Así el agente
// nunca puede inventar un precio ni "regalar" un descuento.
// Solo lo usa api/agent.js (en el servidor).
// ---------------------------------------------------------------------------

var PRODUCTS = [
  { id: 'etiopia-250', name: 'Etiopía Yirgacheffe', category: 'cafe', grams: 250, price: 14500, stock: 18,
    notes: 'Tueste claro. Floral, jazmín y limón. Ideal para filtro (V60, Chemex).', methods: ['filtro', 'v60', 'chemex'] },
  { id: 'colombia-250', name: 'Colombia Huila', category: 'cafe', grams: 250, price: 12900, stock: 25,
    notes: 'Tueste medio. Caramelo, manzana roja y chocolate con leche. Muy versátil.', methods: ['filtro', 'espresso', 'prensa', 'moka', 'v60'] },
  { id: 'brasil-500', name: 'Brasil Cerrado', category: 'cafe', grams: 500, price: 19800, stock: 30,
    notes: 'Tueste medio-oscuro. Maní, cacao y nuez. Ideal para espresso y con leche.', methods: ['espresso', 'moka', 'con leche'] },
  { id: 'blend-1kg', name: 'Blend Brasa de la Casa', category: 'cafe', grams: 1000, price: 34900, stock: 40,
    notes: 'Brasil + Colombia. Tueste medio, cuerpo intenso, dulzor a dulce de leche. El más vendido.', methods: ['espresso', 'moka', 'prensa', 'con leche', 'filtro'] },
  { id: 'descafeinado-250', name: 'Descafeinado Suave', category: 'cafe', grams: 250, price: 13900, stock: 0,
    notes: 'Colombia descafeinado por proceso de agua. Cacao y vainilla. Vuelve la semana próxima; se puede reservar.', methods: ['filtro', 'espresso', 'prensa'] },
  { id: 'prensa-600', name: 'Prensa francesa 600 ml', category: 'accesorio', price: 24500, stock: 7,
    notes: 'Vidrio borosilicato y filtro de acero. Rinde 3 tazas.', methods: ['prensa'] },
  { id: 'molinillo', name: 'Molinillo manual cerámico', category: 'accesorio', price: 38900, stock: 5,
    notes: 'Muelas cerámicas regulables, de fina (espresso) a gruesa (prensa).', methods: [] },
  { id: 'kit-v60', name: 'Kit V60 inicial', category: 'accesorio', price: 29900, stock: 9,
    notes: 'Gotero V60 + 40 filtros + cuchara medidora + guía de recetas.', methods: ['filtro', 'v60'] },
  { id: 'taza', name: 'Taza Brasa esmaltada', category: 'regalo', price: 11500, stock: 15,
    notes: 'Cerámica artesanal de Bahía Blanca, 300 ml.', methods: [] },
  { id: 'club', name: 'Suscripción Brasa Club (1 mes)', category: 'suscripcion', price: 24900, stock: null,
    notes: '2 cafés distintos de 250 g por mes elegidos por el tostador. Se cancela cuando quieras.', methods: [] }
];

var RULES = {
  bulkKg: 2, bulkDiscount: 0.15,                 // 2 kg o más de café: 15% off en café
  combo: { items: ['kit-v60', 'colombia-250'], price: 39900, name: 'Combo Inicio' },
  shipping: {
    bahia: { cost: 3000, freeFrom: 45000, eta: 'en el día si comprás antes de las 13 hs; si no, al día siguiente hábil' },
    pais: { freeFrom: 90000, eta: '3 a 6 días hábiles por Andreani' }
  },
  payment: {
    transferencia: { discount: 0.05, label: 'Transferencia (5% off)' },
    efectivo: { discount: 0.10, label: 'Efectivo en el local (10% off)', onlyPickup: true },
    mercadopago: { discount: 0, label: 'Mercado Pago' },
    tarjeta: { discount: 0, label: 'Tarjeta (hasta 3 cuotas sin interés desde $30.000 con tarjetas de crédito bancarias)' }
  }
};

var INFO = {
  nombre: 'Brasa Tostadores',
  direccion: 'Calle Zelarrayán 845, Bahía Blanca',
  horarios: 'Lunes a viernes de 8 a 20, sábados de 9 a 14. Domingos y feriados cerrado.',
  whatsapp: '291 555-0188',
  cambios: 'Accesorios: cambio dentro de los 30 días sin uso. Café: sin cambio salvo que llegue dañado (avisar en 48 hs con foto).'
};

function money(n) { return '$' + Math.round(n).toLocaleString('es-AR'); }
function byId(id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; }
function pub(p) {
  return { id: p.id, nombre: p.name, categoria: p.category, presentacion: p.grams ? p.grams + ' g' : 'unidad',
    precio: p.price, stock: p.stock === null ? 'siempre disponible' : p.stock, notas: p.notes };
}
function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

// Limpia la lista de ítems que manda el modelo: ids que existen, cantidades enteras y razonables
function cleanItems(items) {
  var out = [], errors = [];
  (Array.isArray(items) ? items : []).forEach(function (it) {
    var p = byId(it && it.id);
    var qty = Math.floor(Number(it && it.cantidad) || 0);
    if (!p) { errors.push('No existe el producto "' + (it && it.id) + '".'); return; }
    if (qty < 1 || qty > 20) { errors.push('Cantidad inválida para ' + p.name + ' (1 a 20).'); return; }
    var prev = out.filter(function (o) { return o.p.id === p.id; })[0];
    if (prev) prev.qty += qty; else out.push({ p: p, qty: qty });
  });
  return { items: out, errors: errors };
}

// Arma el detalle con promos. Es la ÚNICA fuente de precios del agente.
function quote(items) {
  var lines = [], promos = [];
  var subtotal = 0, discount = 0;
  var qty = {};
  items.forEach(function (it) { qty[it.p.id] = it.qty; subtotal += it.p.price * it.qty; lines.push({ id: it.p.id, nombre: it.p.name, cantidad: it.qty, precio_unitario: it.p.price, total: it.p.price * it.qty }); });

  // 1) Combo Inicio: por cada par Kit V60 + Colombia 250 g
  var pairs = Math.min(qty['kit-v60'] || 0, qty['colombia-250'] || 0);
  var comboSaving = 0;
  if (pairs > 0) {
    comboSaving = pairs * (byId('kit-v60').price + byId('colombia-250').price - RULES.combo.price);
    discount += comboSaving;
    promos.push({ promo: RULES.combo.name + ' x' + pairs, ahorro: comboSaving });
  }
  // 2) 2 kg o más de café: 15% sobre el café que no entró en el combo
  var grams = 0, cafeAmount = 0;
  items.forEach(function (it) {
    if (it.p.category !== 'cafe') return;
    var q = it.qty - (it.p.id === 'colombia-250' ? pairs : 0);
    grams += (it.p.grams || 0) * it.qty;
    cafeAmount += it.p.price * Math.max(0, q);
  });
  if (grams >= RULES.bulkKg * 1000 && cafeAmount > 0) {
    var bulk = Math.round(cafeAmount * RULES.bulkDiscount);
    discount += bulk;
    promos.push({ promo: '15% off por llevar ' + (grams / 1000) + ' kg de café', ahorro: bulk });
  }
  var faltanKg = grams < RULES.bulkKg * 1000 && grams > 0 ? (RULES.bulkKg * 1000 - grams) / 1000 : 0;
  return { lineas: lines, subtotal: subtotal, promociones: promos, descuento_promos: discount, total_productos: subtotal - discount,
    kg_cafe: grams / 1000, nota: faltanKg ? 'Te faltan ' + faltanKg + ' kg de café para el 15% de descuento por cantidad.' : undefined };
}

function shipping(dest, cp, amount) {
  dest = norm(dest);
  if (dest.indexOf('retiro') !== -1 || dest.indexOf('local') !== -1) return { modalidad: 'retiro', costo: 0, demora: 'listo en 2 horas hábiles; se guarda 5 días' };
  if (dest.indexOf('bahia') !== -1) {
    var b = RULES.shipping.bahia;
    return { modalidad: 'moto en Bahía Blanca', costo: amount >= b.freeFrom ? 0 : b.cost, demora: b.eta,
      nota: amount >= b.freeFrom ? 'Envío gratis (compra desde ' + money(b.freeFrom) + ').' : 'Te faltan ' + money(b.freeFrom - amount) + ' para el envío gratis.' };
  }
  var code = String(cp || '').replace(/\D/g, '');
  if (code.length !== 4) return { error: 'Para envíos fuera de Bahía Blanca necesito el código postal de 4 dígitos.' };
  // Tarifa simulada por zona (primer dígito del CP)
  var zone = +code[0];
  var cost = [5900, 6500, 6900, 7400, 8200, 7900, 6200, 7100, 6800, 9800][zone];
  var p = RULES.shipping.pais;
  return { modalidad: 'Andreani a CP ' + code, costo: amount >= p.freeFrom ? 0 : cost, demora: p.eta,
    nota: amount >= p.freeFrom ? 'Envío gratis (compra desde ' + money(p.freeFrom) + ').' : 'Te faltan ' + money(p.freeFrom - amount) + ' para el envío gratis.' };
}

// ---------------------------------------------------------------------------
// Herramientas que ve el modelo (formato de function calling de Gemini)
// ---------------------------------------------------------------------------
var DECLARATIONS = [
  { name: 'buscar_productos',
    description: 'Busca en el catálogo de Brasa. Devuelve productos con id, precio, stock y notas. Usala antes de recomendar o cotizar: nunca supongas precios ni stock.',
    parameters: { type: 'OBJECT', properties: {
      texto: { type: 'STRING', description: 'Palabras a buscar (ej: "blend", "molinillo", "descafeinado"). Vacío para ver todo.' },
      categoria: { type: 'STRING', enum: ['cafe', 'accesorio', 'regalo', 'suscripcion', 'todas'] },
      metodo: { type: 'STRING', description: 'Método de preparación para filtrar cafés: filtro, v60, chemex, espresso, moka, prensa, con leche.' },
      precio_max: { type: 'NUMBER', description: 'Precio máximo por unidad en pesos.' }
    } } },
  { name: 'cotizar',
    description: 'Calcula el detalle de una compra con las promociones vigentes (Combo Inicio, 15% por 2 kg o más de café). Devuelve subtotal, descuentos y total de productos.',
    parameters: { type: 'OBJECT', properties: {
      items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, cantidad: { type: 'INTEGER' } }, required: ['id', 'cantidad'] } }
    }, required: ['items'] } },
  { name: 'calcular_envio',
    description: 'Calcula costo y demora de envío. destino: "bahia blanca", "retiro en el local" o el nombre de otra ciudad (en ese caso pedí el código postal).',
    parameters: { type: 'OBJECT', properties: {
      destino: { type: 'STRING' },
      codigo_postal: { type: 'STRING', description: 'CP de 4 dígitos, obligatorio fuera de Bahía Blanca.' },
      total_productos: { type: 'NUMBER', description: 'Total de productos ya con promociones (sale de cotizar).' }
    }, required: ['destino', 'total_productos'] } },
  { name: 'info_local',
    description: 'Horarios, dirección, WhatsApp, medios de pago y política de cambios.' },  // sin parámetros: Gemini rechaza un OBJECT vacío
  { name: 'crear_pedido',
    description: 'Crea el pedido (simulado). SOLO llamala después de mostrarle al cliente el resumen con el total y que el cliente haya confirmado explícitamente en su último mensaje ("sí", "dale", "confirmo").',
    parameters: { type: 'OBJECT', properties: {
      items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, cantidad: { type: 'INTEGER' } }, required: ['id', 'cantidad'] } },
      destino: { type: 'STRING' },
      codigo_postal: { type: 'STRING' },
      medio_pago: { type: 'STRING', enum: ['transferencia', 'efectivo', 'mercadopago', 'tarjeta'] },
      cliente_confirmo: { type: 'BOOLEAN', description: 'true solo si el cliente confirmó el resumen en su último mensaje.' }
    }, required: ['items', 'destino', 'medio_pago', 'cliente_confirmo'] } }
];

var TOOLS = {
  buscar_productos: function (a) {
    var t = norm(a.texto), cat = a.categoria && a.categoria !== 'todas' ? a.categoria : null, m = norm(a.metodo), max = Number(a.precio_max) || 0;
    var words = t.split(/\s+/).filter(function (w) { return w.length > 2; });
    var res = PRODUCTS.filter(function (p) {
      if (cat && p.category !== cat) return false;
      if (max && p.price > max) return false;
      if (m && p.category === 'cafe' && p.methods.join(' ').indexOf(m) === -1) return false;
      if (words.length) {
        var hay = norm(p.name + ' ' + p.notes + ' ' + p.category + ' ' + p.methods.join(' '));
        return words.some(function (w) { return hay.indexOf(w) !== -1; });
      }
      return true;
    });
    return { resultados: res.map(pub), cantidad: res.length };
  },
  cotizar: function (a) {
    var c = cleanItems(a.items);
    if (!c.items.length) return { error: c.errors.join(' ') || 'No hay ítems para cotizar.' };
    var q = quote(c.items);
    var sinStock = c.items.filter(function (it) { return it.p.stock !== null && it.qty > it.p.stock; })
      .map(function (it) { return it.p.name + ' (pediste ' + it.qty + ', hay ' + it.p.stock + ')'; });
    if (sinStock.length) q.sin_stock = sinStock;
    if (c.errors.length) q.avisos = c.errors;
    return q;
  },
  calcular_envio: function (a) {
    return shipping(a.destino, a.codigo_postal, Number(a.total_productos) || 0);
  },
  info_local: function () {
    return { local: INFO, medios_de_pago: Object.keys(RULES.payment).map(function (k) { return RULES.payment[k].label; }),
      promociones: ['Combo Inicio: Kit V60 + Colombia Huila 250 g a ' + money(RULES.combo.price), '15% off llevando 2 kg o más de café'] };
  },
  crear_pedido: function (a) {
    if (a.cliente_confirmo !== true) return { error: 'Falta la confirmación del cliente. Mostrale el resumen con el total y preguntale si confirma.' };
    var c = cleanItems(a.items);
    if (!c.items.length) return { error: c.errors.join(' ') || 'El pedido no tiene ítems.' };
    var faltante = c.items.filter(function (it) { return it.p.stock !== null && it.qty > it.p.stock; });
    if (faltante.length) return { error: 'Sin stock suficiente: ' + faltante.map(function (it) { return it.p.name + ' (hay ' + it.p.stock + ')'; }).join(', ') + '.' };
    var q = quote(c.items);
    var env = shipping(a.destino, a.codigo_postal, q.total_productos);
    if (env.error) return { error: env.error };
    var pay = RULES.payment[a.medio_pago] || RULES.payment.mercadopago;
    if (pay.onlyPickup && env.modalidad !== 'retiro') return { error: 'El pago en efectivo es solo retirando en el local. Ofrecé transferencia (5% off) u otro medio.' };
    var payDiscount = Math.round(q.total_productos * pay.discount);
    var total = q.total_productos - payDiscount + env.costo;
    return {
      pedido: 'BR-' + Math.floor(1000 + Math.random() * 9000), simulado: true,
      lineas: q.lineas, promociones: q.promociones, subtotal: q.subtotal, descuento_promos: q.descuento_promos,
      medio_pago: pay.label, descuento_pago: payDiscount, envio: env, total: total,
      siguiente_paso: 'Te escribimos por WhatsApp para coordinar el pago y la entrega.'
    };
  }
};

function run(name, args) {
  var fn = TOOLS[name];
  if (!fn) return { error: 'Herramienta desconocida: ' + name };
  try { return fn(args || {}); } catch (e) { return { error: 'La herramienta falló: ' + e.message }; }
}

module.exports = { DECLARATIONS: DECLARATIONS, run: run, INFO: INFO, money: money };
