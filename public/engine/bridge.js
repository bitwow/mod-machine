import { ChiptuneJsPlayer } from './chiptune3.js';

window.ChiptuneJsPlayer = ChiptuneJsPlayer;
// Resolved here so it follows the engine folder wherever the build puts it.
window.modPatternWorkerUrl = new URL('./patterns.worker.js', import.meta.url).href;
window.dispatchEvent(new Event('mod-engine-ready'));
