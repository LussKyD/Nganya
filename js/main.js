/**
 * Entry point. Boots the game unless we're on file:// (modules are blocked there;
 * the inline guard in index.html shows instructions instead).
 */
import { Game } from './game.js';

if (location.protocol !== 'file:') {
  const game = new Game();
  game.init();
  window.__nganya = game; // handy for debugging from the console
}
