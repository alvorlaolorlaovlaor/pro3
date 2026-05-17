import { Scene } from "../engine/Scene.js";
import { palette, accents } from "../engine/palette.js";
import { createMouseConstraint } from "../engine/Input.js";
import { playMarimba } from "../engine/audio.js";

const Matter = window.Matter;

// C major pentatonic across two octaves — pleasant in any combination.
const NOTES = ["C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4", "G4", "A4", "C5", "D5"];

export class PendulumOrchestra extends Scene {
  constructor(section) {
    super(section);
    this.pendulums = [];
    this.mouseBits = null;
  }

  setup() {
    const { w, h } = this.renderer;
    this.engine.gravity.y = 1;
    this._build(w, h);
    const { mouse, constraint } = createMouseConstraint(Matter, this.canvas, this.engine);
    this.mouseBits = { mouse, constraint };
    Matter.World.add(this.world, constraint);
  }

  _build(w, h) {
    const count = Math.min(NOTES.length, Math.max(8, Math.floor(w / 110)));
    const top = h * 0.08;
    const margin = w * 0.08;
    const span = w - margin * 2;
    const step = span / (count - 1);
    const minLen = h * 0.28;
    const maxLen = h * 0.62;

    for (let i = 0; i < count; i++) {
      const x = margin + i * step;
      const t = i / (count - 1);
      const length = minLen + (maxLen - minLen) * t;
      const note = NOTES[Math.min(NOTES.length - 1, i % NOTES.length)];
      const radius = 14 + (1 - t) * 10;

      const anchor = { x, y: top };
      const bob = Matter.Bodies.circle(x + length * 0.18, top + length, radius, {
        density: 0.004,
        frictionAir: 0.005,
        restitution: 0.4,
      });
      const string = Matter.Constraint.create({
        pointA: anchor,
        bodyB: bob,
        length,
        stiffness: 0.9,
        damping: 0.02,
        render: { visible: false },
      });
      Matter.World.add(this.world, [bob, string]);
      this.pendulums.push({
        bob,
        string,
        anchor,
        length,
        note,
        color: accents[i % accents.length],
        lastSign: Math.sign(bob.position.x - anchor.x) || 1,
        lastTrigger: 0,
      });
    }
  }

  onResize() {
    Matter.World.clear(this.world, false);
    this.pendulums = [];
    this._build(this.renderer.w, this.renderer.h);
    if (this.mouseBits) Matter.World.add(this.world, this.mouseBits.constraint);
  }

  draw() {
    const { ctx, w, h } = this.renderer;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, w, h);

    // Anchor bar
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    if (this.pendulums.length) {
      const first = this.pendulums[0].anchor;
      const last = this.pendulums.at(-1).anchor;
      ctx.beginPath();
      ctx.moveTo(first.x - 20, first.y);
      ctx.lineTo(last.x + 20, last.y);
      ctx.stroke();
    }

    const now = performance.now();
    for (const p of this.pendulums) {
      // String
      ctx.strokeStyle = palette.inkSoft;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.anchor.x, p.anchor.y);
      ctx.lineTo(p.bob.position.x, p.bob.position.y);
      ctx.stroke();
      // Anchor dot
      ctx.fillStyle = palette.ink;
      ctx.beginPath();
      ctx.arc(p.anchor.x, p.anchor.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Bob
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.bob.position.x, p.bob.position.y, p.bob.circleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Trigger a note when the bob crosses its anchor's vertical (zero-crossing).
      const sign = Math.sign(p.bob.position.x - p.anchor.x) || 1;
      const speed = Math.hypot(p.bob.velocity.x, p.bob.velocity.y);
      if (sign !== p.lastSign && speed > 0.4 && now - p.lastTrigger > 90) {
        playMarimba(p.note, Math.min(1, 0.3 + speed / 14));
        p.lastTrigger = now;
        // Flash ring on strike
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.bob.position.x, p.bob.position.y, p.bob.circleRadius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      p.lastSign = sign;
    }
  }
}
