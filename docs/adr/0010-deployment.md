# ADR 0010: Despliegue en Vercel y un único servicio en Render

Estado: aceptado; preparado en el repositorio, despliegue pendiente de ejecutar por el propietario de las cuentas.

## Problema

Vercel ejecuta Next.js como funciones sin servidor: cada petición puede caer en una instancia distinta y las instancias son efímeras. El BFF y el proveedor ficticio son procesos de larga vida con estado en memoria (carritos, pedidos, stock), y la garantía de no vender dos veces la última unidad depende de una sección crítica síncrona en **un solo proceso** ([ADR 0006](0006-order-acceptance-idempotency.md)). Además, todos los servicios escuchaban solo en loopback.

## Decisión

- **Storefront en Vercel** (región `fra1`), con `apps/storefront` como directorio raíz. `vercel.json` instala desde la raíz del monorepo y compila `@atelier/contracts` antes de `next build`, porque sus tipos y módulos se publican desde `dist/`.
- **BFF y proveedor en un único servicio Docker en Render** (región `frankfurt`, una instancia, siempre encendida). `scripts/serve-backend.mjs` los arranca en un mismo proceso: el proveedor solo en `127.0.0.1` dentro del contenedor y el BFF en `0.0.0.0:$PORT`. Así se conservan la sección crítica y el estado en memoria sin cambiar la arquitectura.
- **Token compartido.** Con el BFF accesible por internet, todas las rutas `/api` exigen `Authorization: Bearer <BFF_API_TOKEN>` cuando el token está configurado (mínimo 32 caracteres; comparación en tiempo constante sobre SHA-256; 401 `UNAUTHORIZED` con sobre seguro). `/healthz` queda abierto para el chequeo de salud. En producción el servicio no arranca sin token. El token solo existe en la configuración de Render y de Vercel, nunca en el repositorio ni en el navegador; en local y en pruebas no se exige.
- **No indexar.** Metadatos `noindex, nofollow` en todas las páginas y `robots.txt` que prohíbe todo: es una tienda ficticia.
- La imagen usa Node 22.23.5, instala en la etapa final solo las dependencias de producción de los paquetes del backend (sin Next ni React) y se ejecuta como el usuario `node`. Un workflow de CI construye la imagen y comprueba que sin token sale con error y que con token responde `/healthz` 200 y `/api` 401.

## Alternativas descartadas

- **Todo en Vercel con Route Handlers.** Obliga a mover carritos, pedidos y stock a una base de datos externa con transacciones; es un cambio de arquitectura del tamaño de un hito.
- **Todo en un contenedor sin Vercel.** Más fiel y simple, pero no usa Vercel, que era el requisito.
- **CORS y llamadas desde el navegador al BFF.** Expondría la dirección del BFF y obligaría a autenticar al navegador; las páginas ya llaman al BFF desde el servidor.

## Límites

- El estado se pierde en cada despliegue o reinicio del servicio de Render.
- No se puede escalar a más de una instancia sin una transacción duradera.
- Un plan que duerma el servicio hace fallar la primera petición por timeout (2,5 s en el cliente).
- La latencia entre Vercel y Render se suma a cada página; ambas regiones están en Frankfurt para reducirla. No se ha medido en producción.
- La documentación oficial de Render y Vercel no estaba accesible desde el entorno donde se preparó; `render.yaml` y `vercel.json` usan campos estables y la guía indica cómo validarlos.
