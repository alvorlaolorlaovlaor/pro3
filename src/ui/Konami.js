/**
 * Konami code easter egg. Calls `onTrigger` when the sequence is typed.
 */
const SEQUENCE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

export function attachKonami(onTrigger) {
  let i = 0;
  window.addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === SEQUENCE[i]) {
      i++;
      if (i === SEQUENCE.length) {
        i = 0;
        onTrigger();
      }
    } else {
      i = key === SEQUENCE[0] ? 1 : 0;
    }
  });
}
