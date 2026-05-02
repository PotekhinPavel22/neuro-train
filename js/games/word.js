(function() {
  const DIFF = {
    easy:   { count: 10, perWord: 8000  },
    medium: { count: 15, perWord: 6000  },
    hard:   { count: 20, perWord: 4000  },
  };

  let _words, _idx, _answered, _timerEnd, _tickID;

  function init() {
    if (E.game !== 'word') return;
    resetEngine('word');

    const cfg  = DIFF[E.difficulty] || DIFF.easy;
    _words     = shuffle([...WORDS]).slice(0, cfg.count);
    _idx       = 0;
    _answered  = [];

    const gc = document.getElementById('gc');
    gc.innerHTML = `
      <div class="word-game">
        <div class="word-count" id="wc-count">Слово 1 / ${_words.length}</div>
        <div class="word-progress-wrap">
          <div class="word-progress-bar" id="wc-bar" style="width:100%"></div>
        </div>
        <div class="word-prompt" id="wc-prompt">—</div>
        <div class="word-input-row">
          <input class="form-input" id="wc-input" placeholder="Напиши ассоциацию...">
          <button class="btn btn-primary" onclick="window._wordSubmit()">→</button>
        </div>
        <div class="word-history" id="wc-hist"></div>
      </div>`;

    document.getElementById('wc-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') window._wordSubmit();
    });

    startTimer();
    showWord(cfg.perWord);
  }

  function showWord(timePerWord) {
    if (_idx >= _words.length) return endGame();

    const word = _words[_idx];
    document.getElementById('wc-prompt').textContent = word;
    document.getElementById('wc-count').textContent  = `Слово ${_idx+1} / ${_words.length}`;
    document.getElementById('wc-input').value = '';
    document.getElementById('wc-input')?.focus();

    _timerEnd = Date.now() + timePerWord;
    clearInterval(_tickID);
    _tickID = setInterval(() => {
      const left = (_timerEnd - Date.now()) / timePerWord;
      const bar  = document.getElementById('wc-bar');
      if (bar) bar.style.width = Math.max(0, left * 100) + '%';
      if (left <= 0) {
        clearInterval(_tickID);
        skipWord();
      }
    }, 50);
  }

  window._wordSubmit = function() {
    const input = document.getElementById('wc-input');
    const val   = (input?.value || '').trim();
    if (!val) return;

    clearInterval(_tickID);
    _answered.push(val);
    addScore(30 + Math.round(Math.max(0, (_timerEnd - Date.now()) / 100)));
    addMove();

    const hist = document.getElementById('wc-hist');
    if (hist) {
      const tag = document.createElement('span');
      tag.className   = 'word-tag';
      tag.textContent = val;
      hist.appendChild(tag);
    }

    _idx++;
    const cfg = DIFF[E.difficulty] || DIFF.easy;
    showWord(cfg.perWord);
  };

  function skipWord() {
    _idx++;
    const cfg = DIFF[E.difficulty] || DIFF.easy;
    showWord(cfg.perWord);
  }

  function endGame() {
    clearInterval(_tickID);
    stopTimer();
    gameOver({ answered: _answered.length });
  }

  GAME_STARTERS['word'] = init;
})();
