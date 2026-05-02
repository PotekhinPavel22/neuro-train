(function() {
  const DIFF = {
    easy:   { rounds: 10, fakes: 1 },
    medium: { rounds: 15, fakes: 2 },
    hard:   { rounds: 20, fakes: 3 },
  };

  let _seq, _seqIdx, _total, _streak, _maxStreak;

  function init() {
    if (E.game !== 'numeric') return;
    resetEngine('numeric');

    const cfg = DIFF[E.difficulty] || DIFF.easy;
    _total    = cfg.rounds;
    _seq      = shuffle([...SEQS]);
    _seqIdx   = 0;
    _streak   = 0;
    _maxStreak= 0;

    const gc = document.getElementById('gc');
    gc.innerHTML = `
      <div class="num-game">
        <div style="font-size:13px;color:var(--muted)" id="ng-count">Вопрос 1 / ${_total}</div>
        <div class="num-seq" id="ng-seq"></div>
        <div class="num-answers" id="ng-ans"></div>
        <div class="num-result" id="ng-result"></div>
        <div style="display:flex;gap:16px;align-items:center">
          <span style="font-size:13px;color:var(--muted)">Серия:</span>
          <span class="num-streak" id="ng-streak">0</span>
        </div>
      </div>`;

    setMoves(_total);
    startTimer();
    showQuestion();
  }

  function showQuestion() {
    if (_seqIdx >= _total) return endGame();

    const q = _seq[_seqIdx % _seq.length];
    document.getElementById('ng-count').textContent = `Вопрос ${_seqIdx+1} / ${_total}`;
    document.getElementById('ng-result').textContent = '';

    const seqEl = document.getElementById('ng-seq');
    seqEl.innerHTML = q.seq.map(n =>
      `<div class="num-bubble">${n}</div>`
    ).join('<span style="font-size:20px;color:var(--muted)">…</span>') +
    '<span style="font-size:20px;color:var(--muted)">…</span>' +
    '<div class="num-bubble question">?</div>';

    const correct = q.answer;
    const fakes = generateFakes(correct, 3);
    const options = shuffle([correct, ...fakes]);

    const ansEl = document.getElementById('ng-ans');
    ansEl.innerHTML = options.map(n =>
      `<button class="num-ans-btn" onclick="window._numAnswer(${n}, ${correct})">${n}</button>`
    ).join('');
  }

  function generateFakes(answer, count) {
    const fakes = new Set();
    const ops = [+1,-1,+2,-2,+3,-3,+5,-5,+10,-10,
                 Math.round(answer*0.5), Math.round(answer*2),
                 answer+answer, answer-Math.round(answer/2)];
    for (const o of shuffle(ops)) {
      if (o !== answer && o >= 0) fakes.add(o);
      if (fakes.size >= count) break;
    }
    while (fakes.size < count) {
      const rnd = answer + Math.floor(Math.random() * 20) - 10;
      if (rnd !== answer && rnd >= 0) fakes.add(rnd);
    }
    return [...fakes].slice(0, count);
  }

  window._numAnswer = function(chosen, correct) {
    const btns = document.querySelectorAll('.num-ans-btn');
    btns.forEach(b => b.disabled = true);

    if (chosen === correct) {
      _streak++;
      _maxStreak = Math.max(_maxStreak, _streak);
      const bonus = 30 + _streak * 5;
      addScore(bonus);
      btns.forEach(b => { if (parseInt(b.textContent) === correct) b.classList.add('correct'); });
      document.getElementById('ng-result').textContent = `✓ Верно! +${bonus} очков`;
    } else {
      _streak = 0;
      btns.forEach(b => {
        if (parseInt(b.textContent) === chosen)  b.classList.add('wrong');
        if (parseInt(b.textContent) === correct) b.classList.add('correct');
      });
      document.getElementById('ng-result').textContent = `✗ Неверно. Правильный ответ: ${correct}`;
    }

    document.getElementById('ng-streak').textContent = _streak;
    addMove();
    _seqIdx++;

    setTimeout(showQuestion, 1200);
  };

  function endGame() {
    stopTimer();
    gameOver({ streak: _maxStreak });
  }

  GAME_STARTERS['numeric'] = init;
})();
