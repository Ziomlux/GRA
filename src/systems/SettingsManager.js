// ── Settings Manager ─────────────────────────────────────────
const SETTINGS_KEY = 'portal_adventure_settings';

const DEFAULTS = {
  // Graphics
  quality: 'high',       // low, medium, high, ultra
  shadows: true,
  bloom: true,
  particles: true,
  fullscreen: false,
  fpsCounter: false,
  pixelRatio: 0,         // 0 = auto

  // Audio
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  ambientVolume: 0.7,

  // Controls
  sensitivity: 1.0,
  invertY: false,

  // Language
  language: 'auto',
};

const QUALITY_PRESETS = {
  low: {
    shadowMapSize: 512,
    maxParticles: 0.3,
    bloomEnabled: false,
    pixelRatio: 0.75,
  },
  medium: {
    shadowMapSize: 1024,
    maxParticles: 0.6,
    bloomEnabled: true,
    pixelRatio: 1,
  },
  high: {
    shadowMapSize: 2048,
    maxParticles: 1.0,
    bloomEnabled: true,
    pixelRatio: 0, // auto
  },
  ultra: {
    shadowMapSize: 4096,
    maxParticles: 1.0,
    bloomEnabled: true,
    pixelRatio: 0,
  },
};

export class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULTS };
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        Object.assign(this.settings, saved);
      }
    } catch { /* use defaults */ }
  }

  save() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
  }

  get(key) {
    return this.settings[key] !== undefined ? this.settings[key] : DEFAULTS[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.save();
  }

  getQualityPreset() {
    return QUALITY_PRESETS[this.settings.quality] || QUALITY_PRESETS.high;
  }

  applyToRenderer(renderer, postProcessing) {
    const preset = this.getQualityPreset();

    // Pixel ratio
    const pr = this.settings.pixelRatio || preset.pixelRatio;
    renderer.setPixelRatio(pr > 0 ? pr : Math.min(window.devicePixelRatio, 2));

    // Shadows
    renderer.shadowMap.enabled = this.settings.shadows;

    // Bloom
    if (postProcessing) {
      postProcessing.setEnabled(this.settings.bloom && preset.bloomEnabled);
    }

    // Fullscreen
    if (this.settings.fullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }

  getAll() {
    return { ...this.settings };
  }

  reset() {
    this.settings = { ...DEFAULTS };
    this.save();
  }
}
