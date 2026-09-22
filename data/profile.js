// data/profile.js
// ---------------------------------------------------------------------------
// ÚNICA fuente de verdad del portfolio. La usan:
//   - la página (index.html la carga con <script>) para dibujar todo
//   - el asistente (api/chat.js la importa con require) para responder
// Si agregás un proyecto o cambiás un dato, lo tocás acá y se actualizan
// las dos cosas. Así el bot nunca dice algo distinto a lo que muestra la web.
// ---------------------------------------------------------------------------
(function (root) {
  var PROFILE = {
    name: 'Juan Stagno',
    nickname: 'Pity',
    role: 'Full Stack Developer · AI Automation',
    location: 'Bahía Blanca, Argentina (remoto)',
    email: 'jsstagno@hotmail.com',
    github: 'https://github.com/jsstagno90',
    linkedin: 'https://www.linkedin.com/in/juan-stagno',
    whatsapp: '5492914680689',     // formato wa.me: 549 + característica + número, sin 0 ni 15
    cv: 'cv/CV_Juan_Stagno.pdf',   // CV para descargar (versión web, sin teléfono)
    site: 'https://portafolio-seven-theta-36.vercel.app',
    seniority: 'Junior',
    english: 'Básico (A1)',

    tagline:
      'Construyo apps web que resuelven problemas de negocios reales, y les sumo IA donde de verdad ahorra trabajo.',

    about: [
      'Hace más de 15 años que diseño y opero máquinas CNC en Artesalandia, un emprendimiento de productos en MDF y polifán. Ahí aprendí algo que hoy aplico al código: antes de cortar, medís dos veces.',
      'Mi interés por programar arrancó en 2010 con un curso de PHP. Después me certifiqué como Full Stack en la UTN, hice AI Automation y terminé Full Stack en SoyHenry. Hoy me estoy especializando como AI Engineer y trabajo en proyectos con clientes reales.',
      'Me considero Junior: nunca trabajé formalmente como programador antes de este año. Lo que sí tengo es obsesión por entender por qué funciona lo que hago, y proyectos en producción que lo demuestran.'
    ],

    stack: {
      'Fuerte': ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Express', 'Supabase / PostgreSQL', 'n8n', 'APIs de LLMs (Gemini, OpenAI, Claude)'],
      'Usado en proyectos': ['Next.js', 'Vite', 'Tailwind', 'Vitest', 'Zod', 'MongoDB', 'Airtable', 'Webhooks', 'Vercel', 'Railway', 'Lovable', 'MCP (Model Context Protocol)', 'Agentes de IA', 'Git / GitHub', 'ClickUp / Kanban'],
      'Aprendiendo': ['Python', 'FastAPI', 'LangChain / RAG']
    },

    experience: [
      {
        title: 'Full Stack Developer',
        org: 'PR Tech AI',
        period: '2026 — actualidad',
        summary:
          'Plataforma que detecta oportunidades de prensa y arma kits de comunicación con IA. Trabajo en el sistema de roles y en el aislamiento entre cuentas (que ningún cliente pueda ver datos de otro). Next.js 15 + MongoDB, flujo de rama → PR → code review → producción.',
        highlight:
          'Entré resolviendo un ejercicio técnico de aislamiento multi-tenant con 13 tests, incluyendo un test de arquitectura que rompe el build si alguien se saltea la capa de datos.',
        link: 'https://github.com/jsstagno90/account-isolation-demo',
        linkLabel: 'Ver el ejercicio de admisión'
      },
      {
        title: 'Desarrollador (pasantía Henry)',
        org: 'Nateco — almacén natural, Bariloche',
        period: '2026 — actualidad',
        summary:
          'Reconstruí su tienda online completa. Cuando evaluaban migrar a otra plataforma, les propuse escalar la que ya teníamos e integrar su futuro sistema de gestión por API. Aceptaron.'
      },
      {
        title: 'Colaborador de desarrollo web',
        org: 'Proyecto independiente',
        period: '2026 — actualidad',
        summary:
          'Apoyo a desarrolladores en tareas de React y Node.js, integraciones con Supabase, pruebas, mejoras de funcionalidades y resolución de incidencias.'
      },
      {
        title: 'Diseñador y operador CNC',
        org: 'Artesalandia',
        period: '2010 — actualidad',
        summary:
          'Diseño y fabricación en CorelDRAW y Aspire, operación de router CNC y corte láser, catálogos y listas de precios, pedidos y atención al cliente. Ahora también le estoy construyendo su e-commerce.',
        highlight:
          'Antes tuve emprendimientos propios: un garage privado (2013–2016) y un puesto de comidas (2019–2021), donde manejaba gestión, ventas y caja.'
      }
    ],

    education: [
      'Full Stack Developer — UTN (certificado, 2022–2023)',
      'AI Automation — SoyHenry (2025–2026)',
      'Full Stack Developer — SoyHenry (completo)',
      'AI Engineer — bootcamp (en curso)'
    ],

    // -----------------------------------------------------------------------
    // PROYECTOS — ordenados por lo que mejor me representa
    // decisions: el "por qué" detrás de cada proyecto. Es lo que más
    // diferencia un portfolio: no qué usé, sino qué decidí y por qué.
    // -----------------------------------------------------------------------
    projects: [
      {
        id: 'nateco',
        name: 'Nateco',
        kind: 'Cliente real · E-commerce + IA',
        featured: true,
        summary:
          'Tienda online y panel de gestión para un almacén natural de Bariloche. 255 productos reales, checkout por WhatsApp, CRM, dashboard de ventas y un asistente de compras con IA que agrega productos al carrito.',
        stack: ['HTML/CSS/JS', 'Supabase', 'PostgreSQL + RLS', 'Gemini', 'Vercel', 'Chart.js'],
        metrics: ['255 productos', '18 categorías', '0 servidores propios'],
        image: 'img/nateco.jpg',
        live: 'https://nateco.vercel.app',
        repo: 'https://github.com/jsstagno90/Nateco',
        decisions: [
          {
            problem: 'Si el navegador calcula el total del pedido, cualquiera puede mandar un total inventado.',
            decision: 'El total lo recalcula un trigger en Postgres a partir de productos y cantidades.',
            why: 'La regla de negocio vive donde no se puede manipular.'
          },
          {
            problem: 'Un almacén chico no puede pagar un servidor 24/7 ni mantenerlo.',
            decision: 'Sitio 100% estático + Supabase, con la seguridad en Row Level Security.',
            why: 'Costo de hosting casi cero y nada que mantener. La clave pública puede ser pública porque las políticas son las que protegen.'
          },
          {
            problem: 'Un modelo de IA puede "inventar" un producto que no existe.',
            decision: 'Antes de tocar el carrito, cada producto que devuelve Gemini se valida contra el catálogo real.',
            why: 'Nunca confío a ciegas en lo que responde un modelo.'
          }
        ]
      },
      {
        id: 'axora',
        name: 'AXORA',
        kind: 'Proyecto final Full Stack · Fintech',
        featured: true,
        summary:
          'Billetera virtual multi-moneda para viajeros: saldos en ARS, COP, MXN, USD, EUR, cargas, transferencias entre usuarios, cambio de divisas con cotización en vivo y un asistente con IA que opera por vos (con tu confirmación).',
        stack: ['React 19', 'TypeScript', 'Vite', 'Express 5', 'PostgreSQL', 'JWT', 'Gemini', 'Vitest', 'Swagger'],
        metrics: ['184 tests', 'API documentada', 'Front + back en producción'],
        live: 'https://axora-frontend-five.vercel.app',
        repo: 'https://github.com/axoratechgroup/axora-frontend',
        extraLink: { label: 'API (Swagger)', url: 'https://axora-backend-production-4e8d.up.railway.app/docs' },
        decisions: [
          {
            problem: 'Un chatbot que mueve plata no puede ejecutar nada por su cuenta.',
            decision: 'La IA solo propone la operación; el usuario la ve en una tarjeta y la confirma.',
            why: 'La IA asiste, la persona decide. Cero operaciones por un malentendido del modelo.'
          },
          {
            problem: 'Si el mail de aviso se manda y la transferencia falla (o al revés), quedan datos inconsistentes.',
            decision: 'Patrón outbox: la notificación se registra en la misma transacción SQL que el movimiento y se envía después del COMMIT.',
            why: 'Ningún aviso sale por un movimiento que no existe, y cada envío queda registrado como enviado o fallido.'
          },
          {
            problem: 'Las comisiones escondidas rompen la confianza en una fintech.',
            decision: 'Desglose visible de la comisión (0,3%) antes de confirmar cada cambio.',
            why: 'Transparencia como parte del producto, no como letra chica.'
          }
        ]
      },
      {
        id: 'mcp',
        name: 'Servidor MCP para GitHub',
        kind: 'Proyecto integrador · IA + herramientas',
        summary:
          'Servidor MCP (Model Context Protocol) en TypeScript que le da a un asistente de IA 8 herramientas para operar GitHub en lenguaje natural: crear, listar y obtener repos; crear, listar, actualizar y cerrar issues; listar commits.',
        stack: ['TypeScript', 'Node.js', 'MCP SDK', 'Octokit', 'Zod', 'Vitest'],
        metrics: ['8 tools', '10 archivos de tests', 'Arquitectura en capas'],
        repo: 'https://github.com/jsstagno90/ProyectoM5_JuanStagno',
        decisions: [
          {
            problem: 'Un modelo puede llamar a una herramienta con parámetros mal formados.',
            decision: 'Cada tool valida su entrada con Zod antes de tocar la API de GitHub.',
            why: 'Los errores se frenan en la puerta, con un mensaje claro, no a mitad de camino.'
          },
          {
            problem: 'Si cada herramienta habla directo con GitHub, validar, manejar errores y testear se vuelve un caos.',
            decision: 'Arquitectura en capas: tools → schemas (Zod) → handlers → Octokit → GitHub API, con manejo de errores centralizado.',
            why: 'Cada capa hace una sola cosa, y los errores de GitHub se traducen a mensajes claros en un solo lugar.'
          },
          {
            problem: 'Testear contra la API real es lento, frágil y gasta rate limit.',
            decision: 'Suite de tests con Vitest mockeando Octokit.',
            why: 'Tests rápidos y repetibles que prueban mi lógica, no la conexión a internet.'
          }
        ]
      },
      {
        id: 'bella',
        name: 'Salón Bella',
        kind: 'AI Automation · Turnos con agente',
        summary:
          'Sistema de turnos para un salón de belleza con "Bella", un agente de IA que conversa con clientes y reserva. Orquestado con n8n sobre Supabase.',
        stack: ['n8n', 'Supabase', 'PostgreSQL', 'Gemini', 'Lovable'],
        metrics: ['Agente conversacional', 'Reservas automáticas'],
        live: 'https://salonbellahenry.lovable.app',
        decisions: [
          {
            problem: 'Un turno puede entrar por el agente o por la web, y las reglas tienen que ser las mismas.',
            decision: 'La lógica de reserva vive en funciones RPC y triggers de PostgreSQL.',
            why: 'Una sola fuente de verdad: no importa quién reserve, la base valida igual.'
          },
          {
            problem: 'Los turnos se corrían de hora entre el agente, la base y la web.',
            decision: 'Normalicé el manejo de zonas horarias en toda la cadena.',
            why: 'Un turno a la hora equivocada es peor que no tener sistema.'
          }
        ]
      },
      {
        id: 'cryptomind',
        name: 'CryptoMind Bot',
        kind: 'Python · Trading algorítmico',
        summary:
          'Bot de trading para Binance Futures con dos estrategias (Market Making y Order Flow Scalping), 7 pares, stop loss automático y dashboard en tiempo real.',
        stack: ['Python', 'Binance Futures API'],
        metrics: ['2 estrategias', '7 pares'],
        repo: 'https://github.com/jsstagno90/cryptomind-bot',
        decisions: [
          {
            problem: 'Binance rechaza órdenes si el precio o la cantidad no respetan la precisión de cada par.',
            decision: 'Redondeo por símbolo según las reglas de cada mercado.',
            why: 'Una orden rechazada en el momento justo es plata perdida.'
          },
          {
            problem: 'En un momento se me filtraron credenciales en el historial del repo.',
            decision: 'Limpié el historial completo del repo con git filter-repo.',
            why: 'Borrar el archivo no alcanza: el secreto sigue en los commits viejos.'
          },
          {
            problem: '¿Funciona de verdad?',
            decision: 'Lo dejé operando una noche con plata real: terminó con una pérdida mínima.',
            why: 'Prefiero mostrar el resultado honesto. Me enseñó más que cualquier backtest.'
          }
        ]
      },
      {
        id: 'artesalandia',
        name: 'Artesalandia',
        kind: 'Negocio propio · E-commerce + IA',
        summary:
          'El e-commerce de mi propio emprendimiento: catálogo, panel de administración, importación de productos desde Excel y un asistente con IA que responde consultas y arma presupuestos con los precios reales.',
        stack: ['React', 'TypeScript', 'Vite', 'Supabase', 'n8n', 'Gemini', 'Zod'],
        metrics: ['Uso real', 'Presupuestos con IA'],
        live: 'https://artesalandia.lovable.app',
        repo: 'https://github.com/jsstagno90/artesalandia',
        decisions: [
          {
            problem: 'Cargar cientos de productos a mano en un panel es inviable.',
            decision: 'Importación del catálogo desde planillas de Excel.',
            why: 'Me adapto a cómo trabaja el negocio, no al revés.'
          },
          {
            problem: 'Un chatbot genérico no sabe los precios reales.',
            decision: 'El asistente consulta la base de productos (vía n8n) antes de responder o presupuestar.',
            why: 'La IA como agente de apoyo con datos reales, no como un chat que improvisa.'
          }
        ]
      }
    ],

    // Otros proyectos: no tienen tarjeta en la web, pero el bot los conoce
    otherProjects: [
      'Smart Toy Store Platform (proyecto final en SoyHenry): juguetería online con sistema de cotizaciones, sincronización de precios y stock en tiempo real entre Airtable y Supabase con n8n, y un chatbot con agente de IA.'
    ],

    // Contexto extra para el bot (sale de mi CV). No se muestra en la web.
    botNotes: [
      'Busco una primera oportunidad formal como desarrollador para aportar mi base técnica y seguir creciendo en equipo.',
      'El servidor MCP lo probé con clientes de IA compatibles con MCP, como Antigravity.',
      'Mi proyecto más completo es Nateco: es un cliente real y ahí junté todo — e-commerce con 255 productos, base de datos en Supabase con seguridad (RLS y triggers), panel de administración con dashboard y CRM, pedidos en vivo y un asistente de compras con IA. Si me preguntan por mi proyecto más completo o del que estoy más orgulloso, es Nateco (AXORA es mi proyecto final de la carrera).',
      'Idiomas: español nativo, inglés A1.',
      'Cómo está hecho este chat: lo armé yo. La web es HTML/CSS/JS y el chat llama a una función serverless en Vercel que le pasa a Gemini mis datos (el mismo archivo que usa la web) y unas reglas: responder en primera persona, no inventar nada y ser honesto. La API key nunca llega al navegador.'
    ],

    // Preguntas sugeridas que aparecen en el chat
    suggestedQuestions: [
      '¿Qué experiencia tenés con IA?',
      '¿Cuál es tu proyecto más completo?',
      '¿Trabajaste con clientes reales?',
      '¿Cómo manejás la seguridad?'
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PROFILE;
  else root.PROFILE = PROFILE;
})(this);
