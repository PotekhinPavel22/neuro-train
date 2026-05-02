import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'neuro-train.db')


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def init_db():
    with get_conn() as conn:
        conn.executescript('''
            CREATE TABLE IF NOT EXISTS users (
                id              INTEGER  PRIMARY KEY AUTOINCREMENT,
                username        TEXT     NOT NULL UNIQUE,
                pw_hash         TEXT     NOT NULL,
                secret_word     TEXT     NOT NULL DEFAULT '',
                registered_at   DATETIME DEFAULT (datetime('now', 'localtime')),
                last_login_at   DATETIME,
                login_count     INTEGER  DEFAULT 0,
                is_active       INTEGER  DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS sessions_log (
                id          INTEGER  PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                username    TEXT     NOT NULL,
                action      TEXT     NOT NULL CHECK(action IN ('login','logout','register','reset')),
                ip_address  TEXT     DEFAULT 'localhost',
                logged_at   DATETIME DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS scores (
                id          INTEGER  PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                username    TEXT     NOT NULL,
                game        TEXT     NOT NULL,
                score       INTEGER  NOT NULL,
                moves       INTEGER  DEFAULT 0,
                duration    INTEGER  DEFAULT 0,
                difficulty  TEXT     DEFAULT 'easy',
                played_at   DATETIME DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS achievements (
                id           INTEGER  PRIMARY KEY AUTOINCREMENT,
                user_id      INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                username     TEXT     NOT NULL,
                key          TEXT     NOT NULL,
                unlocked_at  DATETIME DEFAULT (datetime('now', 'localtime')),
                UNIQUE(user_id, key)
            );

            CREATE INDEX IF NOT EXISTS idx_users_username  ON users(username);
            CREATE INDEX IF NOT EXISTS idx_sessions_user   ON sessions_log(user_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_logged ON sessions_log(logged_at);
            CREATE INDEX IF NOT EXISTS idx_scores_user     ON scores(user_id);
            CREATE INDEX IF NOT EXISTS idx_scores_game     ON scores(game);
            CREATE INDEX IF NOT EXISTS idx_ach_user        ON achievements(user_id);
        ''')


def create_user(username: str, pw_hash: str, secret_word: str, ip: str = 'localhost') -> dict | None:
    try:
        with get_conn() as conn:
            cur = conn.execute(
                '''INSERT INTO users (username, pw_hash, secret_word, last_login_at, login_count)
                   VALUES (?, ?, ?, datetime('now','localtime'), 1)''',
                (username, pw_hash, secret_word)
            )
            uid = cur.lastrowid
            conn.execute(
                '''INSERT INTO sessions_log (user_id, username, action, ip_address)
                   VALUES (?, ?, 'register', ?)''',
                (uid, username, ip)
            )
            return {'id': uid, 'username': username}
    except sqlite3.IntegrityError:
        return None


def get_user(username: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            'SELECT id, username, pw_hash FROM users WHERE username = ? AND is_active = 1',
            (username,)
        ).fetchone()
        return dict(row) if row else None


def verify_secret_word(username: str, secret_word: str) -> int | None:
    with get_conn() as conn:
        row = conn.execute(
            'SELECT id FROM users WHERE username = ? AND secret_word = ? AND is_active = 1',
            (username, secret_word)
        ).fetchone()
        return row['id'] if row else None


def reset_password(user_id: int, username: str, new_pw_hash: str, ip: str = 'localhost'):
    with get_conn() as conn:
        conn.execute(
            'UPDATE users SET pw_hash = ? WHERE id = ?',
            (new_pw_hash, user_id)
        )
        conn.execute(
            '''INSERT INTO sessions_log (user_id, username, action, ip_address)
               VALUES (?, ?, 'reset', ?)''',
            (user_id, username, ip)
        )


def record_login(user_id: int, username: str, ip: str = 'localhost'):
    with get_conn() as conn:
        conn.execute(
            '''UPDATE users
               SET last_login_at = datetime('now','localtime'),
                   login_count   = login_count + 1
               WHERE id = ?''',
            (user_id,)
        )
        conn.execute(
            '''INSERT INTO sessions_log (user_id, username, action, ip_address)
               VALUES (?, ?, 'login', ?)''',
            (user_id, username, ip)
        )


def record_logout(user_id: int, username: str):
    with get_conn() as conn:
        conn.execute(
            '''INSERT INTO sessions_log (user_id, username, action)
               VALUES (?, ?, 'logout')''',
            (user_id, username)
        )


def delete_user(user_id: int):
    with get_conn() as conn:
        conn.execute('UPDATE users SET is_active = 0 WHERE id = ?', (user_id,))


def save_score(user_id: int, username: str, game: str, score: int,
               moves: int = 0, duration: int = 0, difficulty: str = 'easy'):
    with get_conn() as conn:
        conn.execute(
            '''INSERT INTO scores (user_id, username, game, score, moves, duration, difficulty)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (user_id, username, game, score, moves, duration, difficulty)
        )


def get_user_stats(user_id: int) -> dict:
    games = ['memory', 'color', 'word', 'numeric', 'puzzle']
    with get_conn() as conn:
        total = conn.execute(
            'SELECT COUNT(*) FROM scores WHERE user_id = ?', (user_id,)
        ).fetchone()[0]
        best = conn.execute(
            'SELECT MAX(score) FROM scores WHERE user_id = ?', (user_id,)
        ).fetchone()[0] or 0
        per_game = {}
        for g in games:
            row = conn.execute(
                'SELECT COUNT(*) as played, MAX(score) as best FROM scores WHERE user_id=? AND game=?',
                (user_id, g)
            ).fetchone()
            per_game[g] = {'played': row['played'], 'best': row['best'] or 0}
        cog_row = conn.execute(
            'SELECT score FROM scores WHERE user_id=? ORDER BY played_at DESC LIMIT 20',
            (user_id,)
        ).fetchall()
        cog = 0
        for r in reversed(cog_row):
            cog = min(1000, round(cog * 0.85 + r['score'] * 0.15))
    return {
        'total': total, 'best': best, 'cog': cog,
        **{f'{g}_p': per_game[g]['played'] for g in games},
        **{f'{g}_b': per_game[g]['best']   for g in games},
    }


def get_leaderboard(game: str = 'all', limit: int = 10) -> list[dict]:
    with get_conn() as conn:
        if game == 'all':
            rows = conn.execute(
                '''SELECT username, SUM(score) AS total, COUNT(*) AS games, MAX(score) AS best
                   FROM scores GROUP BY user_id ORDER BY total DESC LIMIT ?''',
                (limit,)
            ).fetchall()
        else:
            rows = conn.execute(
                '''SELECT username, MAX(score) AS total, COUNT(*) AS games, MAX(score) AS best
                   FROM scores WHERE game=? GROUP BY user_id ORDER BY total DESC LIMIT ?''',
                (game, limit)
            ).fetchall()
        return [dict(r) for r in rows]


def unlock_achievement(user_id: int, username: str, key: str) -> bool:
    try:
        with get_conn() as conn:
            conn.execute(
                'INSERT INTO achievements (user_id, username, key) VALUES (?, ?, ?)',
                (user_id, username, key)
            )
        return True
    except sqlite3.IntegrityError:
        return False


def get_achievements(user_id: int) -> list[str]:
    with get_conn() as conn:
        rows = conn.execute(
            'SELECT key FROM achievements WHERE user_id = ?', (user_id,)
        ).fetchall()
        return [r['key'] for r in rows]


def get_all_users_with_passwords() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            '''SELECT u.id, u.username, u.pw_hash, u.secret_word,
                      u.registered_at, u.last_login_at,
                      u.login_count, u.is_active,
                      COUNT(DISTINCT s.id) AS total_games,
                      MAX(s.score)         AS best_score,
                      COUNT(DISTINCT a.id) AS achievements
               FROM users u
               LEFT JOIN scores       s ON s.user_id = u.id
               LEFT JOIN achievements a ON a.user_id = u.id
               GROUP BY u.id ORDER BY u.registered_at DESC'''
        ).fetchall()
        return [dict(r) for r in rows]


def get_sessions_log(limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            '''SELECT username, action, ip_address, logged_at
               FROM sessions_log ORDER BY logged_at DESC LIMIT ?''',
            (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


def get_all_scores(limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            '''SELECT username, game, score, moves, duration, difficulty, played_at
               FROM scores ORDER BY played_at DESC LIMIT ?''',
            (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


def reset_all_scores():
    with get_conn() as conn:
        conn.execute('DELETE FROM scores')
        conn.execute('DELETE FROM achievements')
