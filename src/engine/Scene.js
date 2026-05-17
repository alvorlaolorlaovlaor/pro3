import { Renderer } from "./Renderer.js";

const Matter = window.Matter;

/**
 * Base class for every scene. Owns its own Matter Engine and Runner so
 * scenes can be paused/resumed independently. Subclasses override
 * `setup()` to populate the world and `draw()` to paint each frame.
 *
 * Lifecycle:
 *   constructor → setup() (deferred until first enter())
 *   enter()  starts the runner + raf loop
 *   exit()   stops the runner + raf loop
 *   reset()  destroys bodies and re-runs setup()
 *   destroy() one-time teardown
 */
export class Scene {
  constructor(section) {
    this.section = section;
    this.canvas = section.querySelector("[data-canvas]");
    this.renderer = new Renderer(this.canvas);
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 },
    });
    this.world = this.engine.world;
    this.runner = Matter.Runner.create();
    this.active = false;
    this.initialized = false;
    this._raf = 0;
    this._loop = this._loop.bind(this);

    const resetBtn = section.querySelector("[data-reset]");
    if (resetBtn) resetBtn.addEventListener("click", () => this.reset());
  }

  // Subclasses implement these:
  setup() {}                  // build the world; called once per init
  draw() {}
  onResize() {}
  onEnter() {}
  onExit() {}
  resetLocalState() {}        // clear arrays/flags before a fresh setup()

  _ensureInitialized() {
    if (this.initialized) return;
    this.setup();
    this.initialized = true;
  }

  enter() {
    if (this.active) return;
    this._ensureInitialized();
    this.active = true;
    Matter.Runner.run(this.runner, this.engine);
    this.onEnter();
    this._raf = requestAnimationFrame(this._loop);
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    Matter.Runner.stop(this.runner);
    cancelAnimationFrame(this._raf);
    this.onExit();
  }

  reset() {
    Matter.Events.off(this.engine);
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);
    this.resetLocalState();
    this.initialized = false;
    this._ensureInitialized();
  }

  resize() {
    this.renderer.resize();
    this.onResize();
    // Paint a frame so background fills correctly even when not running.
    this.draw();
  }

  _loop() {
    if (!this.active) return;
    this.draw();
    this._raf = requestAnimationFrame(this._loop);
  }

  destroy() {
    this.exit();
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);
  }
}
