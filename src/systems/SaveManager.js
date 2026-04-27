// ── Save Manager ─────────────────────────────────────────────
const SAVE_KEY = 'portal_adventure_saves';
const SAVE_VERSION = 1;
const MAX_SLOTS = 3;

export class SaveManager {
  constructor() {
    this.saves = this._loadAll();
  }

  _loadAll() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { slots: [null, null, null], autosave: null };
      const data = JSON.parse(raw);
      if (data.version !== SAVE_VERSION) return { slots: [null, null, null], autosave: null };
      return data;
    } catch {
      return { slots: [null, null, null], autosave: null };
    }
  }

  _persist() {
    this.saves.version = SAVE_VERSION;
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.saves));
  }

  _createSaveData(game) {
    const p = game.player;
    return {
      timestamp: Date.now(),
      dateString: new Date().toLocaleString(),
      worldIndex: game.currentWorldIndex,
      worldName: game.worlds[game.currentWorldIndex]?.name || '???',
      difficultyLoop: game.difficultyLoop,
      player: {
        hp: p.hp,
        maxHp: p.maxHp,
        level: p.level,
        xp: p.xp,
        xpToNextLevel: p.xpToNextLevel,
        kills: p.kills,
        statPoints: p.statPoints,
        strength: p.strength,
        vitality: p.vitality,
        agility: p.agility,
      },
      playTime: game.playTime || 0,
    };
  }

  saveToSlot(slotIndex, game) {
    if (slotIndex < 0 || slotIndex >= MAX_SLOTS) return false;
    this.saves.slots[slotIndex] = this._createSaveData(game);
    this._persist();
    return true;
  }

  autoSave(game) {
    this.saves.autosave = this._createSaveData(game);
    this.saves.autosave.isAutosave = true;
    this._persist();
  }

  loadFromSlot(slotIndex) {
    return this.saves.slots[slotIndex] || null;
  }

  loadAutoSave() {
    return this.saves.autosave || null;
  }

  getSlotInfo(slotIndex) {
    const save = this.saves.slots[slotIndex];
    if (!save) return null;
    return {
      worldName: save.worldName,
      level: save.player.level,
      date: save.dateString,
      playTime: save.playTime,
    };
  }

  getAutoSaveInfo() {
    const save = this.saves.autosave;
    if (!save) return null;
    return {
      worldName: save.worldName,
      level: save.player.level,
      date: save.dateString,
      playTime: save.playTime,
    };
  }

  hasAnySave() {
    return this.saves.autosave !== null || this.saves.slots.some(s => s !== null);
  }

  deleteSlot(slotIndex) {
    this.saves.slots[slotIndex] = null;
    this._persist();
  }

  applyToGame(saveData, game) {
    if (!saveData) return false;
    const p = game.player;
    const pd = saveData.player;
    p.hp = pd.hp;
    p.maxHp = pd.maxHp;
    p.level = pd.level;
    p.xp = pd.xp;
    p.xpToNextLevel = pd.xpToNextLevel;
    p.kills = pd.kills;
    p.statPoints = pd.statPoints;
    p.strength = pd.strength;
    p.vitality = pd.vitality;
    p.agility = pd.agility;
    game.difficultyLoop = saveData.difficultyLoop || 0;
    game.playTime = saveData.playTime || 0;
    game.loadWorld(saveData.worldIndex);
    return true;
  }
}
