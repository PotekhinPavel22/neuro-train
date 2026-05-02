const PAGE_IDS = {
  home:     'p-home',
  login:    'p-login',
  register: 'p-register',
  reset:    'p-reset',
  game:     'p-game',
  profile:  'p-profile',
  lb:       'p-lb',
  privacy:  'p-privacy',
  rules:    'p-rules',
  admin:    'p-admin',
};

function nav(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(PAGE_IDS[page] || ('p-' + page));
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);

  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const map = { home:'nl-home', lb:'nl-lb', profile:'nl-profile', privacy:'nl-privacy', rules:'nl-rules', admin:'nl-admin' };
  if (map[page]) document.getElementById(map[page])?.classList.add('active');

  if (page === 'lb')      renderLeaderboard(_lbGame);
  if (page === 'profile') renderProfile();
  if (page === 'home')    renderMiniLb('all');
  if (page === 'admin')   renderAdminPage();
  if (page === 'register') genCaptcha();
  if (page === 'login') {
    document.getElementById('le').textContent = '';
  }
  if (page === 'reset') {
    const e = document.getElementById('rpe');
    if (e) e.textContent = '';
    ['rpu','rpsw','rpp','rpp2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }
}

let _toastTimer = null;
function toast(msg, type = '', duration = 2500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.classList.remove('show'); }, duration);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

document.addEventListener('DOMContentLoaded', async () => {
  await initUser();
  renderMiniLb('all');
});

document.getElementById('goModal')?.addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
