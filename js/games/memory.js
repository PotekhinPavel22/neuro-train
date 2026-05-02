(function() {
  const DIFF = {
    easy:   { pairs: 8,  cols: 4 },
    medium: { pairs: 12, cols: 6 },
    hard:   { pairs: 18, cols: 6 },
  };

  let _flipped = [], _matched = 0, _locked = false, _total = 0;

  function init() {
    if (E.game !== 'memory') return;
    resetEngine('memory');

    const { pairs, cols } = DIFF[E.difficulty] || DIFF.easy;
    _total   = pairs;
    _matched = 0;
    _flipped = [];
    _locked  = false;

    const pool = shuffle(EMOJIS).slice(0, pairs);
    const cards = shuffle([...pool, ...pool]);

    const gc = document.getElementById('gc');
    gc.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'mem-grid';
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    const size = Math.min(560, gc.clientWidth - 48);
    grid.style.width  = size + 'px';
    grid.style.maxWidth = '100%';

    cards.forEach((emoji, idx) => {
      const card = document.createElement('div');
      card.className = 'mem-card';
      card.innerHTML = `
        <div class="mem-card-inner">
          <div class="mem-card-front">🂠</div>
          <div class="mem-card-back">${emoji}</div>
        </div>`;
      card.dataset.emoji = emoji;
      card.dataset.idx   = idx;
      card.addEventListener('click', () => onFlip(card));
      grid.appendChild(card);
    });

    gc.appendChild(grid);
    startTimer();
  }

  function onFlip(card) {
    if (_locked || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    card.classList.add('flipped');
    _flipped.push(card);

    if (_flipped.length === 2) {
      addMove();
      _locked = true;
      const [a, b] = _flipped;
      if (a.dataset.emoji === b.dataset.emoji) {

        const bonus = Math.max(10, 50 - E.moves);
        addScore(bonus);
        a.classList.add('matched');
        b.classList.add('matched');
        _flipped = [];
        _locked  = false;
        _matched++;
        if (_matched === _total) {
          const timeBonus = Math.max(0, 300 - getElapsed()) * 2;
          addScore(timeBonus);
          setTimeout(() => gameOver(), 400);
        }
      } else {
        setTimeout(() => {
          a.classList.remove('flipped');
          b.classList.remove('flipped');
          _flipped = [];
          _locked  = false;
        }, 900);
      }
    }
  }

  GAME_STARTERS['memory'] = init;
})();
