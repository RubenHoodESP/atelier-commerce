# ADR 0007: Movimiento con CSS y Motion

Estado: aceptado como corte de pulido entre los cortes 3 y 4 de M3.

## Decisión

El movimiento debe transmitir calma y precisión, no espectáculo: duraciones de 200–700 ms, una única curva de desaceleración suave (`--ease-atelier`), sin rebotes, y solo `transform` y `opacity` salvo el plegado de líneas eliminadas. Se usan dos herramientas:

- **CSS** para todo lo que no necesita JavaScript: entrada escalonada (`.reveal`) en portada, catálogo, ficha y confirmación; segundero del reloj (`.watch-seconds`, giro de 60 s); elevación de la ilustración al pasar el ratón o enfocar una tarjeta (`.watch-lift`). En el catálogo el segundero solo gira al pasar el ratón o enfocar, para no mover doce relojes a la vez; en la ficha gira siempre.
- **Motion 14.9.0** (MIT, sucesor de Framer Motion) solo para lo que CSS no resuelve bien: recolocar tarjetas al filtrar u ordenar (`layout`) y animar salidas (`AnimatePresence`) al eliminar líneas de la bolsa, más un fundido del subtotal.

Motion se limita a Client Components hoja (`CatalogGrid`, `BagEditor`) mediante `MotionScope`: `LazyMotion` con `domMax` cargado de forma síncrona y `strict` (solo componentes `m.*`), y `MotionConfig reducedMotion="user"`. Las Server Components no cambian. El contador de la cabecera, presente en todas las páginas, usa una animación CSS con `key` en lugar de Motion.

**Corrección (corte 4 de M3).** La primera versión cargaba las funciones de Motion de forma diferida. Una prueba de estrés mostró que, si se filtraba antes de que llegaran, la salida de `AnimatePresence` no terminaba y las tarjetas eliminadas quedaban en pantalla (1 fallo en 120 ejecuciones con movimiento activo; la URL ya mostraba el filtro y seguían las 12 tarjetas). Con carga síncrona: 0 fallos en 480 ejecuciones.

## Reglas

- **Nada oculto esperando a JavaScript.** Motion escribiría su estado inicial (por ejemplo `opacity: 0`) en el HTML del servidor; sin JavaScript ese contenido no aparecería. Por eso las entradas son CSS y Motion usa `AnimatePresence initial={false}`: solo anima cambios posteriores. Una prueba E2E comprueba que el HTML de portada, catálogo y ficha no contiene estilos `opacity: 0`, y otra que sin JavaScript el titular termina con opacidad 1.
- **`prefers-reduced-motion`.** Con la preferencia activa no hay entrada, segundero ni elevación (CSS), y Motion omite animaciones de posición y transformación.
- **Accesibilidad sin regresiones.** Las salidas no retrasan el traslado de foco a la región de estado de la bolsa (corte 2).
- **Pruebas deterministas.** Playwright usa `reducedMotion: 'reduce'` por defecto; `tests/e2e/motion.spec.ts` reactiva el movimiento para comprobar las animaciones. La suite completa también se ejecutó con movimiento activo.
- **Coste medido.** La primera medición solo contaba los chunks referenciados por el HTML y omitía el chunk diferido, así que infravaloraba el coste. Medición corregida (todo el JavaScript descargado por el navegador en un contexto limpio por ruta, gzip): `/` 135,6 KB y `/products/watch-001` 136,3 KB (sin Motion); `/products` 182,3 KB y `/cart` 181,8 KB con `domMax` síncrono. La variante `domAnimation` (sin `layout`, perdería la reordenación de tarjetas) bajaría ambas a unos 168 KB.

## Alternativas descartadas

- **GSAP.** Muy potente para líneas de tiempo y scroll, pero imperativo, más pesado en React y con licencia gratuita no MIT. Excesivo para estas transiciones.
- **AutoAnimate.** Mínimo, pero con poco control sobre curvas y salidas.
- **View Transitions nativas** (React 19.3 exporta `ViewTransition`). Permitirían que la ilustración viaje de la tarjeta a la ficha; quedan como experimento posterior tras verificar su soporte en Next 16.4.
- **Animaciones de entrada con Motion.** Dejarían contenido invisible sin JavaScript.
