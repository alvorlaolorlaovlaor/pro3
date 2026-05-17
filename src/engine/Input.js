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
 * Build a Matter.MouseConstraint bound to a specific canvas. Matter's
 * own Mouse helper expects a single element, but the wheel listener it
 * attaches blocks page scrolling — we strip it.
 */
export function createMouseConstraint(Matter, canvas, engine) {
  const mouse = Matter.Mouse.create(canvas);
  // Remove the default wheel handler so the page can still scroll.
  if (mouse.element && mouse.mousewheel) {
    mouse.element.removeEventListener("wheel", mouse.mousewheel);
    mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);
  }
  const constraint = Matter.MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.2, render: { visible: false } },
  });
  return { mouse, constraint };
}
