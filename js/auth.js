let _captchaAnswer = 0;

function genCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const ops = [
    { sym: '+', fn: (x, y) => x + y },
    { sym: '-', fn: (x, y) => x - y },
    { sym: '×', fn: (x, y) => x * y },
  ];
  const op = ops[Math.floor(Math.random() * ops.length)];
  _captchaAnswer = op.fn(a, b);
  const q = document.getElementById('captcha-question');
  if (q) q.textContent = `${a} ${op.sym} ${b} = ?`;
}

async function doRegister() {
  const username    = (document.getElementById('ru')?.value  || '').trim();
  const password    = document.getElementById('rp')?.value   || '';
  const secretWord  = (document.getElementById('rsw')?.value || '').trim().toLowerCase();
  const captcha     = parseInt(document.getElementById('captcha-input')?.value || '', 10);
  const a1          = document.getElementById('a1')?.checked;
  const a2          = document.getElementById('a2')?.checked;
  const errEl       = document.getElementById('re');

  const showErr = msg => { if (errEl) errEl.textContent = msg; };
  showErr('');

  if (username.length < 3)               return showErr('Имя пользователя: минимум 3 символа');
  if (!/^[A-Za-z0-9_]+$/.test(username)) return showErr('Только латинские буквы, цифры и _');
  if (password.length < 8)               return showErr('Пароль: минимум 8 символов');
  if (secretWord.length < 2)             return showErr('Кодовое слово: минимум 2 символа');
  if (captcha !== _captchaAnswer)        return showErr('Неверный ответ на капчу');
  if (!a1 || !a2)                        return showErr('Необходимо принять условия');

  const pw_hash = sha256('nt_2025_' + password);
  const r = await API.register(username, pw_hash, secretWord);

  if (!r.ok) return showErr(r.error || 'Ошибка регистрации');

  G.user = { id: r.id, username: r.username };
  G.achs = [];
  updateNavUI();
  toast(`Добро пожаловать, ${r.username}! 🎉`, 'ok');
  nav('home');
}

async function doLogin() {
  const username = (document.getElementById('lu')?.value || '').trim();
  const password = document.getElementById('lp')?.value || '';
  const errEl    = document.getElementById('le');

  const showErr = msg => { if (errEl) errEl.textContent = msg; };
  showErr('');

  if (!username) return showErr('Введите имя пользователя');
  if (!password) return showErr('Введите пароль');

  const pw_hash = sha256('nt_2025_' + password);
  const r = await API.login(username, pw_hash);

  if (!r.ok) return showErr(r.error || 'Неверный логин или пароль');

  G.user = { id: r.id, username: r.username, is_admin: r.is_admin || false };
  if (!r.is_admin) {
    const ra = await API.getAch();
    G.achs = ra.ok ? ra.achievements : [];
  }
  updateNavUI();
  if (r.is_admin) {
    toast(`Добро пожаловать, администратор! 🔑`, 'ok');
    nav('admin');
  } else {
    toast(`Привет, ${r.username}! 👋`, 'ok');
    nav('home');
  }
}

async function doResetPassword() {
  const username   = (document.getElementById('rpu')?.value   || '').trim();
  const secretWord = (document.getElementById('rpsw')?.value  || '').trim().toLowerCase();
  const newPass    = document.getElementById('rpp')?.value    || '';
  const newPass2   = document.getElementById('rpp2')?.value   || '';
  const errEl      = document.getElementById('rpe');

  const showErr = msg => { if (errEl) errEl.textContent = msg; };
  showErr('');

  if (!username)             return showErr('Введите имя пользователя');
  if (!secretWord)           return showErr('Введите кодовое слово');
  if (newPass.length < 8)    return showErr('Новый пароль: минимум 8 символов');
  if (newPass !== newPass2)  return showErr('Пароли не совпадают');

  const new_pw_hash = sha256('nt_2025_' + newPass);
  const r = await API.resetPassword(username, secretWord, new_pw_hash);

  if (!r.ok) return showErr(r.error || 'Ошибка сброса пароля');

  toast('Пароль успешно изменён! Войдите с новым паролем.', 'ok', 3500);
  nav('login');
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const page = document.querySelector('.page.active')?.id;
  if (page === 'p-login')    doLogin();
  if (page === 'p-register') doRegister();
  if (page === 'p-reset')    doResetPassword();
});
