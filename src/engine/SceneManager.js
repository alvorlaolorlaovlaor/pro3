/**
 * Walks the registered scenes and activates whichever <section> is most
 * visible. Uses IntersectionObserver thresholds plus a tie-break on
 * "ratio closest to 1.0" so partial-overlap moments don't thrash.
 */
export class SceneManager {
  constructor(scenes) {
    this.scenes = scenes; // [{ id, scene }, ...]
    this.byId = new Map(scenes.map((s) => [s.id, s]));
    this.current = null;
    this.ratios = new Map();

    this._onResize = this._onResize.bind(this);
    window.addEventListener("resize", this._onResize);

    this._observer = new IntersectionObserver(
      (entries) => this._handleEntries(entries),
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    scenes.forEach(({ scene }) => {
      this._observer.observe(scene.section);
      this.ratios.set(scene.section, 0);
    });
  }

  _handleEntries(entries) {
    entries.forEach((e) => this.ratios.set(e.target, e.intersectionRatio));
    let best = null;
    let bestRatio = 0;
    this.scenes.forEach(({ scene }) => {
      const r = this.ratios.get(scene.section) ?? 0;
      if (r > bestRatio) {
        bestRatio = r;
        best = scene;
      }
    });
    if (best && bestRatio > 0.4 && best !== this.current) {
      this._activate(best);
    }
  }

  _activate(next) {
    if (this.current) {
      this.current.exit();
      this.current.section.classList.remove("is-active");
    }
    next.enter();
    next.section.classList.add("is-active");
    this.current = next;
  }

  _onResize() {
    this.scenes.forEach(({ scene }) => scene.resize());
  }

  forEach(fn) {
    this.scenes.forEach(({ scene }) => fn(scene));
  }
}
