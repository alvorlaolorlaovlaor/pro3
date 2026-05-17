import { Scene } from "../engine/Scene.js";
import { palette, accents } from "../engine/palette.js";
import { playCollision, playBell, playArpeggio } from "../engine/audio.js";

const Matter = window.Matter;

/**
 * Layout (left → right):
 *
 *   ┌──────────┐
 *   │ ball  ▌  │    ← tilted starting shelf with a removable lip
 *   └──────╲───┘
 *           ╲       ← angled ramp
 *            ╲
 *   ━━━━━━━━━━╲━━━━━│ │ │ │ │ │ │ │ ○ ← dominoes then bell
 *                      ground
 *
 * Ball rolls right when the lip is removed → drops onto the ramp →
 * slides down and onto the ground → bowls through the dominoes → last
 * domino taps the bell sensor.
 */
export class RubeGoldberg extends Scene {
  constructor(section) {
    super(section);
    this.resetLocalState();
  }

  resetLocalState() {
    this.ball = null;
    this.bell = null;
    this.lip = null;
    this.dominos = [];
    this.userPieces = [];
    this.statics = [];
    this.confetti = [];
    this.placePreview = null;
    this.completed = false;
  }

  setup() {
    const { w, h } = this.renderer;
    this.engine.gravity.y = 1.6;
    this._setGoButton(false);

    const groundY = h - 50;
    const wallOpts = { isStatic: true, render: { visible: false }, friction: 0.05 };

    // ── Bounds ──────────────────────────────────────────────────────
    this._addStatic(Matter.Bodies.rectangle(w / 2, h + 100, w * 2, 200, { ...wallOpts, friction: 0.6 }));
    this._addStatic(Matter.Bodies.rectangle(-100, h / 2, 200, h * 2, wallOpts));
    this._addStatic(Matter.Bodies.rectangle(w + 100, h / 2, 200, h * 2, wallOpts));

    // ── Ground ──────────────────────────────────────────────────────
    const ground = Matter.Bodies.rectangle(w / 2, groundY + 20, w * 2, 40, { ...wallOpts, friction: 0.4 });
    ground._color = palette.ink;
    this._addStatic(ground);

    // ── Starting shelf ──────────────────────────────────────────────
    // A tilted beam, slightly slanted down-right so the ball rolls
    // once the lip is gone.
    const shelfLeft = { x: w * 0.04, y: h * 0.14 };
    const shelfRight = { x: w * 0.30, y: h * 0.20 };
    const shelf = this._beam(shelfLeft, shelfRight, 10, { friction: 0.03 });
    shelf._color = palette.ink;
    this._addStatic(shelf);

    // Lip — vertical stop on the right end. Removed when "go" is hit.
    this.lip = Matter.Bodies.rectangle(shelfRight.x - 4, shelfRight.y - 18, 8, 26, {
      ...wallOpts,
      friction: 0.6,
    });
    this.lip._color = palette.warm;
    Matter.World.add(this.world, this.lip);
    this.statics.push(this.lip);

    // ── Zig-zag ramps ──────────────────────────────────────────────
    // Three slopes alternating direction so the ball weaves down the
    // viewport instead of sliding a single boring diagonal. Each ramp
    // is intentionally long and overlaps the next in x so the ball
    // always lands on the following beam regardless of exit velocity.
    //
    //   shelf ─┐
    //           \\______  ramp A (down-right, ends far right)
    //                  ╲
    //          ________╱  ramp B (down-left, starts far right)
    //         ╱
    //   ____╱             ramp C (down-right) ─→ dominoes ─→ bell
    const rampA = [
      { x: w * 0.16, y: h * 0.28 },
      { x: w * 0.82, y: h * 0.42 },
    ];
    const rampB = [
      { x: w * 0.92, y: h * 0.50 },
      { x: w * 0.10, y: h * 0.66 },
    ];
    const rampC = [
      { x: -w * 0.04, y: h * 0.74 },
      { x: w * 0.44, y: groundY - 4 },
    ];
    for (const [a, b] of [rampA, rampB, rampC]) {
      const beam = this._beam(a, b, 10, { friction: 0.015 });
      beam._color = palette.ink;
      this._addStatic(beam);
    }

    // Decorative pegs along the zig-zag — pure visual flair, placed
    // so they sit clear of the ball's actual path.
    const peg = (x, y, color) => {
      const p = Matter.Bodies.circle(x, y, 5, { ...wallOpts });
      p._color = color;
      this._addStatic(p);
    };
    peg(w * 0.45, h * 0.55, palette.cool);
    peg(w * 0.55, h * 0.72, palette.sun);
    peg(w * 0.30, h * 0.45, palette.warm);

    // ── Dominoes ────────────────────────────────────────────────────
    // Fixed-spacing layout so the cascade reliably propagates regardless
    // of viewport width — spacing must stay below domino height (60).
    const domH = 60;
    const domW = 10;
    const spacing = 45;
    const firstX = w * 0.48;
    const desiredLastX = w * 0.86;
    const domCount = Math.max(5, Math.floor((desiredLastX - firstX) / spacing) + 1);
    for (let i = 0; i < domCount; i++) {
      const x = firstX + i * spacing;
      const dom = Matter.Bodies.rectangle(x, groundY - domH / 2, domW, domH, {
        density: 0.0015,
        friction: 0.5,
        frictionStatic: 0.6,
        restitution: 0.02,
        slop: 0.01,
      });
      dom._color = accents[i % accents.length];
      this.dominos.push(dom);
    }
    Matter.World.add(this.world, this.dominos);

    // ── Bell ────────────────────────────────────────────────────────
    const lastDomX = firstX + (domCount - 1) * spacing;
    const bellX = Math.min(w - 50, lastDomX + 70);
    const bellY = groundY - 28;
    this.bell = Matter.Bodies.circle(bellX, bellY, 28, {
      isStatic: true,
      isSensor: true,
      render: { visible: false },
    });
    Matter.World.add(this.world, this.bell);

    // ── Ball ────────────────────────────────────────────────────────
    const ballR = 14;
    this.ball = Matter.Bodies.circle(shelfLeft.x + w * 0.05, shelfLeft.y - ballR - 4, ballR, {
      density: 0.005,
      restitution: 0.2,
      friction: 0.02,
      frictionAir: 0.001,
    });
    this.ball._color = palette.warm;
    Matter.World.add(this.world, this.ball);

    // ── Events ──────────────────────────────────────────────────────
    Matter.Events.on(this.engine, "collisionStart", (evt) => {
      for (const pair of evt.pairs) {
        if ((pair.bodyA === this.bell || pair.bodyB === this.bell) && !this.completed) {
          this._onBell();
        }
        const v = Math.hypot(
          pair.bodyA.velocity.x - pair.bodyB.velocity.x,
          pair.bodyA.velocity.y - pair.bodyB.velocity.y
        );
        if (v > 1.5) playCollision(Math.min(1, v / 10));
      }
    });

    if (!this._handlers) this._bindPlacement();
  }

  // ── Helpers ───────────────────────────────────────────────────────
  _addStatic(body) {
    Matter.World.add(this.world, body);
    this.statics.push(body);
  }

  /**
   * Create a static rectangular "beam" between two points with the
   * given thickness. The body's angle is set so it spans (a → b).
   */
  _beam(a, b, thickness, opts = {}) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const angle = Math.atan2(dy, dx);
    return Matter.Bodies.rectangle(cx, cy, len, thickness, {
      isStatic: true,
      angle,
      render: { visible: false },
      ...opts,
    });
  }

  _bindPlacement() {
    // Click on empty space to add a small extra peg.
    const place = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      const x = p.clientX - rect.left;
      const y = p.clientY - rect.top;
      // Don't place over the ball or the bell — easy to accidentally trap them.
      if (this.ball && Math.hypot(x - this.ball.position.x, y - this.ball.position.y) < 36) return;
      if (this.bell && Math.hypot(x - this.bell.position.x, y - this.bell.position.y) < 40) return;
      const piece = Matter.Bodies.rectangle(x, y, 8, 36, {
        density: 0.001,
        friction: 0.5,
        frictionStatic: 0.6,
        restitution: 0.05,
      });
      piece._color = palette.cool;
      this.userPieces.push(piece);
      Matter.World.add(this.world, piece);
    };
    const move = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      this.placePreview = { x: p.clientX - rect.left, y: p.clientY - rect.top };
    };
    const leave = () => { this.placePreview = null; };
    this.canvas.addEventListener("click", place);
    this.canvas.addEventListener("pointermove", move);
    this.canvas.addEventListener("pointerleave", leave);
    this._handlers = { place, move, leave };
  }

  _setGoButton(spent) {
    const go = this.section.querySelector("[data-go]");
    if (!go) return;
    go.classList.toggle("is-spent", spent);
    if (!go._bound) {
      go.addEventListener("click", () => this._release());
      go._bound = true;
    }
  }

  _release() {
    if (!this.lip) return;
    Matter.World.remove(this.world, this.lip);
    this.statics = this.statics.filter((b) => b !== this.lip);
    this.lip = null;
    this._setGoButton(true);
  }

  _onBell() {
    this.completed = true;
    playBell();
    playArpeggio();
    this._spawnConfetti();
  }

  _spawnConfetti() {
    const bx = this.bell.position.x;
    const by = this.bell.position.y;
    for (let i = 0; i < 80; i++) {
      this.confetti.push({
        x: bx,
        y: by,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 10 - 3,
        color: accents[i % accents.length],
        life: 1,
        size: 3 + Math.random() * 3,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  _updateConfetti() {
    for (const c of this.confetti) {
      c.vy += 0.25;
      c.x += c.vx;
      c.y += c.vy;
      c.rot += c.spin;
      c.life -= 0.012;
    }
    this.confetti = this.confetti.filter((c) => c.life > 0);
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

    const drawPoly = (b, fill, stroke = palette.ink, lw = 1.5) => {
      ctx.save();
      ctx.fillStyle = fill;
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lw;
      }
      const verts = b.vertices;
      ctx.beginPath();
      for (let i = 0; i < verts.length; i++) {
        if (i === 0) ctx.moveTo(verts[i].x, verts[i].y);
        else ctx.lineTo(verts[i].x, verts[i].y);
      }
      ctx.closePath();
      ctx.fill();
      if (stroke) ctx.stroke();
      ctx.restore();
    };

    // Statics (shelf, ramp, ground, lip)
    for (const s of this.statics) {
      if (!s._color) continue;
      drawPoly(s, s._color, null);
    }

    // Dominos + user pieces
    for (const d of this.dominos) drawPoly(d, d._color);
    for (const p of this.userPieces) drawPoly(p, p._color);

    // Bell
    if (this.bell) {
      ctx.fillStyle = this.completed ? palette.sun : palette.paper;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.bell.position.x, this.bell.position.y, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = palette.ink;
      ctx.beginPath();
      ctx.arc(this.bell.position.x, this.bell.position.y + 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ball
    if (this.ball) {
      ctx.fillStyle = this.ball._color;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.ball.position.x, this.ball.position.y, this.ball.circleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Placement preview
    if (this.placePreview && !this.completed) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = palette.cool;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1;
      ctx.fillRect(this.placePreview.x - 4, this.placePreview.y - 18, 8, 36);
      ctx.strokeRect(this.placePreview.x - 4, this.placePreview.y - 18, 8, 36);
      ctx.restore();
    }

    // Confetti
    this._updateConfetti();
    for (const c of this.confetti) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, c.life);
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 1.6);
      ctx.restore();
    }
  }
}
