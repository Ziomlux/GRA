import { Game } from './Game.js';

const game = new Game();

document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud').classList.remove('hidden');
  game.start();
});

document.getElementById('resume-btn').addEventListener('click', () => {
  game.resume();
});

document.getElementById('menu-btn').addEventListener('click', () => {
  location.reload();
});
