export function initTitleView(app) {
  const difficultyPanel = document.getElementById('cpu-difficulty-panel');

  document.getElementById('btn-mode-cpu').addEventListener('click', () => {
    difficultyPanel.classList.remove('hidden');
  });

  document.getElementById('btn-mode-online').addEventListener('click', () => {
    difficultyPanel.classList.add('hidden');
    app.showView('lobby');
  });

  document.getElementById('btn-cpu-back').addEventListener('click', () => {
    difficultyPanel.classList.add('hidden');
  });

  difficultyPanel.querySelectorAll('button[data-difficulty]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const difficulty = btn.dataset.difficulty;
      difficultyPanel.classList.add('hidden');
      app.startCpuGame(difficulty);
    });
  });
}
