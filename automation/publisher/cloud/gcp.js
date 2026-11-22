// Google Cloud helpers for the publisher job, REST only (no SDK), every call through an injected transport (tests use fakes).
// Sources (fetched 2026-11-22, excerpts in ../sources/gcp_*.txt):
//   Storage preconditions: JSON API ifGenerationMatch → 412 Precondition Failed when the generation differs (0 = must not exist).
//   V4 signed URL: canonical request → string-to-sign "GOOG4-RSA-SHA256\n<ts>\n<scope>\n<sha256(canonical)>" → RSA-SHA256 (IAM signBlob
//   allowed) → hex signature; X-Goog-Expires ≤ 604800 s (7 days).
//   Secrets: Cloud Run mounts Secret Manager versions as files; a volume always reads the latest version.
const crypto = require('crypto'), fs = require('fs');
const META = 'http://metadata.google.internal/computeMetadata/v1';
const GCS = 'https://storage.googleapis.com', IAM = 'https://iamcredentials.googleapis.com/v1', SM = 'https://secretmanager.googleapis.com/v1';

class Conflict extends Error { constructor(m) { super(m); this.conflict = true; } }

// service-account token from the Cloud Run metadata server (cached until 60 s before expiry); never logged
function metadataAuth(http) {
  let tok = null, exp = 0, email = null;
  return {
    async header() {
      if (!tok || Date.now() > exp - 60e3) {
        const r = await http('GET', `${META}/instance/service-accounts/default/token`, { headers: { 'Metadata-Flavor': 'Google' } });
        if (!r.ok) throw new Error(`metadata token HTTP ${r.status}`);
        tok = r.json.access_token; exp = Date.now() + r.json.expires_in * 1000;
      }
      return { Authorization: `Bearer ${tok}` };
    },
    async email() {
      if (!email) { const r = await http('GET', `${META}/instance/service-accounts/default/email`, { headers: { 'Metadata-Flavor': 'Google' } }); email = (r.text || (r.json && String(r.json)) || '').trim(); }
      return email;
    },
  };
}

function storage(http, auth, bucket) {
  const o = name => encodeURIComponent(name);
  return {
    bucket,
    async putBytes(name, buf, contentType) {                // derived technical files only (e.g. the JPEG cover for Instagram)
      const r = await http('POST', `${GCS}/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${o(name)}`, { headers: { ...(await auth.header()), 'Content-Type': contentType }, body: buf });
      if (!r.ok) throw new Error(`gcs putBytes ${name} HTTP ${r.status}`); return String(r.json.generation);
    },
    // → { json, generation } | null
    async getJSON(name) {
      const meta = await http('GET', `${GCS}/storage/v1/b/${bucket}/o/${o(name)}`, { headers: await auth.header() });
      if (meta.status === 404) return null;
      if (!meta.ok) throw new Error(`gcs meta ${name} HTTP ${meta.status}`);
      const r = await http('GET', `${GCS}/storage/v1/b/${bucket}/o/${o(name)}?alt=media&ifGenerationMatch=${meta.json.generation}`, { headers: await auth.header() });
      if (r.status === 412) throw new Conflict(`${name} changed while reading`);
      if (!r.ok) throw new Error(`gcs get ${name} HTTP ${r.status}`);
      return { json: r.json, generation: String(meta.json.generation) };
    },
    // compare-and-swap write: generation '0' = create only; returns the new generation; 412 → Conflict (someone else wrote)
    async putJSON(name, value, generation) {
      const url = `${GCS}/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${o(name)}&ifGenerationMatch=${generation}`;
      const r = await http('POST', url, { headers: { ...(await auth.header()), 'Content-Type': 'application/json' }, body: JSON.stringify(value, null, 1) });
      if (r.status === 412) throw new Conflict(`${name}: generation ${generation} is no longer current`);
      if (!r.ok) throw new Error(`gcs put ${name} HTTP ${r.status}`);
      return String(r.json.generation);
    },
    async del(name, generation) {
      const r = await http('DELETE', `${GCS}/storage/v1/b/${bucket}/o/${o(name)}?ifGenerationMatch=${generation}`, { headers: await auth.header() });
      if (r.status === 412) throw new Conflict(`${name} changed`); return r.ok || r.status === 404;
    },
    async list(prefix) {
      const r = await http('GET', `${GCS}/storage/v1/b/${bucket}/o?prefix=${o(prefix)}&fields=items(name,generation,md5Hash,size)`, { headers: await auth.header() });
      if (!r.ok) throw new Error(`gcs list HTTP ${r.status}`); return (r.json && r.json.items) || [];
    },
    async download(name, dest) {
      const r = await http('GET', `${GCS}/storage/v1/b/${bucket}/o/${o(name)}?alt=media`, { headers: await auth.header(), binary: true });
      if (!r.ok) throw new Error(`gcs download ${name} HTTP ${r.status}`);
      fs.writeFileSync(dest, r.buffer); return dest;
    },
  };
}

// ---------- V4 signed URL (GET) signed by the job's service account through IAM signBlob: no key file anywhere ----------
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
function v4Parts({ bucket, object, email, now = new Date(), expiresS = 3600, host = 'storage.googleapis.com' }) {
  if (expiresS > 604800) throw new Error('signed URL expiry cannot exceed 604800 s (7 days)');
  const ts = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'), day = ts.slice(0, 8);
  const scope = `${day}/auto/storage/goog4_request`;
  const path = `/${bucket}/${object.split('/').map(enc).join('/')}`;
  const q = { 'X-Goog-Algorithm': 'GOOG4-RSA-SHA256', 'X-Goog-Credential': `${email}/${scope}`, 'X-Goog-Date': ts, 'X-Goog-Expires': String(expiresS), 'X-Goog-SignedHeaders': 'host' };
  const query = Object.keys(q).sort().map(k => `${enc(k)}=${enc(q[k])}`).join('&');
  const canonical = ['GET', path, query, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const toSign = ['GOOG4-RSA-SHA256', ts, scope, crypto.createHash('sha256').update(canonical).digest('hex')].join('\n');
  return { canonical, toSign, base: `https://${host}${path}?${query}` };
}
async function signedUrl(opts, signBytes) {          // signBytes(Buffer) → Buffer (RSA-SHA256 signature)
  const p = v4Parts(opts), sig = await signBytes(Buffer.from(p.toSign));
  return { url: `${p.base}&X-Goog-Signature=${Buffer.from(sig).toString('hex')}`, expires_at: new Date((opts.now || new Date()).getTime() + (opts.expiresS || 3600) * 1000).toISOString() };
}
function iamSigner(http, auth) {
  return async bytes => {
    const email = await auth.email();
    const r = await http('POST', `${IAM}/projects/-/serviceAccounts/${encodeURIComponent(email)}:signBlob`, { headers: { ...(await auth.header()), 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: Buffer.from(bytes).toString('base64') }) });
    if (!r.ok) throw new Error(`signBlob HTTP ${r.status}`);
    return Buffer.from(r.json.signedBlob, 'base64');
  };
}

// ---------- secrets: mounted files (read) and Secret Manager addVersion (write, OAuth service only) ----------
const SECRET_DIR = process.env.WHYSCAPE_SECRET_DIR || '/secrets';
function readSecret(name, dir = SECRET_DIR) {
  const f = `${dir}/${name}/value`;
  if (!fs.existsSync(f)) return null;
  return fs.readFileSync(f, 'utf8').trim();
}
// runtime read through the Secret Manager API (job SA has secretAccessor): no volume mount (job volumes are root-owned while the image
// runs as non-root) and no deploy-time secret check, so a secret may stay empty until its step in the checklist. null = not set yet.
async function accessSecret(http, auth, project, secret, version = 'latest') {
  const r = await http('GET', `${SM}/projects/${project}/secrets/${secret}/versions/${version}:access`, { headers: await auth.header() });
  if (r.status === 404 || r.status === 400 || (r.json && r.json.error && /NOT_FOUND|FAILED_PRECONDITION/.test(r.json.error.status || ''))) return null;
  if (!r.ok) throw new Error(`Secret Manager access ${secret} HTTP ${r.status}`);
  return Buffer.from(r.json.payload.data, 'base64').toString('utf8').trim();
}
async function addSecretVersion(http, auth, project, secret, value) {
  const r = await http('POST', `${SM}/projects/${project}/secrets/${secret}:addVersion`, { headers: { ...(await auth.header()), 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: { data: Buffer.from(value).toString('base64') } }) });
  if (!r.ok) throw new Error(`Secret Manager addVersion HTTP ${r.status}`);
  return r.json.name.split('/').pop();                      // version number only
}

module.exports = { Conflict, metadataAuth, storage, v4Parts, signedUrl, iamSigner, readSecret, accessSecret, addSecretVersion, SECRET_DIR };
