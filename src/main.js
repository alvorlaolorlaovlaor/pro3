import { SceneManager } from "./engine/SceneManager.js";
import { unlock } from "./engine/audio.js";
import { TitleDrop } from "./scenes/TitleDrop.js";
import { PendulumOrchestra } from "./scenes/PendulumOrchestra.js";
import { Slingshot } from "./scenes/Slingshot.js";
import { RubeGoldberg } from "./scenes/RubeGoldberg.js";
import { startLoader } from "./ui/Loader.js";
import { attachScrollHint } from "./ui/ScrollHint.js";
import { attachMuteToggle } from "./ui/MuteToggle.js";
import { attachKonami } from "./ui/Konami.js";

function bootScenes() {
  const sections = {
    title: document.querySelector('[data-scene="title"]'),
    pendulum: document.querySelector('[data-scene="pendulum"]'),
    slingshot: document.querySelector('[data-scene="slingshot"]'),
    goldberg: document.querySelector('[data-scene="goldberg"]'),
  };

  const scenes = [
    { id: "title", scene: new TitleDrop(sections.title) },
    { id: "pendulum", scene: new PendulumOrchestra(sections.pendulum) },
    { id: "slingshot", scene: new Slingshot(sections.slingshot) },
    { id: "goldberg", scene: new RubeGoldberg(sections.goldberg) },
  ];

  const manager = new SceneManager(scenes);

  // First scene activates immediately on load.
  manager._activate(scenes[0].scene);

  attachMuteToggle(document.querySelector("[data-mute]"));
  attachScrollHint(document.querySelector("[data-scrollhint]"));
  attachKonami(() => {
    const Matter = window.Matter;
    manager.forEach((s) => {
      s.engine.gravity.y *= -1;
    });
    setTimeout(() => {
      manager.forEach((s) => {
        s.engine.gravity.y *= -1;
      });
    }, 5000);
  });

  // Audio unlock on first user gesture anywhere.
  const armAudio = () => {
    unlock();
    window.removeEventListener("pointerdown", armAudio);
    window.removeEventListener("keydown", armAudio);
    window.removeEventListener("touchstart", armAudio);
  };
  window.addEventListener("pointerdown", armAudio, { once: true });
  window.addEventListener("keydown", armAudio, { once: true });
  window.addEventListener("touchstart", armAudio, { once: true, passive: true });

  return manager;
}

function boot() {
  const loader = document.getElementById("loader");
  startLoader(loader, () => {
    unlock();
  });

  // Scenes can mount immediately — loader is purely visual.
  bootScenes();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
