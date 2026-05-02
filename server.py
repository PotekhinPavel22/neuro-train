import os
from flask import Flask, send_from_directory
from database import init_db
from api import api

app = Flask(__name__, static_folder='.')

_key_file = os.path.join(os.path.dirname(__file__), '.secret_key')
if os.path.exists(_key_file):
    with open(_key_file) as f:
        app.secret_key = f.read().strip()
else:
    import secrets
    app.secret_key = secrets.token_hex(64)
    with open(_key_file, 'w') as f:
        f.write(app.secret_key)

app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE']   = os.environ.get('SECURE_COOKIES', 'false').lower() == 'true'
app.config['MAX_CONTENT_LENGTH']      = 64 * 1024

app.register_blueprint(api)

with app.app_context():
    init_db()


@app.after_request
def set_security_headers(resp):
    resp.headers['X-Content-Type-Options'] = 'nosniff'
    resp.headers['X-Frame-Options']         = 'DENY'
    resp.headers['Referrer-Policy']         = 'strict-origin-when-cross-origin'
    resp.headers['Permissions-Policy']      = 'geolocation=(), microphone=(), camera=()'
    resp.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
    if os.environ.get('SECURE_COOKIES', 'false').lower() == 'true':
        resp.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return resp


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/css/<path:f>')
def css(f):
    return send_from_directory('css', f)

@app.route('/js/<path:f>')
def js(f):
    return send_from_directory('js', f)

@app.route('/assets/<path:f>')
def assets(f):
    return send_from_directory('assets', f)

@app.route('/health')
def health():
    return {'status': 'ok'}


if __name__ == '__main__':
    port  = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    print(f'  Neuro Train → http://localhost:{port}')
    app.run(host='0.0.0.0', port=port, debug=debug)
