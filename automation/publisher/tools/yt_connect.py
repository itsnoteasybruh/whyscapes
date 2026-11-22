"""Whyscape — YouTube connection check (run on the creator's Windows PC). READ ONLY: uploads, schedules and publishes nothing.

  python yt_connect.py --client-secret "C:\\Users\\User\\Downloads\\client_secret_XXXX.json" [--with-readonly] [--revoke]

What it does
  1. Reads the OAuth client JSON of type "Desktop app" ("installed") from the path you give. The file stays where it is.
  2. Opens your browser at Google's consent screen (OAuth 2.0 for installed apps: loopback redirect http://127.0.0.1:<random port>/,
     PKCE S256, random state). Scope requested: youtube.upload only — or youtube.upload + youtube.readonly with --with-readonly.
  3. Exchanges the code for a token IN MEMORY and makes ONE read call: GET youtube/v3/channels?part=id,snippet&mine=true.
  4. Prints only: channel name, channel ID, the scopes Google granted, token lifetime. Never a token, code, or secret.
  5. Saves NOTHING to disk. With --revoke the grant is revoked at Google at the end (you will see the consent screen again next time).

Why --with-readonly may be needed
  The channels.list reference does not list a per-method scope, and it is not verified that a token with ONLY youtube.upload may read
  "my channel". If Google answers 403 (insufficient scopes), this script stops and explains; re-run with --with-readonly to add the
  read-only scope https://www.googleapis.com/auth/youtube.readonly (view your account, cannot change or upload anything).

Safety guards
  - Refuses a client JSON located inside a git working tree (so it cannot be committed by accident).
  - Accepts only "installed" (Desktop app) clients; listens on 127.0.0.1 only; checks the state value; times out after 5 minutes.
Python 3.9+ standard library only. On Windows set PYTHONUTF8=1 (see automation/publisher/tools/README_YT_CONNECT.md).
"""
import argparse, base64, hashlib, http.server, json, os, secrets, socket, sys, threading, urllib.error, urllib.parse, urllib.request, webbrowser

SCOPE_UPLOAD = 'https://www.googleapis.com/auth/youtube.upload'
SCOPE_READONLY = 'https://www.googleapis.com/auth/youtube.readonly'
CHANNELS = 'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true'
REVOKE = 'https://oauth2.googleapis.com/revoke'
TIMEOUT_S = 300


class Stop(Exception):
    """A clean, explained stop (no traceback, nothing secret in the message)."""


def inside_git_tree(path):
    d = os.path.dirname(os.path.abspath(path))
    while True:
        if os.path.exists(os.path.join(d, '.git')):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def load_client(path):
    if not os.path.isfile(path):
        raise Stop(f'File not found: {path}')
    repo = inside_git_tree(path)
    if repo:
        raise Stop(f'The client JSON is inside a git working tree ({repo}). Move it outside the repository (e.g. Downloads) and run again.')
    try:
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
    except Exception:
        raise Stop('The file is not valid JSON.')
    if 'installed' not in data:
        kind = next(iter(data), 'unknown')
        raise Stop(f'This is a "{kind}" OAuth client. Create an OAuth client of type "Desktop app" in Google Cloud Console and download its JSON.')
    c = data['installed']
    for k in ('client_id', 'auth_uri', 'token_uri'):
        if not c.get(k):
            raise Stop(f'The client JSON has no "{k}".')
    return c


def pkce_pair():
    verifier = secrets.token_urlsafe(64)[:96]                      # 43..128 chars of [A-Za-z0-9-._~]
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode('ascii')).digest()).rstrip(b'=').decode('ascii')
    return verifier, challenge


def free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def wait_for_code(port, expected_state, timeout=TIMEOUT_S):
    """Serve ONE redirect on 127.0.0.1:port and return the authorization code (or raise Stop)."""
    result = {}

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if 'state' not in q and 'error' not in q and 'code' not in q:
                self.send_response(404); self.end_headers(); return     # favicon etc.
            result.update({k: v[0] for k, v in q.items()})
            ok = 'code' in q and q.get('state', [''])[0] == expected_state
            self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.end_headers()
            msg = 'Koneksi diterima. Anda boleh menutup tab ini dan kembali ke terminal.' if ok else 'Otorisasi tidak selesai. Lihat pesan di terminal.'
            self.wfile.write(f'<html><body style="font-family:sans-serif"><h3>Whyscape YouTube check</h3><p>{msg}</p></body></html>'.encode('utf-8'))

        def log_message(self, *a):                                  # never echo the request line (it contains the code)
            pass

    srv = http.server.HTTPServer(('127.0.0.1', port), H)
    srv.timeout = 1
    deadline = threading.Event()
    t = threading.Timer(timeout, deadline.set); t.start()
    try:
        while not result and not deadline.is_set():
            srv.handle_request()
    finally:
        t.cancel(); srv.server_close()
    if not result:
        raise Stop(f'No answer from the browser within {timeout // 60} minutes.')
    if 'error' in result:
        raise Stop(f'Google returned "{result["error"]}" (consent refused or cancelled).')
    if result.get('state') != expected_state:
        raise Stop('State mismatch: the redirect did not come from this run. Nothing was used.')
    return result['code']


def post_form(url, fields):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(fields).encode(), headers={'Content-Type': 'application/x-www-form-urlencoded'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read() or b'{}')
        except Exception:
            body = {}
        return e.code, body


def get_json(url, access_token):
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {access_token}'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read() or b'{}')
        except Exception:
            body = {}
        return e.code, body


def safe_error(body):
    """Only Google's error reason/message — never echo request data."""
    err = body.get('error') if isinstance(body, dict) else None
    if isinstance(err, dict):
        reasons = [x.get('reason') for x in err.get('errors', []) if isinstance(x, dict)]
        return f"{err.get('code', '')} {err.get('status', '')} {', '.join(r for r in reasons if r)}: {err.get('message', '')}".strip()
    if isinstance(err, str):
        return f"{err}: {body.get('error_description', '')}"
    return 'unknown error'


def run(args, open_browser=webbrowser.open, wait=wait_for_code, post=post_form, get=get_json, out=print):
    client = load_client(args.client_secret)
    scopes = [SCOPE_UPLOAD] + ([SCOPE_READONLY] if args.with_readonly else [])
    verifier, challenge = pkce_pair()
    state = secrets.token_urlsafe(24)
    port = free_port()
    redirect = f'http://127.0.0.1:{port}/'
    url = client['auth_uri'] + '?' + urllib.parse.urlencode({
        'client_id': client['client_id'], 'redirect_uri': redirect, 'response_type': 'code', 'scope': ' '.join(scopes),
        'code_challenge': challenge, 'code_challenge_method': 'S256', 'state': state, 'access_type': 'online', 'prompt': 'consent'})
    out('Scope yang diminta : ' + ', '.join(s.rsplit('/', 1)[1] for s in scopes))
    out('Membuka browser untuk persetujuan Google (login dengan akun pemilik channel)...')
    if not open_browser(url):
        out('Browser tidak terbuka otomatis. Salin alamat berikut ke browser Anda (tidak mengandung token):')
        out(url)
    code = wait(port, state)
    fields = {'code': code, 'client_id': client['client_id'], 'redirect_uri': redirect, 'grant_type': 'authorization_code', 'code_verifier': verifier}
    if client.get('client_secret'):
        fields['client_secret'] = client['client_secret']
    status, tok = post(client['token_uri'], fields)
    if status != 200 or 'access_token' not in tok:
        raise Stop(f'Token exchange failed (HTTP {status}): {safe_error(tok)}')
    access = tok['access_token']
    granted = sorted(tok.get('scope', '').split())
    try:
        status, ch = get(CHANNELS, access)
        if status == 403 and ('insufficient' in json.dumps(ch).lower() or 'scope' in json.dumps(ch).lower()) and not args.with_readonly:
            raise Stop('Google menolak pemeriksaan channel karena scope youtube.upload saja tidak cukup untuk membaca channel Anda.\n'
                       'Untuk pemeriksaan baca, dibutuhkan scope tambahan youtube.readonly (melihat akun YouTube Anda; tidak bisa mengubah,\n'
                       'mengunggah, atau menghapus apa pun). Jika Anda setuju, jalankan ulang dengan --with-readonly.')
        if status != 200:
            raise Stop(f'Channel check failed (HTTP {status}): {safe_error(ch)}')
        items = ch.get('items') or []
        if not items:
            raise Stop('Akun ini terotorisasi, tetapi tidak memiliki channel YouTube.')
        out('')
        out('Terotorisasi  : YA (pemeriksaan baca saja; tidak ada video yang diunggah, dijadwalkan, atau dipublikasikan)')
        for c in items:
            out(f"Nama channel  : {c.get('snippet', {}).get('title', '?')}")
            out(f"ID channel    : {c.get('id', '?')}")
            if c.get('snippet', {}).get('customUrl'):
                out(f"Handle        : {c['snippet']['customUrl']}")
        out('Scope diberikan: ' + (', '.join(s.rsplit('/', 1)[1] for s in granted) or '(tidak dilaporkan)'))
        out(f"Token berlaku : ±{int(tok.get('expires_in', 0)) // 60} menit, hanya di memori proses ini; tidak disimpan ke disk")
        return items
    finally:
        if args.revoke:
            s, _ = post(REVOKE, {'token': access})
            out('Izin dicabut di Google.' if s == 200 else f'Pencabutan izin gagal (HTTP {s}); cabut manual di https://myaccount.google.com/permissions')
        access = None; tok.clear()


def main(argv=None):
    p = argparse.ArgumentParser(description='Whyscape: read-only YouTube connection check (no upload).')
    p.add_argument('--client-secret', required=True, help='path to the Desktop-app OAuth client JSON (outside any git repo)')
    p.add_argument('--with-readonly', action='store_true', help='also request youtube.readonly (only if the channel check needs it)')
    p.add_argument('--revoke', action='store_true', help='revoke the grant at Google after the check')
    args = p.parse_args(argv)
    try:
        run(args)
        return 0
    except Stop as e:
        print('\nBERHENTI: ' + str(e), file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print('\nDibatalkan.', file=sys.stderr)
        return 130


if __name__ == '__main__':
    sys.exit(main())
