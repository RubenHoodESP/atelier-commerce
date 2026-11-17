# ADR 0008: Tipografía de display Cormorant Garamond

Estado: aceptado junto al corte de pulido de movimiento ([ADR 0007](0007-motion.md)).

## Decisión

Los titulares (`h1`, `h2`) usan Cormorant Garamond: una Garamond de alto contraste y trazos finos que transmite la precisión clásica de la relojería con un tono sobrio. El cuerpo sigue en sans (Arial) para legibilidad. Se eligió frente a Fraunces (cálida pero más pesada y llamativa en cursiva) e Instrument Serif (moderna y condensada, más fría y con un solo peso, apretada en nombres largos); la comparación visual se hizo sobre la paleta y los tamaños reales.

- Pesos: 500 normal para titulares (fijado con `font-medium` para que el navegador no sintetice negritas) y 400 cursiva solo para énfasis puntual (`<em>`, por ejemplo "rhythm." en el catálogo).
- Sus trazos finos exigen tamaños de display (≥ 24 px). No se usa en texto de cuerpo ni en precios pequeños.
- Tamaños de `h1` ligeramente mayores y con menos interlineado que con Georgia, porque Cormorant tiene una altura de x menor.

## Integración

- `next/font/local` en `apps/storefront/app/fonts.ts`, con variable CSS `--font-display` aplicada en `<html>` y usada por `--font-editorial`. Next genera un respaldo con métricas ajustadas (`adjustFontFallback: 'Times New Roman'`) para limitar el salto de texto, sirve los archivos con caché `immutable` de un año y los precarga con la cabecera HTTP `Link`.
- Los dos archivos `woff2` (subconjunto latino, incluye €) se copiaron sin cambios del paquete npm `@fontsource/cormorant-garamond@5.3.0`, con licencia SIL OFL 1.1, procedencia e integridad SHA-256 registradas en `apps/storefront/app/fonts/README.md`. Se incluyen en el repositorio en vez de depender del paquete en `node_modules` porque `next/font/local` necesita una ruta estable y así la compilación no depende de la red ni de cómo npm coloque el paquete en el monorepo.
- No hay peticiones a servicios de fuentes de terceros.

## Coste medido

Dos archivos de 23,3 KB y 23,7 KB (≈ 47 KB, ya comprimidos); el JavaScript no cambia. La cursiva se precarga en todas las páginas aunque solo la usa el catálogo: se acepta para evitar el cambio de fuente en ese titular, a cambio de 23 KB que quedan en caché. Si se quisiera evitar, la alternativa es una segunda llamada a `localFont` con `preload: false` para la cursiva.
