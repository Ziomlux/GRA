// ── Internationalization System ──────────────────────────────
const TRANSLATIONS = {
  pl: {
    // Menu
    gameTitle: 'PORTAL',
    gameSubtitle: 'ADVENTURE',
    tagline: 'Podróżuj przez 6 unikalnych światów',
    startBtn: 'ROZPOCZNIJ PRZYGODĘ',
    continueBtn: 'KONTYNUUJ',
    newGame: 'NOWA GRA',
    loadGame: 'WCZYTAJ GRĘ',
    settings: 'USTAWIENIA',
    quit: 'WYJDŹ',
    // HUD
    map: 'MAPA',
    move: 'Ruch',
    camera: 'Kamera',
    sprint: 'Sprint',
    pause: 'Pauza',
    attack: 'Atak',
    interact: 'Interakcja',
    // Pause
    pauseTitle: 'PAUZA',
    resume: '▶ Wznów',
    mainMenu: '🏠 Menu główne',
    saveGame: '💾 Zapisz grę',
    // Portal
    portalHint: 'Wejdź w portal!',
    portalLocked: 'ZABLOKOWANY',
    // Combat
    hit: '⚔ TRAFIENIE!',
    miss: '✗ PUDŁO',
    cooldown: '⏳',
    died: 'POLEGŁEŚ',
    respawning: 'ODRADZASZ SIĘ...',
    // Stats
    level: 'POZIOM',
    points: 'PUNKTY',
    strength: 'SIŁA (Atak)',
    vitality: 'WIT (Zdrowie)',
    agility: 'ZRE (Szybkość)',
    health: 'ZDROWIE',
    exp: 'EXP',
    statsTab: 'STATYSTYKI',
    itemsTab: 'PRZEDMIOTY',
    emptyBag: 'Twoja torba jest pusta...',
    levelUp: 'AWANS!',
    levelUpMsg: 'Otrzymałeś punkty statystyk',
    // Settings
    settingsTitle: 'USTAWIENIA',
    graphics: 'GRAFIKA',
    audio: 'DŹWIĘK',
    controls: 'STEROWANIE',
    language: 'JĘZYK',
    quality: 'Jakość',
    qualityLow: 'Niska',
    qualityMed: 'Średnia',
    qualityHigh: 'Wysoka',
    qualityUltra: 'Ultra',
    shadows: 'Cienie',
    bloom: 'Bloom',
    particles: 'Cząsteczki',
    fullscreen: 'Pełny ekran',
    fpsCounter: 'Licznik FPS',
    masterVol: 'Głośność główna',
    musicVol: 'Muzyka',
    sfxVol: 'Efekty',
    ambientVol: 'Otoczenie',
    sensitivity: 'Czułość myszy',
    invertY: 'Odwróć oś Y',
    back: '← Wróć',
    apply: 'ZASTOSUJ',
    on: 'WŁ',
    off: 'WYŁ',
    // Save/Load
    saveTitle: 'ZAPISZ GRĘ',
    loadTitle: 'WCZYTAJ GRĘ',
    saveSlot: 'Slot',
    emptySlot: 'Pusty slot',
    autoSave: 'Autozapis',
    saved: 'Zapisano!',
    confirmOverwrite: 'Nadpisać istniejący zapis?',
    confirmLoad: 'Wczytać grę?',
    yes: 'TAK',
    no: 'NIE',
    // Loading
    loading: 'ŁADOWANIE...',
    tips: [
      'Przytrzymaj Shift, aby biegać szybciej.',
      'Szukaj ukrytych sekretów w każdym świecie.',
      'Potwory odradzają się przy każdej wizycie.',
      'Ulepsz statystyki po awansie na nowy poziom.',
      'Portale prowadzą do nowych, niebezpiecznych światów.',
    ],
    // Worlds
    worlds: {
      hub: 'WYSPA HUB',
      ruins: 'RUINY STAROŻYTNE',
      forest: 'LAS MGŁY',
      space: 'STACJA KOSMICZNA',
      ice: 'LODOWA JASKINIA',
      volcano: 'KRÓLESTWO WULKANU',
      nexus: 'NEXUS',
    },
  },

  en: {
    gameTitle: 'PORTAL',
    gameSubtitle: 'ADVENTURE',
    tagline: 'Travel through 6 unique worlds',
    startBtn: 'BEGIN ADVENTURE',
    continueBtn: 'CONTINUE',
    newGame: 'NEW GAME',
    loadGame: 'LOAD GAME',
    settings: 'SETTINGS',
    quit: 'QUIT',
    map: 'MAP',
    move: 'Move',
    camera: 'Camera',
    sprint: 'Sprint',
    pause: 'Pause',
    attack: 'Attack',
    interact: 'Interact',
    pauseTitle: 'PAUSED',
    resume: '▶ Resume',
    mainMenu: '🏠 Main Menu',
    saveGame: '💾 Save Game',
    portalHint: 'Enter the portal!',
    portalLocked: 'LOCKED',
    hit: '⚔ HIT!',
    miss: '✗ MISS',
    cooldown: '⏳',
    died: 'YOU DIED',
    respawning: 'RESPAWNING...',
    level: 'LEVEL',
    points: 'POINTS',
    strength: 'STR (Attack)',
    vitality: 'VIT (Health)',
    agility: 'AGI (Speed)',
    health: 'HEALTH',
    exp: 'EXP',
    statsTab: 'STATS',
    itemsTab: 'ITEMS',
    emptyBag: 'Your bag is empty...',
    levelUp: 'LEVEL UP!',
    levelUpMsg: 'You gained stat points',
    settingsTitle: 'SETTINGS',
    graphics: 'GRAPHICS',
    audio: 'AUDIO',
    controls: 'CONTROLS',
    language: 'LANGUAGE',
    quality: 'Quality',
    qualityLow: 'Low',
    qualityMed: 'Medium',
    qualityHigh: 'High',
    qualityUltra: 'Ultra',
    shadows: 'Shadows',
    bloom: 'Bloom',
    particles: 'Particles',
    fullscreen: 'Fullscreen',
    fpsCounter: 'FPS Counter',
    masterVol: 'Master Volume',
    musicVol: 'Music',
    sfxVol: 'SFX',
    ambientVol: 'Ambient',
    sensitivity: 'Mouse Sensitivity',
    invertY: 'Invert Y Axis',
    back: '← Back',
    apply: 'APPLY',
    on: 'ON',
    off: 'OFF',
    saveTitle: 'SAVE GAME',
    loadTitle: 'LOAD GAME',
    saveSlot: 'Slot',
    emptySlot: 'Empty slot',
    autoSave: 'Autosave',
    saved: 'Saved!',
    confirmOverwrite: 'Overwrite existing save?',
    confirmLoad: 'Load game?',
    yes: 'YES',
    no: 'NO',
    loading: 'LOADING...',
    tips: [
      'Hold Shift to sprint faster.',
      'Search for hidden secrets in each world.',
      'Monsters respawn each time you visit.',
      'Upgrade stats after leveling up.',
      'Portals lead to new, dangerous worlds.',
    ],
    worlds: {
      hub: 'HUB ISLAND',
      ruins: 'ANCIENT RUINS',
      forest: 'MISTY FOREST',
      space: 'SPACE STATION',
      ice: 'ICE CAVE',
      volcano: 'VOLCANO KINGDOM',
      nexus: 'THE NEXUS',
    },
  },
};

class I18n {
  constructor() {
    // Detect system locale
    const sysLang = (navigator.language || 'pl').substring(0, 2);
    this.lang = sysLang === 'en' ? 'en' : 'pl';

    // Override from saved settings
    const saved = localStorage.getItem('pa_language');
    if (saved && TRANSLATIONS[saved]) this.lang = saved;
  }

  t(key) {
    const dict = TRANSLATIONS[this.lang] || TRANSLATIONS.pl;
    return dict[key] !== undefined ? dict[key] : key;
  }

  setLang(lang) {
    if (TRANSLATIONS[lang]) {
      this.lang = lang;
      localStorage.setItem('pa_language', lang);
    }
  }

  get currentLang() { return this.lang; }
  get availableLanguages() { return Object.keys(TRANSLATIONS); }
}

export const i18n = new I18n();
