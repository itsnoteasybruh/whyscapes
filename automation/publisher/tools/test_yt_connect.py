"""Tests for yt_connect.py — no network to Google (token/channel calls are mocked); the loopback server is real (127.0.0.1).
   python -m unittest automation/publisher/tools/test_yt_connect.py
"""
import base64, hashlib, json, os, re, sys, tempfile, threading, time, unittest, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import yt_connect as Y

FAKE_ACCESS = 'ya29.FAKE_ACCESS_TOKEN_NEVER_PRINTED_123456'
FAKE_CODE = '4/FAKE_AUTH_CODE_NEVER_PRINTED'


def client_file(kind='installed', where=None):
    d = where or tempfile.mkdtemp()
    p = os.path.join(d, 'client_secret_test.json')
    with open(p, 'w') as f:
        json.dump({kind: {'client_id': 'cid.apps.googleusercontent.com', 'client_secret': 'FAKE_CLIENT_SECRET', 'auth_uri': 'https://accounts.google.com/o/oauth2/auth', 'token_uri': 'https://oauth2.googleapis.com/token'}}, f)
    return p


class Args:
    def __init__(self, path, with_readonly=False, revoke=False):
        self.client_secret, self.with_readonly, self.revoke = path, with_readonly, revoke


class T(unittest.TestCase):
    def test_pkce_s256(self):
        v, c = Y.pkce_pair()
        self.assertTrue(43 <= len(v) <= 128 and re.fullmatch(r'[A-Za-z0-9\-._~]+', v))
        self.assertEqual(c, base64.urlsafe_b64encode(hashlib.sha256(v.encode()).digest()).rstrip(b'=').decode())

    def test_rejects_web_client_and_repo_location(self):
        with self.assertRaises(Y.Stop) as e:
            Y.load_client(client_file('web'))
        self.assertIn('Desktop app', str(e.exception))
        repo = tempfile.mkdtemp(); os.mkdir(os.path.join(repo, '.git')); sub = os.path.join(repo, 'x'); os.mkdir(sub)
        with self.assertRaises(Y.Stop) as e:
            Y.load_client(client_file(where=sub))
        self.assertIn('git working tree', str(e.exception))

    def _redirect(self, port, query):
        time.sleep(0.3)
        urllib.request.urlopen(f'http://127.0.0.1:{port}/?{query}', timeout=5).read()

    def test_loopback_server_returns_code_and_checks_state(self):
        port = Y.free_port()
        threading.Thread(target=self._redirect, args=(port, f'state=S1&code={FAKE_CODE}')).start()
        self.assertEqual(Y.wait_for_code(port, 'S1', timeout=10), FAKE_CODE)
        port = Y.free_port()
        threading.Thread(target=self._redirect, args=(port, 'state=WRONG&code=x')).start()
        with self.assertRaises(Y.Stop):
            Y.wait_for_code(port, 'S1', timeout=10)
        port = Y.free_port()
        threading.Thread(target=self._redirect, args=(port, 'state=S1&error=access_denied')).start()
        with self.assertRaises(Y.Stop) as e:
            Y.wait_for_code(port, 'S1', timeout=10)
        self.assertIn('access_denied', str(e.exception))

    def _run(self, channel_resp, with_readonly=False, revoke=False):
        out, posts, urls = [], [], []
        def post(url, fields):
            posts.append((url, dict(fields)))
            if url.endswith('/token'):
                self.assertEqual(fields['grant_type'], 'authorization_code'); self.assertIn('code_verifier', fields)
                return 200, {'access_token': FAKE_ACCESS, 'expires_in': 3599, 'scope': ' '.join([Y.SCOPE_UPLOAD] + ([Y.SCOPE_READONLY] if with_readonly else [])), 'token_type': 'Bearer'}
            return 200, {}
        def get(url, tok):
            self.assertEqual(tok, FAKE_ACCESS); self.assertIn('mine=true', url); return channel_resp
        def browser(url):
            urls.append(url); return True
        try:
            Y.run(Args(client_file(), with_readonly, revoke), open_browser=browser, wait=lambda port, state: FAKE_CODE, post=post, get=get, out=out.append)
            err = None
        except Y.Stop as e:
            err = str(e)
        printed = '\n'.join(out) + (err or '')
        for secret in (FAKE_ACCESS, FAKE_CODE, 'FAKE_CLIENT_SECRET'):
            self.assertNotIn(secret, printed)
        return out, err, posts, urls

    def test_success_prints_channel_only(self):
        out, err, posts, urls = self._run((200, {'items': [{'id': 'UCxyz', 'snippet': {'title': 'Whyscape', 'customUrl': '@whyscape'}}]}))
        self.assertIsNone(err)
        text = '\n'.join(out)
        self.assertIn('Nama channel  : Whyscape', text); self.assertIn('ID channel    : UCxyz', text)
        self.assertIn('youtube.upload', urls[0]); self.assertNotIn('youtube.readonly', urls[0])     # upload scope only by default
        self.assertIn('code_challenge_method=S256', urls[0]); self.assertIn('redirect_uri=http%3A%2F%2F127.0.0.1', urls[0])
        self.assertFalse(any(u.endswith('/revoke') for u, _ in posts))

    def test_insufficient_scope_explains_and_does_not_escalate(self):
        body = {'error': {'code': 403, 'message': 'Request had insufficient authentication scopes.', 'errors': [{'reason': 'insufficientPermissions'}], 'status': 'PERMISSION_DENIED'}}
        out, err, posts, urls = self._run((403, body))
        self.assertIn('--with-readonly', err); self.assertIn('youtube.readonly', err)
        self.assertEqual(len(urls), 1)                                                           # no second, wider consent on its own

    def test_with_readonly_and_revoke(self):
        out, err, posts, urls = self._run((200, {'items': [{'id': 'UC1', 'snippet': {'title': 'W'}}]}), with_readonly=True, revoke=True)
        self.assertIsNone(err); self.assertIn('youtube.readonly', urls[0])
        self.assertTrue(any(u.endswith('/revoke') for u, _ in posts)); self.assertIn('Izin dicabut di Google.', out)

    def test_never_writes_files(self):
        d = tempfile.mkdtemp(); before = set(os.listdir(d)); cwd = os.getcwd(); os.chdir(d)
        try:
            self._run((200, {'items': [{'id': 'UC1', 'snippet': {'title': 'W'}}]}))
        finally:
            os.chdir(cwd)
        self.assertEqual(set(os.listdir(d)), before)


if __name__ == '__main__':
    unittest.main()
