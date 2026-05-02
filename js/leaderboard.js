let _lbGame = 'all';

async function renderLeaderboard(game = 'all') {
  _lbGame = game;
  const container = document.getElementById('lb-rows');
  if (!container) return;
  container.innerHTML = '<div class="lb-loading">Загрузка...</div>';

  const r = await API.getLeaderboard(game, 20);
  if (!r.ok) { container.innerHTML = '<div class="lb-empty">Ошибка загрузки</div>'; return; }

  const rows = r.rows || [];
  if (!rows.length) { container.innerHTML = '<div class="lb-empty">Результатов пока нет</div>'; return; }

  const medals = ['gold','silver','bronze'];
  container.innerHTML = rows.map((row, i) => {
    const rankClass = medals[i] || '';
    const medal     = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
    const avg = row.games > 0 ? Math.round(row.total / row.games) : 0;
    return `<div class="lb-row">
      <div class="lb-rank ${rankClass}">${medal}</div>
      <div class="lb-name">${escHtml(row.username)}</div>
      <div class="lb-score-val">${row.best.toLocaleString()}</div>
      <div>${avg.toLocaleString()}</div>
      <div>${row.games}</div>
    </div>`;
  }).join('');
}

function switchLb(game, btn) {
  document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderLeaderboard(game);
}

async function renderMiniLb(game = 'all') {
  const container = document.getElementById('mini-lb');
  if (!container) return;

  const r = await API.getLeaderboard(game, 5);
  if (!r.ok || !r.rows?.length) {
    container.innerHTML = '<div class="lb-empty" style="padding:24px">Нет данных</div>';
    return;
  }

  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
  container.innerHTML = r.rows.map((row, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);">
      <span style="font-size:16px;width:24px;text-align:center">${medals[i]}</span>
      <span style="flex:1;font-size:14px;font-weight:600">${escHtml(row.username)}</span>
      <span style="font-family:'Orbitron',sans-serif;font-size:13px;color:var(--cyan)">${row.best.toLocaleString()}</span>
    </div>`).join('');
}

function filterMiniLb(game, btn) {
  document.querySelectorAll('.lb-filter').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderMiniLb(game);
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}
