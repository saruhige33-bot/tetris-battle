let retryHandler = null;

export function initResultView(app) {
  document.getElementById('btn-result-retry').addEventListener('click', () => {
    if (retryHandler) retryHandler();
  });
  document.getElementById('btn-result-title').addEventListener('click', () => {
    app.showView('title');
  });
}

export function showResult(app, { won, selfScore, opponentScore, retryFn, retryLabel }) {
  document.getElementById('result-title').textContent = won ? 'YOU WIN' : 'YOU LOSE';
  document.getElementById('result-score').textContent =
    `あなたのスコア: ${selfScore}　相手のスコア: ${opponentScore}`;
  document.getElementById('btn-result-retry').textContent = retryLabel || 'もう一度';
  retryHandler = retryFn;
  app.showView('result');
}
