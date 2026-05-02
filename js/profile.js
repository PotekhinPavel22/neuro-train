const GAME_META = {
  memory:  { icon:'🧠', name:'Memory Game',       max:1000 },
  color:   { icon:'⚡', name:'Color Reaction',     max:1000 },
  word:    { icon:'💬', name:'Word Association',   max:500  },
  numeric: { icon:'🔢', name:'Numeric Sequence',   max:500  },
  puzzle:  { icon:'🧩', name:'Puzzle Solver',      max:1000 },
};

async function renderProfile() {
  if (!G.user) {
    nav('login');
    toast('Войдите в аккаунт', 'err');
    return;
  }

  const ava  = document.getElementById('pava');
  const pname = document.getElementById('pname');
  if (ava)   ava.textContent  = G.user.username[0].toUpperCase();
  if (pname) pname.textContent = G.user.username;

  const r = await API.getStats();
  if (r.ok) {
    setText('s-total', r.total || 0);
    setText('s-cog',   r.cog   || 0);
    setText('s-best',  r.best  || 0);
    renderGameProgress(r);
  }

  renderAchievements(G.achs);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderGameProgress(stats) {
  const list = document.getElementById('gp-list');
  if (!list) return;
  const games = ['memory','color','word','numeric','puzzle'];
  list.innerHTML = games.map(g => {
    const meta  = GAME_META[g];
    const best  = stats[`${g}_b`] || 0;
    const played= stats[`${g}_p`] || 0;
    const pct   = Math.min(100, Math.round((best / meta.max) * 100));
    return `<div class="gp-row">
      <div class="gp-icon">${meta.icon}</div>
      <div class="gp-info">
        <div class="gp-title">${meta.name} <span style="color:var(--muted);font-weight:400;font-size:12px">· ${played} игр</span></div>
        <div class="gp-bar-wrap"><div class="gp-bar" style="width:${pct}%"></div></div>
      </div>
      <div class="gp-score">${best}</div>
    </div>`;
  }).join('');
}

function renderAchievements(unlocked = []) {
  const grid = document.getElementById('ach-grid');
  if (!grid) return;
  grid.innerHTML = Object.entries(ACHS).map(([key, info]) => {
    const isOn = unlocked.includes(key);
    return `<div class="ach-tile ${isOn ? 'unlocked' : ''}">
      <div class="ach-icon">${info.icon}</div>
      <div class="ach-title">${info.title}</div>
      <div class="ach-desc">${info.desc}</div>
    </div>`;
  }).join('');
}

async function confirmDel() {
  if (!confirm('Удалить аккаунт? Это действие необратимо.')) return;
  const r = await API.deleteAccount();
  if (r.ok) {
    G.user = null; G.achs = [];
    updateNavUI();
    toast('Аккаунт удалён');
    nav('home');
  } else {
    toast('Ошибка удаления: ' + (r.error || ''), 'err');
  }
}
