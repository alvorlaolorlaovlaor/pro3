import { setMuted, isMuted } from "../engine/audio.js";

export function attachMuteToggle(button) {
  const onLabel = button.querySelector("[data-mute-on]");
  const offLabel = button.querySelector("[data-mute-off]");

  function paint() {
    const muted = isMuted();
    onLabel.hidden = muted;
    offLabel.hidden = !muted;
  }
  paint();

  button.addEventListener("click", () => {
    setMuted(!isMuted());
    paint();
  });
}
