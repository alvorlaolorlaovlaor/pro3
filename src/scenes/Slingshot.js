import { Scene } from "../engine/Scene.js";
import { palette, accents } from "../engine/palette.js";
import { createMouseConstraint } from "../engine/Input.js";
import { playCollision, playWhoosh } from "../engine/audio.js";

const Matter = window.Matter;

export class Slingshot extends Scene {
  constructor(section) {
    super(section);
    this.anchor = { x: 0, y: 0 };
    this.projectile = null;
    this.band = null;
    this.blocks = [];
    this.mouseBits = null;
  }

  setup() {
    const { w, h } = this.renderer;
    this.engine.gravity.y = 1;

    // Ground + walls
    const t = 200;
    const wallOpts = { isStatic: true, render: { visible: false }, friction: 0.6 };
    Matter.World.add(this.world, [
      Matter.Bodies.rectangle(w / 2, h - 30, w, 60, { ...wallOpts, friction: 0.9 }), // ground
      Matter.Bodies.rectangle(-t / 2, h / 2, t, h * 2, wallOpts),
      Matter.Bodies.rectangle(w + t / 2, h / 2, t, h * 2, wallOpts),
      Matter.Bodies.rectangle(w / 2, -t, w, t, wallOpts),
    ]);

    // Slingshot anchor on the left.
    this.anchor = { x: w * 0.18, y: h * 0.55 };

    this._spawnProjectile();
    this._buildTower(w, h);

    const { mouse, constraint } = createMouseConstraint(Matter, this.canvas, this.engine);
    this.mouseBits = { mouse, constraint };
    Matter.World.add(this.world, constraint);

    // Mark the projectile "released" when the user lets go of the band. The
    // actual snap happens in afterUpdate once the ball has crossed the anchor —
    // that's how classic Matter slingshot demos avoid the band cutting force
    // off too early.
    this._releasing = false;
    Matter.Events.on(constraint, "enddrag", (e) => {
      if (e.body === this.projectile) {
        this._releasing = true;
        playWhoosh();
      }
    });

    Matter.Events.on(this.engine, "collisionStart", (evt) => {
      for (const pair of evt.pairs) {
        const v = Math.hypot(
          pair.bodyA.velocity.x - pair.bodyB.velocity.x,
          pair.bodyA.velocity.y - pair.bodyB.velocity.y
        );
        if (v > 3) playCollision(Math.min(1, v / 14));
      }
    });

    // Snap the band once the ball flies past the anchor, then recycle
    // projectiles that fall off the world or have come to rest.
    Matter.Events.on(this.engine, "afterUpdate", () => {
      if (this.projectile && this.band && this._releasing) {
        const p = this.projectile;
        if (p.position.x > this.anchor.x + 40 || p.position.y < this.anchor.y - 40) {
          Matter.World.remove(this.world, this.band);
          this.band = null;
          this._releasing = false;
        }
      }
      if (!this.projectile || this.band) return;
      const p = this.projectile;
      if (
        p.position.y > h + 200 ||
        p.position.x > w + 200 ||
        p.position.x < -200 ||
        (Math.abs(p.velocity.x) < 0.3 && Math.abs(p.velocity.y) < 0.3 && p.position.x > w * 0.3)
      ) {
        Matter.World.remove(this.world, p);
        this.projectile = null;
        setTimeout(() => this._spawnProjectile(), 350);
      }
    });
  }

  _spawnProjectile() {
    const r = 22;
    const ball = Matter.Bodies.circle(this.anchor.x, this.anchor.y, r, {
      density: 0.02,
      restitution: 0.5,
      friction: 0.3,
    });
    ball._color = palette.warm;
    this.projectile = ball;
    this.band = Matter.Constraint.create({
      pointA: this.anchor,
      bodyB: ball,
      stiffness: 0.05,
      damping: 0.001,
      render: { visible: false },
    });
    Matter.World.add(this.world, [ball, this.band]);
  }

  _buildTower(w, h) {
    const blockW = 36;
    const blockH = 22;
    const baseX = w * 0.72;
    const groundY = h - 60;
    const rows = 6;
    for (let r = 0; r < rows; r++) {
      const cols = rows - r;
      const rowY = groundY - blockH / 2 - r * blockH;
      for (let c = 0; c < cols; c++) {
        const x = baseX + (c - (cols - 1) / 2) * (blockW + 2);
        const block = Matter.Bodies.rectangle(x, rowY, blockW, blockH, {
          density: 0.003,
          friction: 0.6,
          restitution: 0.1,
          chamfer: { radius: 3 },
        });
        block._color = accents[(r + c) % accents.length];
        this.blocks.push(block);
      }
    }
    Matter.World.add(this.world, this.blocks);
  }

  onResize() {
    Matter.Events.off(this.engine);
    Matter.World.clear(this.world, false);
    this.blocks = [];
    this.projectile = null;
    this.band = null;
    this.setup();
  }

  draw() {
    const { ctx, w, h } = this.renderer;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, w, h);

    // Ground line
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h - 60);
    ctx.lineTo(w, h - 60);
    ctx.stroke();

    // Slingshot post
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(this.anchor.x, h - 60);
    ctx.lineTo(this.anchor.x, this.anchor.y);
    ctx.stroke();
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.arc(this.anchor.x, this.anchor.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Band
    if (this.band && this.projectile) {
      ctx.strokeStyle = palette.warm;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.anchor.x, this.anchor.y);
      ctx.lineTo(this.projectile.position.x, this.projectile.position.y);
      ctx.stroke();
    }

    // Blocks
    for (const b of this.blocks) {
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      ctx.fillStyle = b._color;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      const verts = b.vertices;
      ctx.beginPath();
      for (let i = 0; i < verts.length; i++) {
        const v = verts[i];
        const lx = v.x - b.position.x;
        const ly = v.y - b.position.y;
        if (i === 0) ctx.moveTo(lx, ly);
        else ctx.lineTo(lx, ly);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Projectile
    if (this.projectile) {
      const p = this.projectile;
      ctx.fillStyle = p._color;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.circleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
