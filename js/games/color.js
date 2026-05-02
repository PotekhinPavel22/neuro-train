(function() {
  const DIFF = {
    easy:   { lives: 5, window: 1200, rounds: 20 },
    medium: { lives: 3, window: 900,  rounds: 25 },
    hard:   { lives: 1, window: 600,  rounds: 30 },
  };

  let _target, _current, _lives, _round, _total, _window, _roundTimer, _answered;

  function init() {
    if (E.game !== 'color') return;
    resetEngine('color');

    const cfg = DIFF[E.difficulty] || DIFF.easy;
    _lives  = cfg.lives;
    _total  = cfg.rounds;
    _window = cfg.window;
    _round  = 0;
    _answered = false;

    const gc = document.getElementById('gc');
    gc.innerHTML = `
      <div class="color-game">
        <div class="color-target">
          Нажми на кнопку цвета:
          <div class="color-target-name" id="ct-name">—</div>
        </div>
        <div class="color-lives" id="ct-lives"></div>
        <div class="color-grid" id="ct-grid"></div>
        <div style="font-size:13px;color:var(--muted);text-align:center" id="ct-info">Раунд 0 / ${_total}</div>
      </div>`;

    setMoves(_total);
    renderLives();
    startTimer();
    nextRound();
  }

  function renderLives() {
    const el = document.getElementById('ct-lives');
    if (!el) return;
    el.innerHTML = Array.from({length: _lives}, () => '<span class="color-life">❤️</span>').join('');
  }

  function nextRound() {
    if (_round >= _total || _lives <= 0) return endGame();
    _round++;
    _answered = false;

    const pool = shuffle([...COLS]).slice(0, 6);
    _target  = pool[Math.floor(Math.random() * pool.length)];

    const hasCurrent = Math.random() > 0.25;
    if (!hasCurrent) {

      const filtered = pool.filter(c => c.name !== _target.name);
      while (filtered.length < 6) filtered.push(COLS[Math.floor(Math.random() * COLS.length)]);
      renderGrid(filtered.slice(0,6), false);
    } else {
      renderGrid(pool, true);
    }

    document.getElementById('ct-name').textContent = _target.name;
    document.getElementById('ct-info').textContent  = `Раунд ${_round} / ${_total}`;

    clearTimeout(_roundTimer);
    _roundTimer = setTimeout(() => {
      if (!_answered) {

        _lives--;
        renderLives();
        addScore(-10);
        if (_lives <= 0) return endGame();
        nextRound();
      }
    }, _window);
  }

  function renderGrid(colors, hasTarget) {
    const grid = document.getElementById('ct-grid');
    if (!grid) return;
    grid.innerHTML = colors.map(c => `
      <button class="color-btn" style="background:${c.hex};color:#000"
        onclick="window._colorClick('${c.name}')">
        ${c.name}
      </button>`).join('');
  }

  window._colorClick = function(colorName) {
    if (_answered) return;
    _answered = true;
    clearTimeout(_roundTimer);

    if (colorName === _target.name) {
      addScore(50);
      setTimeout(nextRound, 200);
    } else {
      _lives--;
      renderLives();
      addScore(-5);
      if (_lives <= 0) return endGame();
      setTimeout(nextRound, 300);
    }
  };

  function endGame() {
    clearTimeout(_roundTimer);
    stopTimer();
    gameOver();
  }

  GAME_STARTERS['color'] = init;
})();
