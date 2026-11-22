// Whyscape publisher — shared core: per-episode state (idempotency), transport with error classification, time, redaction, creator inputs.
// Design rules (automation/publisher/README.md):
//   1. Intent is written to the state file BEFORE every create call; the remote ID is written the moment it is known.
//   2. A create call whose outcome is unknown (timeout, reset, 5xx after the body was sent) puts the platform in AMBIGUOUS:
//      no automatic retry. Only a reconcile that finds exactly one matching remote object (adopt it) or a recorded creator
//      instruction may move it on.
//   3. A platform already SCHEDULED/PUBLISHED is only ever read back, never re-created.
//   4. Editorial material comes verbatim from the creator's files; only technical formatting/conversion is done and recorded.
//   5. Tokens are never logged, written to state, or printed: everything leaving this module goes through redact().
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');

// ---------- time (Asia/Jakarta = UTC+7, no DST) ----------
function parseWIB(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::00)?(?:\s*(?:WIB|\+07:00))?$/); if (!m) return null;
  const [, Y, Mo, D, h, mi] = m.map(Number), d = new Date(Date.UTC(Y, Mo - 1, D, h - 7, mi)), b = new Date(d.getTime() + 7 * 3600e3);
  return b.getUTCFullYear() === Y && b.getUTCMonth() === Mo - 1 && b.getUTCDate() === D && h < 24 && mi < 60 ? d : null;
}
const wibString = d => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'long' }).format(d);
const wibISO = d => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 19) + '+07:00';
const timeEvidence = d => ({ utc: d.toISOString(), unix: Math.floor(d / 1000), asia_jakarta: wibISO(d), human: wibString(d) });

// ---------- redaction ----------
const SECRET_KEYS = /^(access_token|token|refresh_token|client_secret|authorization|upload_url|session_uri|code|password)$/i;
function redact(v) {
  if (typeof v === 'string') return v.replace(/(access_token|token|key|upload_id|code)=([^&\s"]+)/gi, '$1=<redacted>').replace(/Bearer\s+[\w.\-~+/]+=*/gi, 'Bearer <redacted>').replace(/\bEAA[A-Za-z0-9]{20,}\b/g, '<redacted>').replace(/\bya29\.[\w.\-]+/g, '<redacted>');
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET_KEYS.test(k) ? '<redacted>' : redact(x)]));
  return v;
}

// ---------- per-episode state ----------
const PLATFORM_STATES = ['NOT_STARTED', 'BLOCKED', 'CREATING', 'AMBIGUOUS', 'FAILED_DEFINITE', 'CREATED', 'SCHEDULED', 'PUBLISHED'];
class State {
  constructor(file, episodeId) { this.file = file; this.data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { schema: 1, episode: episodeId, platforms: {} }; }
  p(name) { return this.data.platforms[name] || (this.data.platforms[name] = { state: 'NOT_STARTED', remote_id: null, url: null, history: [] }); }
  set(name, patch, event) {
    const p = this.p(name); if (patch.state && !PLATFORM_STATES.includes(patch.state)) throw new Error('bad state ' + patch.state);
    Object.assign(p, redact(patch)); p.history.push({ at: new Date().toISOString(), ...(redact(event || {})), state: p.state }); this.save(); return p;
  }
  // sidecar for values that must survive a restart but never go to git or logs (YouTube resumable session URI)
  local(key, val) {
    const f = this.file.replace(/\.json$/, '.local.json'), d = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
    if (val === undefined) return d[key] || null;
    if (val === null) delete d[key]; else d[key] = val;
    fs.writeFileSync(f, JSON.stringify(d), { mode: 0o600 }); return val;
  }
  save() { fs.mkdirSync(path.dirname(this.file), { recursive: true }); const tmp = this.file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2) + '\n'); fs.renameSync(tmp, this.file); }   // atomic
}

// ---------- transport: classify failures so the caller knows whether a request may have had an effect ----------
// returns { ok, status, json, text, headers } or throws TransportError { kind: 'not_sent' | 'ambiguous', detail }
class TransportError extends Error { constructor(kind, detail) { super(`${kind}: ${detail}`); this.kind = kind; this.detail = detail; } }
const NOT_SENT_CODES = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNABORTED_BEFORE', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'];
function makeTransport({ timeoutMs = 120000, fetchImpl = globalThis.fetch } = {}) {
  return async function http(method, url, { headers = {}, body } = {}) {
    const ac = new AbortController(), timer = setTimeout(() => ac.abort(), timeoutMs);
    let res;
    try { res = await fetchImpl(url, { method, headers, body, signal: ac.signal }); }
    catch (e) {
      clearTimeout(timer);
      const code = (e.cause && (e.cause.code || e.cause.name)) || e.code || e.name;
      const chain = [e, e.cause, e.cause && e.cause.cause].filter(Boolean).map(x => `${x.code || ''} ${x.message || ''}`).join(' | ');
      // egress proxy refused the CONNECT tunnel (undici: 'Proxy response (403) !== 200 when HTTP Tunneling'): never reached the platform
      if (/Proxy response \(\d+\) !== 200 when HTTP Tunneling/.test(chain)) throw new TransportError('not_sent', `proxy refused the tunnel: ${chain}`);
      // the egress proxy refusing CONNECT, DNS failures, refused connections: the request never reached the platform
      if (NOT_SENT_CODES.includes(code) || /CONNECT|tunnel|403 Forbidden \(agent proxy/i.test(String(e.cause && e.cause.message || e.message))) throw new TransportError('not_sent', `${code || ''} ${e.message}`);
      throw new TransportError('ambiguous', `${code || ''} ${e.message}`);     // timeout / reset: it may have arrived
    }
    clearTimeout(timer);
    if (arguments[2] && arguments[2].binary && res.ok) return { ok: true, status: res.status, buffer: Buffer.from(await res.arrayBuffer()), headers: Object.fromEntries(res.headers.entries()) };
    const text = await res.text(); let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    return { ok: res.ok, status: res.status, json, text: json ? undefined : text.slice(0, 500), headers: Object.fromEntries(res.headers.entries()) };
  };
}
// a create call's HTTP result: 2xx = done, 4xx (except 408/409/429) = definitely rejected, else ambiguous
const createOutcome = r => r.ok ? 'done' : (r.status >= 400 && r.status < 500 && ![408, 409, 429].includes(r.status)) ? 'rejected' : 'ambiguous';

// ---------- creator materials (verbatim) ----------
function section(body, name) { const m = body.match(new RegExp(`^##\\s+${name}\\s*\\n([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))`, 'mi')); return m ? m[1].replace(/^>.*$/gm, '').trim() : null; }
function readPost(file) {
  const raw = fs.readFileSync(file, 'utf8'), fmm = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n/), fm = {};
  if (fmm) for (const l of fmm[1].split('\n')) { const i = l.indexOf(':'); if (i > 0) fm[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); }
  const body = fmm ? raw.slice(fmm[0].length) : raw;
  const title = fm.title || (section(body, 'Judul') || '').split('\n')[0].trim() || null;
  const caption = section(body, 'Caption'), hashtags = ((section(body, 'Hashtags?') || '').match(/#[\p{L}\p{N}_]+/gu) || []);
  return { sha256: sha256(file), title, caption, hashtags, text: caption && hashtags.length ? `${caption}\n\n${hashtags.join(' ')}` : caption,
    episode: fm.episode || (body.match(/^#\s+POST\s*[—–-]\s*(\S+)/mi) || [])[1] || null,
    publish_at: fm.publish_at || ((section(body, 'Jadwal(?: tayang)?') || '').match(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/) || [])[0] || null,
    platforms: (fm.platforms || section(body, 'Platforms?') || '').split(/[,\n]+/).map(s => s.replace(/^[-*]\s*/, '').trim().toLowerCase()).filter(Boolean) };
}
const sha256 = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const md5 = f => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
function probe(file) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', file]).toString());
  const v = j.streams.find(s => s.codec_type === 'video') || {};
  return { duration: +(+j.format.duration).toFixed(3), size: +j.format.size, width: v.width, height: v.height, codec: v.codec_name, fps: v.r_frame_rate };
}
// technical format conversion of the creator's thumbnail (pixels kept, no crop/redesign); recorded in the report
function convertImage(src, dest, fmt) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, ...(fmt === 'jpeg' ? ['-q:v', '2'] : []), '-frames:v', '1', dest]);
  return { from: path.basename(src), from_sha256: sha256(src), to: dest, to_sha256: sha256(dest), format: fmt, note: 'konversi format teknis saja (tanpa crop/ubah desain)' };
}

module.exports = { parseWIB, wibISO, wibString, timeEvidence, redact, State, PLATFORM_STATES, TransportError, makeTransport, createOutcome, readPost, section, sha256, md5, probe, convertImage };
