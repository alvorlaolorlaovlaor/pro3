/**
 * Loader gag: letters of "LOADING" fall and pile up while we wait for
 * the first user gesture (required to unlock audio anyway). Doubles as
 * a preview of scene 1's physics.
 */
const Matter = window.Matter;
const WORD = "LOADING";

export function startLoader(rootEl, onDismiss) {
  const canvas = rootEl.querySelector("[data-loader-canvas]");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const rect = rootEl.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  const engine = Matter.Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 } });
  const runner = Matter.Runner.create();
  const w = () => canvas.clientWidth;
  const h = () => canvas.clientHeight;
  const wallOpts = { isStatic: true, render: { visible: false } };
  Matter.World.add(engine.world, [
    Matter.Bodies.rectangle(w() / 2, h() + 50, w() * 2, 100, wallOpts),
    Matter.Bodies.rectangle(-50, h() / 2, 100, h() * 2, wallOpts),
    Matter.Bodies.rectangle(w() + 50, h() / 2, 100, h() * 2, wallOpts),
  ]);

  const letters = [];
  let nextDrop = 0;
  let dropIndex = 0;
  const fontSize = Math.min(w() / 8, 110);

  Matter.Runner.run(runner, engine);

  let raf;
  let dismissed = false;

  function loop() {
    if (dismissed) return;
    const now = performance.now();
    if (now > nextDrop && dropIndex < 60) {
      const ch = WORD[dropIndex % WORD.length];
      const bw = fontSize * 0.6;
      const bh = fontSize * 0.85;
      const body = Matter.Bodies.rectangle(
        w() * 0.2 + Math.random() * w() * 0.6,
        -100,
        bw,
        bh,
        { restitution: 0.35, friction: 0.2, chamfer: { radius: 6 } }
      );
      body._char = ch;
      letters.push(body);
      Matter.World.add(engine.world, body);
      dropIndex++;
      nextDrop = now + 90;
    }

    ctx.clearRect(0, 0, w(), h());
    ctx.font = `700 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#1B1B1F";
    for (const b of letters) {
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      ctx.fillText(b._char, 0, fontSize * 0.04);
      ctx.restore();
    }
    raf = requestAnimationFrame(loop);
  }
  loop();

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    cancelAnimationFrame(raf);
    Matter.Runner.stop(runner);
    rootEl.classList.add("is-gone");
    setTimeout(() => rootEl.remove(), 700);
    onDismiss?.();
  }

  rootEl.addEventListener("click", dismiss, { once: true });
  rootEl.addEventListener("touchstart", dismiss, { once: true, passive: true });
}
