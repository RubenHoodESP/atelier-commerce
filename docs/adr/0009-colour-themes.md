# ADR 0009: Temas claro y oscuro

Estado: aceptado como primer corte de M4.

## Decisión

Por defecto la tienda sigue la preferencia del sistema (`prefers-color-scheme`). Un selector en la cabecera (Auto, Light, Dark) permite fijar un tema; la elección se guarda en la cookie `atelier_theme` (`HttpOnly`, `SameSite=Lax`, un año, `Secure` en producción) y "Auto" la borra. El layout del servidor lee la cookie y escribe `data-theme` en `<html>`, de modo que el tema elegido se aplica antes del primer pintado: no hay parpadeo ni script en línea. El selector es un formulario nativo con una Server Action (funciona sin JavaScript); con JavaScript, el tema se aplica al instante en el cliente mientras el servidor guarda la elección.

## Paleta y tokens

La paleta oscura es cálida (espresso y crema, sin negro puro) y reutiliza los mismos tokens que la clara (`paper`, `panel`, `ink`, `muted`, `line`, `control`, `accent`). Se eliminaron los colores fijos: botones, enlace de salto y contador usan `text-paper` sobre `bg-ink` (se invierten en oscuro), y el anillo de foco y el segundero usan `--color-accent`. `color-scheme` hace que los controles nativos (selects, campos numéricos, barras de desplazamiento) sigan el tema.

El tema oscuro se declara dos veces en CSS: para `data-theme="dark"` y dentro de `@media (prefers-color-scheme: dark)` cuando el invitado no ha elegido claro. CSS no permite combinar ambos selectores en un solo bloque.

## Verificación

- `tests/theme-contrast.test.ts` lee los tokens de `globals.css`, exige que ambos bloques oscuros sean idénticos y comprueba el contraste WCAG de nueve pares por tema: 4,5:1 para texto y 3:1 para foco y bordes de controles. Una mutación (texto secundario oscuro demasiado oscuro) hace fallar tres comprobaciones.
- `tests/e2e/theme.spec.ts`: Auto sigue al sistema; la elección persiste tras recargar y navegar y gana al sistema; el HTML del servidor ya incluye `data-theme`; la cookie es `HttpOnly`; funciona sin JavaScript; los botones miden al menos 24×24 px (WCAG 2.5.8).

## Alternativas descartadas

- **Solo preferencia del sistema.** Más simple, pero impide elegir un tema distinto al del sistema operativo.
- **Preferencia en `localStorage`.** El servidor no la conoce: obliga a un script bloqueante en `<head>` para evitar el parpadeo y no funciona sin JavaScript.
