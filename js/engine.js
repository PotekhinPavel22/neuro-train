const E = {
  game:       null,
  difficulty: 'easy',
  score:      0,
  moves:      0,
  startedAt:  null,
  timerID:    null,
  running:    false,
};

function setScore(n) {
  E.score = n;
  const el = document.getElementById('h-score');
  if (el) el.textContent = n;
}
function addScore(n) { setScore(E.score + n); }
function setMoves(n) {
  E.moves = n;
  const el = document.getElementById('h-moves');
  if (el) el.textContent = n;
}
function addMove() { setMoves(E.moves + 1); }

function startTimer() {
  E.startedAt = Date.now();
  E.running   = true;
  clearInterval(E.timerID);
  E.timerID = setInterval(_tickTimer, 500);
}
function stopTimer() {
  clearInterval(E.timerID);
  E.running = false;
}
function _tickTimer() {
  const el = document.getElementById('h-time');
  if (!el) return;
  const s = Math.floor((Date.now() - E.startedAt) / 1000);
  const m = Math.floor(s / 60);
  el.textContent = `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}
function getElapsed() {
  return E.startedAt ? Math.floor((Date.now() - E.startedAt) / 1000) : 0;
}

function resetEngine(game) {
  stopTimer();
  E.game  = game;
  E.score = 0; E.moves = 0; E.startedAt = null;
  const hs = document.getElementById('h-score');
  const hm = document.getElementById('h-moves');
  const ht = document.getElementById('h-time');
  if (hs) hs.textContent = '0';
  if (hm) hm.textContent = '0';
  if (ht) ht.textContent = '00:00';
}

function setDiff(d, btn) {
  E.difficulty = d;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  startGame();
}

async function gameOver(extraData = {}) {
  stopTimer();
  const duration = getElapsed();

  document.getElementById('goScore').textContent = E.score;
  document.getElementById('goEmoji').textContent = E.score >= 700 ? '🏆' : E.score >= 400 ? '🎯' : '💪';
  document.getElementById('goTitle').textContent = E.score >= 700 ? 'Отличный результат!' : E.score >= 400 ? 'Хорошая работа!' : 'Игра окончена';
  document.getElementById('goDetails').textContent =
    `Ходы: ${E.moves} · Время: ${duration}с · Сложность: ${E.difficulty}`;
  document.getElementById('goModal').classList.add('open');

  if (G.user) {
    await API.saveScore({
      game:       E.game,
      score:      E.score,
      moves:      E.moves,
      duration,
      difficulty: E.difficulty,
    });
    await checkAchs(E.game, E.score, E.moves, extraData);
  }
}

function closeModal() {
  document.getElementById('goModal').classList.remove('open');
}

const GAME_STARTERS = {};

function startGame() {
  closeModal();
  const fn = GAME_STARTERS[E.game];
  if (fn) fn();
}

function openGame(game) {
  E.game = game;
  const names = { memory:'Memory Game', color:'Color Reaction', word:'Word Association', numeric:'Numeric Sequence', puzzle:'Puzzle Solver' };
  const gtag = document.getElementById('gtag');
  if (gtag) gtag.textContent = names[game] || game;
  nav('game');
  startGame();
}
