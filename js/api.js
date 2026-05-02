const API = {
  async _req(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    try {
      const r = await fetch('/api' + path, opts);
      return await r.json();
    } catch (e) {
      return { ok: false, error: 'Нет соединения с сервером' };
    }
  },
  get:    (path)       => API._req('GET',    path),
  post:   (path, body) => API._req('POST',   path, body),
  delete: (path, body) => API._req('DELETE', path, body),

  me:             ()          => API.get('/me'),
  login:          (u, h)      => API.post('/login',          { username: u, pw_hash: h }),
  register:       (u, h, sw)  => API.post('/register',       { username: u, pw_hash: h, secret_word: sw }),
  logout:         ()          => API.post('/logout'),
  deleteAccount:  ()          => API.delete('/account'),
  resetPassword:  (u, sw, h)  => API.post('/reset-password', { username: u, secret_word: sw, new_pw_hash: h }),
  saveScore:      (d)         => API.post('/scores',          d),
  getStats:       ()          => API.get('/stats'),
  getLeaderboard: (g='all', n=10) => API.get(`/leaderboard?game=${g}&limit=${n}`),
  unlockAch:      (key)       => API.post('/achievements',    { key }),
  getAch:         ()          => API.get('/achievements'),
};

function sha256(msg) {
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  const enc = [];
  for (let i = 0; i < msg.length; i++) {
    const c = msg.charCodeAt(i);
    if (c < 0x80) enc.push(c);
    else if (c < 0x800) enc.push(0xc0|(c>>6), 0x80|(c&0x3f));
    else enc.push(0xe0|(c>>12), 0x80|((c>>6)&0x3f), 0x80|(c&0x3f));
  }
  const bitLen = enc.length * 8;
  enc.push(0x80);
  while (enc.length % 64 !== 56) enc.push(0);
  for (let i = 7; i >= 0; i--) enc.push((bitLen / Math.pow(2, i*8)) & 0xff);
  for (let i = 0; i < enc.length; i += 64) {
    const w = new Array(64);
    for (let j = 0; j < 16; j++)
      w[j] = (enc[i+j*4]<<24)|(enc[i+j*4+1]<<16)|(enc[i+j*4+2]<<8)|enc[i+j*4+3];
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j-15],7)^rotr(w[j-15],18)^(w[j-15]>>>3);
      const s1 = rotr(w[j-2],17)^rotr(w[j-2],19)^(w[j-2]>>>10);
      w[j] = (w[j-16]+s0+w[j-7]+s1)|0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for (let j = 0; j < 64; j++) {
      const t1 = (h+((rotr(e,6)^rotr(e,11)^rotr(e,25)))+((e&f)^(~e&g))+K[j]+w[j])|0;
      const t2 = ((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&c)^(b&c)))|0;
      h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;
    }
    H = H.map((v,i)=>(v+[a,b,c,d,e,f,g,h][i])|0);
  }
  return H.map(x => (x>>>0).toString(16).padStart(8,'0')).join('');
}

let G = {
  user: null,
  achs: [],
};

async function initUser() {
  const r = await API.me();
  G.user = r.ok ? r.user : null;
  updateNavUI();
  if (G.user) {
    const ra = await API.getAch();
    G.achs = ra.ok ? ra.achievements : [];
  }
}

function updateNavUI() {
  const end = document.getElementById('nav-end');
  if (!end) return;
  const adminLi = document.getElementById('nl-admin-li');
  if (G.user) {
    const isAdmin = G.user.is_admin;
    if (adminLi) adminLi.style.display = isAdmin ? '' : 'none';
    const profileBtn = isAdmin ? '' : '<button class="btn btn-ghost btn-sm" onclick="nav(&quot;profile&quot;)">Профиль</button>';
    end.innerHTML = `
      <span style="font-size:14px;color:var(--muted)">${G.user.username}</span>
      ${profileBtn}
      <button class="btn btn-ghost btn-sm" onclick="doLogout()">Выйти</button>`;
  } else {
    if (adminLi) adminLi.style.display = 'none';
    end.innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="nav('login')">Войти</button>
      <button class="btn btn-primary btn-sm" onclick="nav('register')">Регистрация</button>`;
  }
}

async function doLogout() {
  await API.logout();
  G.user = null; G.achs = [];
  updateNavUI();
  toast('Вы вышли из аккаунта');
  nav('home');
}

async function checkAchs(game, score, moves, data) {
  const toUnlock = [];
  const stats = await API.getStats();

  if (!G.achs.includes('first_game'))                                              toUnlock.push('first_game');
  if (game === 'memory'  && score >= 500 && !G.achs.includes('memory_master'))     toUnlock.push('memory_master');
  if (game === 'color'   && score >= 500 && !G.achs.includes('speed_demon'))       toUnlock.push('speed_demon');
  if (game === 'puzzle'  && moves <= 50  && !G.achs.includes('puzzle_opt'))        toUnlock.push('puzzle_opt');
  if (game === 'word'    && (data?.answered || 0) >= 20 && !G.achs.includes('word_fast'))  toUnlock.push('word_fast');
  if (game === 'numeric' && (data?.streak  || 0) >= 5  && !G.achs.includes('streak5'))    toUnlock.push('streak5');
  if (score >= 900 && !G.achs.includes('perfect'))                                 toUnlock.push('perfect');
  if (stats.ok && (stats.total || 0) >= 10 && !G.achs.includes('games_10'))        toUnlock.push('games_10');

  for (const key of toUnlock) {
    const r = await API.unlockAch(key);
    if (r.ok && r.new) {
      G.achs.push(key);
      const info = ACHS[key];
      if (info) toast(`🏆 Достижение: ${info.title}`, 'ok', 3000);
    }
  }
}
