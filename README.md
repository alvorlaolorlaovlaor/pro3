# Playground

An interactive physics toy box. Scroll through four scenes:

1. **Title Drop** — letters rain down. Drag, throw, stack.
2. **Orchestra** — a row of pendulums. Pluck them; longer ropes ring lower notes.
3. **Slingshot** — pull back the band, let go, knock the tower down.
4. **Chain Reaction** — place pieces, hit **go**, ring the bell.

Konami code (↑ ↑ ↓ ↓ ← → ← → B A) inverts gravity for 5 seconds.

## Stack

- [Matter.js](https://brm.io/matter-js/) for 2D physics
- [GSAP](https://gsap.com/) for transitions
- [Tone.js](https://tonejs.github.io/) for procedural sound
- Plain HTML / CSS / ES modules — no build step.

## Run locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Audio is silent until you click anywhere — that's a browser rule, not a bug. Tap the loader to begin.

## Deploy

Anywhere that serves static files: GitHub Pages, Netlify drag-and-drop, Vercel, Cloudflare Pages. Drop the repo root.

## File layout

```
index.html
src/
├── main.js                       bootstrap + audio unlock
├── style.css
├── engine/
│   ├── Scene.js                  base class — enter/exit/reset
│   ├── SceneManager.js           IntersectionObserver lifecycle
│   ├── Renderer.js               DPR-aware Canvas2D wrapper
│   ├── Input.js                  pointer + MouseConstraint helpers
│   ├── audio.js                  Tone.js instruments
│   └── palette.js                color tokens
├── scenes/
│   ├── TitleDrop.js
│   ├── PendulumOrchestra.js
│   ├── Slingshot.js
│   └── RubeGoldberg.js
└── ui/
    ├── Loader.js                 letters-piling-up splash
    ├── ScrollHint.js
    ├── MuteToggle.js
    └── Konami.js
```
