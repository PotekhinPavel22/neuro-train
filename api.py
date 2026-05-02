import hashlib
import os
import time
from collections import defaultdict
from threading import Lock
from flask import Blueprint, request, jsonify, session
from database import (
    create_user, get_user, delete_user,
    record_login, record_logout,
    save_score, get_user_stats,
    get_leaderboard,
    unlock_achievement, get_achievements,
    verify_secret_word, reset_password,
    get_all_users_with_passwords,
    get_sessions_log, get_all_scores,
    reset_all_scores,
)

api = Blueprint('api', __name__, url_prefix='/api')

VALID_GAMES   = {'memory', 'color', 'word', 'numeric', 'puzzle'}
VALID_DIFFS   = {'easy', 'medium', 'hard'}
PW_HASH_LEN   = 64
SECRET_PEPPER = 'nt_2025_'

ADMIN_USERNAME = 'admin'
_raw = os.environ.get('ADMIN_PASSWORD', 'NeuroAdmin@2025')
ADMIN_PW_HASH  = hashlib.sha256((SECRET_PEPPER + _raw).encode()).hexdigest()
del _raw

_rate_lock    = Lock()
_rate_buckets: dict[str, list[float]] = defaultdict(list)
RATE_LIMITS   = {
    'login':    (5,  60),
    'register': (3, 120),
    'reset':    (3, 300),
}


def _rate_key(action: str) -> str:
    return f'{action}:{_get_ip()}'


def _check_rate(action: str) -> bool:
    max_calls, window = RATE_LIMITS[action]
    key = _rate_key(action)
    now = time.time()
    with _rate_lock:
        calls = _rate_buckets[key]
        calls[:] = [t for t in calls if now - t < window]
        if len(calls) >= max_calls:
            return False
        calls.append(now)
    return True


def ok(data=None, **kwargs):
    return jsonify({'ok': True, **(data or {}), **kwargs})


def err(msg, status=400):
    return jsonify({'ok': False, 'error': msg}), status


def current_user():
    uid   = session.get('user_id')
    uname = session.get('username')
    return (uid, uname) if uid is not None else (None, None)


def require_auth():
    uid, uname = current_user()
    if uid is None:
        return None, None, err('Необходима авторизация', 401)
    return uid, uname, None


def require_admin():
    _, uname = current_user()
    if uname != ADMIN_USERNAME:
        return err('Доступ запрещён', 403)
    return None


def _get_ip() -> str:
    xff = request.headers.get('X-Forwarded-For', '')
    candidate = xff.split(',')[0].strip() if xff else ''
    return candidate if candidate else (request.remote_addr or '127.0.0.1')


def _safe_int(val, default=0, min_val=0, max_val=999_999) -> int:
    try:
        return max(min_val, min(max_val, int(val)))
    except (TypeError, ValueError):
        return default


def _valid_pw_hash(h: str) -> bool:
    return isinstance(h, str) and len(h) == PW_HASH_LEN and all(c in '0123456789abcdef' for c in h)


@api.post('/register')
def register():
    if not _check_rate('register'):
        return err('Слишком много попыток. Попробуйте позже.', 429)

    d           = request.json or {}
    username    = (d.get('username') or '').strip()
    pw_hash     = d.get('pw_hash', '')
    secret_word = (d.get('secret_word') or '').strip().lower()

    if username == ADMIN_USERNAME:
        return err('Имя пользователя уже занято', 409)
    if len(username) < 3:
        return err('Username: минимум 3 символа')
    if len(username) > 32:
        return err('Username: максимум 32 символа')
    if not username.replace('_', '').isalnum():
        return err('Username: только буквы, цифры и _')
    if not _valid_pw_hash(pw_hash):
        return err('Некорректный формат пароля')
    if len(secret_word) < 2:
        return err('Кодовое слово: минимум 2 символа')
    if len(secret_word) > 64:
        return err('Кодовое слово: максимум 64 символа')

    u = create_user(username, pw_hash, secret_word, ip=_get_ip())
    if u is None:
        return err('Имя пользователя уже занято', 409)

    session['user_id']  = u['id']
    session['username'] = u['username']
    return ok({'username': u['username'], 'id': u['id']}), 201


@api.post('/login')
def login():
    if not _check_rate('login'):
        return err('Слишком много попыток. Попробуйте позже.', 429)

    d        = request.json or {}
    username = (d.get('username') or '').strip()
    pw_hash  = d.get('pw_hash', '')

    if not username or not _valid_pw_hash(pw_hash):
        return err('Неверный логин или пароль', 401)

    if username == ADMIN_USERNAME:
        if pw_hash != ADMIN_PW_HASH:
            return err('Неверный логин или пароль', 401)
        session['user_id']  = 0
        session['username'] = ADMIN_USERNAME
        return ok({'username': ADMIN_USERNAME, 'id': 0, 'is_admin': True})

    u = get_user(username)
    if not u or u['pw_hash'] != pw_hash:
        return err('Неверный логин или пароль', 401)

    record_login(u['id'], u['username'], ip=_get_ip())
    session['user_id']  = u['id']
    session['username'] = u['username']
    return ok({'username': u['username'], 'id': u['id'], 'is_admin': False})


@api.post('/logout')
def logout():
    uid, uname = current_user()
    if uid is not None and uname != ADMIN_USERNAME:
        record_logout(uid, uname)
    session.clear()
    return ok()


@api.get('/me')
def me():
    uid, uname = current_user()
    if uid is None:
        return ok({'user': None})
    is_admin = uname == ADMIN_USERNAME
    return ok({'user': {'id': uid, 'username': uname, 'is_admin': is_admin}})


@api.delete('/account')
def delete_account():
    uid, uname, e = require_auth()
    if e:
        return e
    if uname == ADMIN_USERNAME:
        return err('Нельзя удалить аккаунт администратора', 403)
    record_logout(uid, uname)
    delete_user(uid)
    session.clear()
    return ok()


@api.post('/reset-password')
def do_reset_password():
    if not _check_rate('reset'):
        return err('Слишком много попыток. Попробуйте позже.', 429)

    d           = request.json or {}
    username    = (d.get('username') or '').strip()
    secret_word = (d.get('secret_word') or '').strip().lower()
    new_pw_hash = d.get('new_pw_hash', '')

    if username == ADMIN_USERNAME:
        return err('Сброс пароля администратора недоступен', 403)
    if not username:
        return err('Введите имя пользователя')
    if not secret_word:
        return err('Введите кодовое слово')
    if not _valid_pw_hash(new_pw_hash):
        return err('Некорректный формат пароля')

    uid = verify_secret_word(username, secret_word)
    if uid is None:
        return err('Неверное имя пользователя или кодовое слово', 401)

    reset_password(uid, username, new_pw_hash, ip=_get_ip())
    return ok({'message': 'Пароль успешно изменён'})


@api.post('/scores')
def post_score():
    uid, uname, e = require_auth()
    if e:
        return e
    if uname == ADMIN_USERNAME:
        return err('Администратор не может играть', 403)

    d          = request.json or {}
    game       = str(d.get('game', '')).strip()
    score      = _safe_int(d.get('score',    0), min_val=0, max_val=100_000)
    moves      = _safe_int(d.get('moves',    0), min_val=0, max_val=100_000)
    duration   = _safe_int(d.get('duration', 0), min_val=0, max_val=86_400)
    difficulty = str(d.get('difficulty', 'easy')).strip()

    if game not in VALID_GAMES:
        return err('Неизвестная игра')
    if difficulty not in VALID_DIFFS:
        difficulty = 'easy'

    save_score(uid, uname, game, score, moves, duration, difficulty)
    return ok(), 201


@api.get('/stats')
def stats():
    uid, uname, e = require_auth()
    if e:
        return e
    if uname == ADMIN_USERNAME:
        return err('Администратор не имеет статистики', 403)
    return ok(get_user_stats(uid))


@api.get('/leaderboard')
def leaderboard():
    game = request.args.get('game', 'all')
    if game not in VALID_GAMES and game != 'all':
        game = 'all'
    limit = min(_safe_int(request.args.get('limit', 10), min_val=1, max_val=50), 50)
    return ok({'rows': get_leaderboard(game, limit)})


@api.post('/achievements')
def post_achievement():
    uid, uname, e = require_auth()
    if e:
        return e
    if uname == ADMIN_USERNAME:
        return err('Администратор не может получать достижения', 403)

    key = str((request.json or {}).get('key', '')).strip()
    if not key or len(key) > 64:
        return err('Ключ обязателен')

    is_new = unlock_achievement(uid, uname, key)
    return ok({'new': is_new}), 201


@api.get('/achievements')
def get_ach():
    uid, uname, e = require_auth()
    if e:
        return e
    if uname == ADMIN_USERNAME:
        return ok({'achievements': []})
    return ok({'achievements': get_achievements(uid)})


@api.get('/admin/users')
def admin_users():
    e = require_admin()
    if e:
        return e
    return ok({'users': get_all_users_with_passwords()})


@api.get('/admin/sessions')
def admin_sessions():
    e = require_admin()
    if e:
        return e
    limit = _safe_int(request.args.get('limit', 50), min_val=1, max_val=200)
    return ok({'sessions': get_sessions_log(limit)})


@api.get('/admin/scores')
def admin_scores():
    e = require_admin()
    if e:
        return e
    limit = _safe_int(request.args.get('limit', 50), min_val=1, max_val=200)
    return ok({'scores': get_all_scores(limit)})


@api.delete('/admin/user/<int:user_id>')
def admin_delete_user(user_id):
    e = require_admin()
    if e:
        return e
    delete_user(user_id)
    return ok()


@api.delete('/admin/scores')
def admin_reset_scores():
    e = require_admin()
    if e:
        return e
    reset_all_scores()
    return ok()
