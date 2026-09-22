# Portfolio — Juan Stagno

Mi portfolio: proyectos con las decisiones técnicas detrás de cada uno, un asistente con IA que responde preguntas sobre mí, y un "match" que cruza una oferta de trabajo con mis proyectos (incluyendo lo que me falta).

Sin frameworks ni build: HTML, CSS y JS + una función serverless en Vercel que habla con Gemini.

## Estructura

```
index.html          → la página
css/styles.css      → estilos (modo oscuro y claro)
js/main.js          → dibuja la página, chat y match
data/profile.js     → TODOS mis datos y proyectos (única fuente de verdad)
api/chat.js         → función serverless: chat + match con Gemini
img/                → capturas de los proyectos
```

`data/profile.js` lo usan la página **y** el asistente. Si agrego un proyecto ahí, aparece en la web y el bot ya lo conoce.

## Publicarlo en Vercel

1. Subir esta carpeta a un repo nuevo en GitHub (ej. `portfolio`).
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importar el repo. Sin build command, sin framework.
3. **Settings → Environment Variables** → agregar `GEMINI_API_KEY` (gratis en [aistudio.google.com/apikey](https://aistudio.google.com/apikey)).
4. **Redeploy** para que la función tome la key.

## Probarlo local

```bash
npm i -g vercel
vercel dev
```

Con `npx serve .` se ve la página, pero el chat y el match necesitan `vercel dev` (la función de `api/`).

## Agregar capturas

Poné la imagen en `img/` y sumá `image: 'img/archivo.png'` al proyecto en `data/profile.js`. Los proyectos con `featured: true` la muestran grande.

## Seguridad

- La API key de Gemini vive solo en Vercel, nunca llega al navegador.
- El match descarta cualquier proyecto que devuelva el modelo y no exista en `profile.js`.
- Límite de largo de mensajes y rate limit básico por IP para que no me gasten la cuota.
