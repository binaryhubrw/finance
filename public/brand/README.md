# Brand assets

| File | Used by | Notes |
|---|---|---|
| `logo.png` | `components/Logo.jsx` — the sidebar and the login panel | 512×512, trimmed to the mark with an even margin, white knocked out to transparency. The component sets it on a white tile, because the mark's own blue has too little contrast against the dark blue panel. |

`app/icon.png` is the same artwork at 256×256. Next.js turns any `app/icon.*`
into the favicon by filename, so there is no markup to keep in step.

`components/Logo.jsx` falls back to the drawn `BrandMark` in `Icons.jsx` if
`logo.png` goes missing, so an absent file costs a little polish rather than
breaking the page.

To replace the mark, drop a new square file in as `logo.png` and mirror it to
`app/icon.png`. Both are derived from the supplied artwork; regenerate rather
than editing them in place.
