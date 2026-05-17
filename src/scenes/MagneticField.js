import { Scene } from "../engine/Scene.js";
import { palette, accents } from "../engine/palette.js";

const Matter = window.Matter;

export class MagneticField extends Scene {
  constructor(section) {
    super(section);
    this.particles = [];
    this.polarity = 1; // 1 = attract, -1 = repel
    this.pointer = { x: -9999, y: -9999, active: false };
    this._handlers = null;
  }

  setup() {
    const { w, h } = this.renderer;
    this.engine.gravity.y = 0;

    const count = Math.min(450, Math.floor((w * h) / 2200));
    for (let i = 0; i < count; i++) {
      const body = Matter.Bodies.circle(
        Math.random() * w,
        Math.random() * h,
        2 + Math.random() * 3,
        {
          frictionAir: 0.08,
          restitution: 0.6,
          density: 0.001,
        }
      );
      body._color = Math.random() < 0.6 ? palette.ink : accents[i % accents.length];
      this.particles.push(body);
    }
    // Soft bounds so they don't drift offscreen forever.
    const t = 80;
    const wallOpts = { isStatic: true, render: { visible: false } };
    Matter.World.add(this.world, [
      Matter.Bodies.rectangle(w / 2, -t / 2, w, t, wallOpts),
      Matter.Bodies.rectangle(w / 2, h + t / 2, w, t, wallOpts),
      Matter.Bodies.rectangle(-t / 2, h / 2, t, h, wallOpts),
      Matter.Bodies.rectangle(w + t / 2, h / 2, t, h, wallOpts),
    ]);
    Matter.World.add(this.world, this.particles);

    Matter.Events.on(this.engine, "beforeUpdate", () => this._applyForces());

    if (!this._handlers) this._bindInput();
  }

  _bindInput() {
    const move = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      this.pointer.x = p.clientX - rect.left;
      this.pointer.y = p.clientY - rect.top;
      this.pointer.active = true;
    };
    const leave = () => { this.pointer.active = false; };
    const flip = (e) => { this.polarity *= -1; e.preventDefault?.(); };

    this.canvas.addEventListener("pointermove", move);
    this.canvas.addEventListener("pointerleave", leave);
    this.canvas.addEventListener("pointerdown", (e) => { move(e); flip(e); });
    this._handlers = { move, leave, flip };
  }

  _applyForces() {
    if (!this.pointer.active) return;
    const { x, y } = this.pointer;
    const k = 4e-5 * this.polarity;
    for (const b of this.particles) {
      const dx = x - b.position.x;
      const dy = y - b.position.y;
      const d2 = dx * dx + dy * dy + 400;
      const d = Math.sqrt(d2);
      const f = (k * b.mass) / d2;
      Matter.Body.applyForce(b, b.position, { x: (f * dx) / d, y: (f * dy) / d });
    }
  }

  onResize() {
    Matter.Events.off(this.engine);
    Matter.World.clear(this.world, false);
    this.particles = [];
    this.setup();
  }

  draw() {
    const { ctx, w, h } = this.renderer;
    // Slight trail effect by overlaying a translucent paper rect each frame.
    ctx.fillStyle = palette.paper + "E6"; // ~90% opaque
    ctx.fillRect(0, 0, w, h);

    for (const b of this.particles) {
      ctx.fillStyle = b._color;
      ctx.beginPath();
      ctx.arc(b.position.x, b.position.y, b.circleRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.pointer.active) {
      ctx.strokeStyle = this.polarity > 0 ? palette.cool : palette.warm;
      ctx.lineWidth = 1.5;
      const r = 22;
      ctx.beginPath();
      ctx.arc(this.pointer.x, this.pointer.y, r, 0, Math.PI * 2);
      ctx.stroke();
      // +/− glyph
      ctx.beginPath();
      ctx.moveTo(this.pointer.x - 7, this.pointer.y);
      ctx.lineTo(this.pointer.x + 7, this.pointer.y);
      if (this.polarity > 0) {
        ctx.moveTo(this.pointer.x, this.pointer.y - 7);
        ctx.lineTo(this.pointer.x, this.pointer.y + 7);
      }
      ctx.stroke();
    }
  }
}
