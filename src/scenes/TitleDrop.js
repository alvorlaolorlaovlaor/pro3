import { Scene } from "../engine/Scene.js";
import { palette, accents } from "../engine/palette.js";
import { createMouseConstraint } from "../engine/Input.js";
import { playCollision } from "../engine/audio.js";

const Matter = window.Matter;
const TITLE = "PLAYGROUND";

export class TitleDrop extends Scene {
  constructor(section) {
    super(section);
    this.letters = [];
    this.walls = [];
    this.mouseBits = null;
  }

  resetLocalState() {
    this.letters = [];
    this.walls = [];
    this.mouseBits = null;
  }

  setup() {
    const { w, h } = this.renderer;
    this.engine.gravity.y = 1;
    this._buildWalls(w, h);
    this._buildLetters(w, h);

    const { mouse, constraint } = createMouseConstraint(Matter, this.canvas, this.engine);
    this.mouseBits = { mouse, constraint };
    Matter.World.add(this.world, constraint);

    // Sound on letter-letter / letter-wall collisions, scaled by impact.
    Matter.Events.on(this.engine, "collisionStart", (evt) => {
      for (const pair of evt.pairs) {
        const v = Math.hypot(pair.bodyA.velocity.x - pair.bodyB.velocity.x,
                             pair.bodyA.velocity.y - pair.bodyB.velocity.y);
        if (v > 2.5) playCollision(Math.min(1, v / 12));
      }
    });
  }

  _buildWalls(w, h) {
    const t = 200;
    const opts = { isStatic: true, render: { visible: false }, restitution: 0.2 };
    this.walls = [
      Matter.Bodies.rectangle(w / 2, h + t / 2, w, t, opts),         // floor
      Matter.Bodies.rectangle(-t / 2, h / 2, t, h * 2, opts),        // left
      Matter.Bodies.rectangle(w + t / 2, h / 2, t, h * 2, opts),     // right
    ];
    Matter.World.add(this.world, this.walls);
  }

  _buildLetters(w, h) {
    const fontSize = Math.min(w / (TITLE.length * 0.9), h * 0.28);
    const ctx = this.renderer.ctx;
    ctx.save();
    ctx.font = `700 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
    const spacing = fontSize * 0.62;
    const totalWidth = TITLE.length * spacing;
    const startX = (w - totalWidth) / 2 + spacing / 2;

    [...TITLE].forEach((ch, i) => {
      const metrics = ctx.measureText(ch);
      const bw = Math.max(metrics.width, fontSize * 0.35) * 1.15;
      const bh = fontSize * 0.95;
      const body = Matter.Bodies.rectangle(
        startX + i * spacing,
        -h * 0.4 - Math.random() * h * 0.6,
        bw,
        bh,
        {
          chamfer: { radius: Math.min(bw, bh) * 0.12 },
          restitution: 0.35,
          friction: 0.15,
          density: 0.0025,
          angle: (Math.random() - 0.5) * 0.4,
        }
      );
      body.label = "letter";
      body._char = ch;
      body._color = i % 3 === 0 ? accents[i % accents.length] : palette.ink;
      body._fontSize = fontSize;
      body._w = bw;
      body._h = bh;
      this.letters.push(body);
    });
    ctx.restore();
    Matter.World.add(this.world, this.letters);
  }

  onResize() {
    Matter.Events.off(this.engine);
    Matter.World.clear(this.world, false);
    this.resetLocalState();
    this.initialized = false;
    this._ensureInitialized();
  }

  draw() {
    const { ctx, w, h } = this.renderer;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const b of this.letters) {
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      ctx.font = `700 ${b._fontSize}px "Space Grotesk", system-ui, sans-serif`;
      ctx.fillStyle = b._color;
      ctx.fillText(b._char, 0, b._fontSize * 0.04);
      ctx.restore();
    }
  }
}
