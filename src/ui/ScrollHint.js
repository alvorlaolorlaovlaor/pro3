/**
 * Shows the scroll hint until the user has scrolled meaningfully.
 */
export function attachScrollHint(el) {
  let shown = false;
  let hidden = false;

  function update() {
    if (hidden) return;
    if (window.scrollY > window.innerHeight * 0.4) {
      el.classList.remove("is-visible");
      hidden = true;
      window.removeEventListener("scroll", update);
      return;
    }
    if (!shown) {
      el.classList.add("is-visible");
      shown = true;
    }
  }

  // Reveal after a beat so it doesn't fight the loader.
  setTimeout(update, 800);
  window.addEventListener("scroll", update, { passive: true });
}
