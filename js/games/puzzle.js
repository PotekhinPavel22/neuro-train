(function() {
  const DIFF = {
    easy:   { size: 3 },
    medium: { size: 4 },
    hard:   { size: 4 },
  };

  let _size, _board, _empty, _solved;

  function init() {
    if (E.game !== 'puzzle') return;
    resetEngine('puzzle');

    _size   = DIFF[E.difficulty]?.size || 4;
    _solved = solvedBoard();
    _board  = generateBoard();
    _empty  = _board.indexOf(0);

    render();
    startTimer();
  }

  function solvedBoard() {
    const n = _size * _size;
    return Array.from({length: n}, (_, i) => (i + 1) % n);

  }

  function generateBoard() {

    let board;
    do {
      board = shuffle([...solvedBoard()]);
    } while (!isSolvable(board));
    return board;
  }

  function isSolvable(board) {

    let inv = 0;
    const flat = board.filter(x => x !== 0);
    for (let i = 0; i < flat.length; i++)
      for (let j = i + 1; j < flat.length; j++)
        if (flat[i] > flat[j]) inv++;

    if (_size % 2 === 1) return inv % 2 === 0;
    const emptyRow = _size - 1 - Math.floor(board.indexOf(0) / _size);
    return (emptyRow % 2 === 0) === (inv % 2 === 1);
  }

  function render() {
    const gc = document.getElementById('gc');
    gc.innerHTML = '';

    const wrap  = document.createElement('div');
    wrap.className = 'puzzle-game';

    const board = document.createElement('div');
    board.className = 'puzzle-board';
    board.style.gridTemplateColumns = `repeat(${_size}, 1fr)`;
    const tileSize = Math.floor(Math.min(480, window.innerWidth - 64) / _size);
    board.style.width = (tileSize * _size + (_size - 1) * 4 + 16) + 'px';

    _board.forEach((val, idx) => {
      const tile = document.createElement('div');
      tile.className = 'puzzle-tile' + (val === 0 ? ' empty' : '');
      tile.style.width  = tileSize + 'px';
      tile.style.height = tileSize + 'px';
      tile.style.fontSize = Math.round(tileSize * 0.35) + 'px';

      if (val !== 0) {
        tile.textContent = val;
        if (val === _solved[idx]) tile.classList.add('placed');
        tile.addEventListener('click', () => onTileClick(idx));
      }
      board.appendChild(tile);
    });

    const info = document.createElement('div');
    info.style.cssText = 'font-size:13px;color:var(--muted);text-align:center';
    info.id = 'pz-info';
    info.textContent = `${_size}×${_size} — нажимай на плитку рядом с пустым полем`;

    wrap.appendChild(board);
    wrap.appendChild(info);
    gc.appendChild(wrap);
  }

  function onTileClick(idx) {
    const empty = _board.indexOf(0);
    const validMoves = getNeighbours(empty);
    if (!validMoves.includes(idx)) return;

    [_board[empty], _board[idx]] = [_board[idx], _board[empty]];
    addMove();
    render();

    if (isWon()) {
      const moveBonus = Math.max(0, 500 - E.moves * 5);
      const timeBonus = Math.max(0, 300 - getElapsed());
      addScore(moveBonus + timeBonus);
      setTimeout(() => gameOver(), 400);
    }
  }

  function getNeighbours(pos) {
    const row = Math.floor(pos / _size);
    const col = pos % _size;
    const nb  = [];
    if (row > 0)         nb.push(pos - _size);
    if (row < _size - 1) nb.push(pos + _size);
    if (col > 0)         nb.push(pos - 1);
    if (col < _size - 1) nb.push(pos + 1);
    return nb;
  }

  function isWon() {
    return _board.every((v, i) => v === _solved[i]);
  }

  GAME_STARTERS['puzzle'] = init;
})();
