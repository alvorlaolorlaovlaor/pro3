import { Scene } from "../engine/Scene.js";
import { palette, accents } from "../engine/palette.js";
import { playCollision, playBell, playArpeggio } from "../engine/audio.js";

const Matter = window.Matter;

export class RubeGoldberg extends Scene {
  constructor(section) {
    super(section);
    this.ball = null;
    this.dominos = [];
    this.userPieces = [];
    this.platforms = [];
    this.completed = false;
    this.confetti = [];
    this._handlers = null;
    this.placePreview = null;
  }

  setup() {
    const { w, h } = this.renderer;
    this.engine.gravity.y = 1;
    this.completed = false;
    this._setGoButton(false);

    // Static layout: a chute on the left, a ramp in the middle, a bell on the right.
    const wallOpts = { isStatic: true, render: { visible: false }, friction: 0.4 };

    // Outer bounds
    Matter.World.add(this.world, [
      Matter.Bodies.rectangle(w / 2, h + 100, w * 2, 200, wallOpts),
      Matter.Bodies.rectangle(-100, h / 2, 200, h * 2, wallOpts),
      Matter.Bodies.rectangle(w + 100, h / 2, 200, h * 2, wallOpts),
    ]);

    // Starting shelf (top-left), holds the ball.
    const shelfY = h * 0.18;
    const shelfW = w * 0.32;
    const shelf = Matter.Bodies.rectangle(shelfW / 2 + 20, shelfY, shelfW, 10, wallOpts);
    shelf._color = palette.ink;
    this.platforms.push(shelf);

    // Lip on the right end of the shelf — removed when "go" is pressed.
    const lipX = shelfW + 18;
    this.lip = Matter.Bodies.rectangle(lipX, shelfY - 12, 6, 18, wallOpts);
    this.lip._color = palette.warm;
    this.platforms.push(this.lip);

    // Diagonal ramp under the shelf, sloping down to the right.
    const ramp = Matter.Bodies.rectangle(w * 0.5, h * 0.45, w * 0.55, 10, {
      ...wallOpts,
      angle: 0.22,
    });
    ramp._color = palette.ink;
    this.platforms.push(ramp);

    // Catch shelf — left side bumper that redirects to the domino row.
    const catchShelf = Matter.Bodies.rectangle(w * 0.5, h * 0.72, w * 0.7, 10, {
      ...wallOpts,
      angle: -0.05,
    });
    catchShelf._color = palette.ink;
    this.platforms.push(catchShelf);

    Matter.World.add(this.world, this.platforms);

    // Pre-placed dominos along the catch shelf.
    const domCount = 10;
    const domStartX = w * 0.25;
    const domEndX = w * 0.82;
    for (let i = 0; i < domCount; i++) {
      const t = i / (domCount - 1);
      const x = domStartX + (domEndX - domStartX) * t;
      const y = h * 0.72 - 30 + t * (h * 0.7 - h * 0.72) - 6;
      const dom = Matter.Bodies.rectangle(x, y, 10, 50, {
        density: 0.002,
        friction: 0.5,
        restitution: 0.05,
      });
      dom._color = accents[i % accents.length];
      this.dominos.push(dom);
    }
    Matter.World.add(this.world, this.dominos);

    // The bell — a sensor body at the far right.
    const bellX = w * 0.88;
    const bellY = h * 0.72 - 60;
    this.bell = Matter.Bodies.circle(bellX, bellY, 24, {
      isStatic: true,
      isSensor: true,
      render: { visible: false },
    });
    this.bell._color = palette.sun;
    Matter.World.add(this.world, this.bell);

    // The ball — sits on the starting shelf.
    this.ball = Matter.Bodies.circle(shelfW * 0.55, shelfY - 18, 16, {
      density: 0.004,
      restitution: 0.4,
      friction: 0.3,
    });
    this.ball._color = palette.warm;
    Matter.World.add(this.world, this.ball);

    // Collision sounds + bell trigger.
    Matter.Events.on(this.engine, "collisionStart", (evt) => {
      for (const pair of evt.pairs) {
        if ((pair.bodyA === this.bell || pair.bodyB === this.bell) && !this.completed) {
          this._onBell();
        }
        const v = Math.hypot(
          pair.bodyA.velocity.x - pair.bodyB.velocity.x,
          pair.bodyA.velocity.y - pair.bodyB.velocity.y
        );
        if (v > 2) playCollision(Math.min(1, v / 12));
      }
    });

    if (!this._handlers) this._bindPlacement();
  }

  _bindPlacement() {
    // Click on empty space to place a small extra domino/peg.
    const place = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      const x = p.clientX - rect.left;
      const y = p.clientY - rect.top;
      // Don't place if user clicked near the ball or bell.
      if (Math.hypot(x - this.ball.position.x, y - this.ball.position.y) < 30) return;
      if (Math.hypot(x - this.bell.position.x, y - this.bell.position.y) < 30) return;
      const piece = Matter.Bodies.rectangle(x, y, 8, 36, {
        density: 0.002,
        friction: 0.4,
        restitution: 0.1,
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
    this.platforms = this.platforms.filter((p) => p !== this.lip);
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
    const { w, h } = this.renderer;
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

  reset() {
    this.dominos = [];
    this.userPieces = [];
    this.platforms = [];
    this.confetti = [];
    this.placePreview = null;
    super.reset();
  }

  onResize() {
    Matter.Events.off(this.engine);
    this.dominos = [];
    this.userPieces = [];
    this.platforms = [];
    this.confetti = [];
    Matter.World.clear(this.world, false);
    this.setup();
  }

  draw() {
    const { ctx, w, h } = this.renderer;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, w, h);

    // Platforms
    for (const p of this.platforms) {
      ctx.save();
      ctx.translate(p.position.x, p.position.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p._color || palette.ink;
      const verts = p.vertices;
      ctx.beginPath();
      for (let i = 0; i < verts.length; i++) {
        const lx = verts[i].x - p.position.x;
        const ly = verts[i].y - p.position.y;
        if (i === 0) ctx.moveTo(lx, ly);
        else ctx.lineTo(lx, ly);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Dominos + user pieces (same draw routine)
    const drawRect = (b) => {
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      ctx.fillStyle = b._color;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      const verts = b.vertices;
      ctx.beginPath();
      for (let i = 0; i < verts.length; i++) {
        const lx = verts[i].x - b.position.x;
        const ly = verts[i].y - b.position.y;
        if (i === 0) ctx.moveTo(lx, ly);
        else ctx.lineTo(lx, ly);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    this.dominos.forEach(drawRect);
    this.userPieces.forEach(drawRect);

    // Bell
    if (this.bell) {
      ctx.fillStyle = this.completed ? palette.sun : palette.paper;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.bell.position.x, this.bell.position.y, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // tongue
      ctx.fillStyle = palette.ink;
      ctx.beginPath();
      ctx.arc(this.bell.position.x, this.bell.position.y + 6, 4, 0, Math.PI * 2);
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
