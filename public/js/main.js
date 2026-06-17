import { initTitleView } from './views/titleView.js';
import { initLobbyView } from './views/lobbyView.js';
import { initGameView, startCpuGame, startOnlineGame, stopGame } from './views/gameView.js';
import { initResultView } from './views/resultView.js';

const views = {
  title: document.getElementById('view-title'),
  lobby: document.getElementById('view-lobby'),
  game: document.getElementById('view-game'),
  result: document.getElementById('view-result'),
};

function showView(name) {
  for (const key of Object.keys(views)) {
    views[key].classList.toggle('active', key === name);
  }
  if (name !== 'game') {
    stopGame();
  }
}

const app = {
  showView,
  startCpuGame,
  startOnlineGame,
};

initTitleView(app);
initLobbyView(app);
initGameView(app);
initResultView(app);

showView('title');
