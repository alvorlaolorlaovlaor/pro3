/**
 * Pointer normalization. Returns CSS-pixel coordinates relative to the
 * canvas element. Works for mouse, touch, and pen.
 */
export function getPointer(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const point = evt.touches ? evt.touches[0] : evt;
  return {
    x: point.clientX - rect.left,
    y: point.clientY - rect.top,
  };
}

/**
 * Build a Matter.MouseConstraint bound to a specific canvas. Also strips
 * Matter's default wheel + touch listeners and replaces the touch ones
 * with conditional versions that only swallow the gesture when the touch
 * actually lands on a draggable body — touches on empty canvas pass
 * through so the page can still scroll on mobile.
 */
export function createMouseConstraint(Matter, canvas, engine) {
  const mouse = Matter.Mouse.create(canvas);

  // Our Renderer sets canvas.width = cssWidth * devicePixelRatio so high-DPI
  // screens stay crisp, but the world is in CSS pixels. Matter's default
  // coordinate math returns backing-store pixels — on retina that's 2× off,
  // which silently makes dragging miss every body. Patching pixelRatio
  // tells Matter to scale results back to CSS pixels.
  if (canvas.clientWidth > 0 && canvas.width > 0) {
    mouse.pixelRatio = canvas.clientWidth / canvas.width;
  }

  // Remove the default wheel handler so the page can still scroll.
  if (mouse.element && mouse.mousewheel) {
    mouse.element.removeEventListener("wheel", mouse.mousewheel);
    mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);
  }

  // Replace Matter's default touch listeners — they call preventDefault()
  // on every touchmove which blocks page scrolling on mobile.
  if (mouse.element && mouse.mousedown) {
    mouse.element.removeEventListener("touchstart", mouse.mousedown);
    mouse.element.removeEventListener("touchmove", mouse.mousemove);
    mouse.element.removeEventListener("touchend", mouse.mouseup);
  }
  installConditionalTouch(mouse, canvas, engine);

  const constraint = Matter.MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.2, render: { visible: false } },
  });
  return { mouse, constraint };
}

/**
 * Hand-rolled touch handlers that hit-test against the world on
 * touchstart. If the touch landed on a non-static body, we capture the
 * gesture (preventDefault, feed it into Matter); otherwise we let the
 * browser do its normal scroll/zoom thing.
 */
function installConditionalTouch(mouse, canvas, engine) {
  const Matter = window.Matter;
  let captured = false;

  const updateFromTouch = (evt) => {
    const point = evt.changedTouches?.[0] || evt.touches?.[0];
    if (!point) return;
    // CSS pixels — this matches the world coordinate system the scenes
    // were built in (see DPR note in createMouseConstraint).
    const rect = canvas.getBoundingClientRect();
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;
    mouse.absolute.x = x;
    mouse.absolute.y = y;
    mouse.position.x = x * mouse.scale.x + mouse.offset.x;
    mouse.position.y = y * mouse.scale.y + mouse.offset.y;
  };

  const hitTest = () => {
    const bodies = Matter.Composite.allBodies(engine.world);
    for (const b of bodies) {
      if (b.isStatic || b.isSensor) continue;
      if (
        Matter.Bounds.contains(b.bounds, mouse.position) &&
        Matter.Vertices.contains(b.vertices, mouse.position)
      ) return true;
    }
    return false;
  };

  canvas.addEventListener("touchstart", (evt) => {
    updateFromTouch(evt);
    if (hitTest()) {
      captured = true;
      mouse.button = 0;
      mouse.sourceEvents.mousedown = evt;
      evt.preventDefault();
    } else {
      captured = false;
      mouse.button = -1;
    }
  }, { passive: false });

  canvas.addEventListener("touchmove", (evt) => {
    if (!captured) return;
    evt.preventDefault();
    updateFromTouch(evt);
    mouse.sourceEvents.mousemove = evt;
  }, { passive: false });

  const endTouch = (evt) => {
    if (!captured) return;
    // Suppress the synthetic mousedown/click that browsers fire after a
    // captured touch — otherwise Matter would re-process the gesture.
    evt.preventDefault();
    updateFromTouch(evt);
    mouse.button = -1;
    mouse.sourceEvents.mouseup = evt;
    captured = false;
  };
  canvas.addEventListener("touchend", endTouch, { passive: false });
  canvas.addEventListener("touchcancel", endTouch, { passive: false });
}
