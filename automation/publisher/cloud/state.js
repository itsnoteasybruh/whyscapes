// Persistent per-episode, per-platform state in Cloud Storage, with the SAME interface as core.State (p, set, local) so the platform
// adapters run unchanged. Durability rule: set() resolves only after the object is written with a generation precondition, so
// "intent before create" holds across machines; a concurrent writer causes a Conflict (412) and the run stops (never retries a create).
// Lease: one object per episode (locks/<ID>.json, created with ifGenerationMatch=0) so two executions (overlapping Scheduler runs,
// task retries) cannot work on the same episode; an expired lease is taken over with a generation precondition.
const { redact, PLATFORM_STATES } = require('../core');
const { Conflict } = require('./gcp');

class CloudState {
  constructor(store, episode) { this.store = store; this.episode = episode; this.name = `state/${episode}/publish_state.json`; this.localName = `state/${episode}/publish_state.local.json`; this.data = null; this.gen = '0'; }
  async load() {
    const r = await this.store.getJSON(this.name);
    this.data = r ? r.json : { schema: 1, episode: this.episode, platforms: {} }; this.gen = r ? r.generation : '0';
    return this;
  }
  p(name) { return this.data.platforms[name] || (this.data.platforms[name] = { state: 'NOT_STARTED', remote_id: null, url: null, history: [] }); }
  async set(name, patch, event) {
    if (patch.state && !PLATFORM_STATES.includes(patch.state)) throw new Error('bad state ' + patch.state);
    const p = this.p(name); Object.assign(p, redact(patch)); p.history.push({ at: new Date().toISOString(), ...(redact(event || {})), state: p.state });
    this.gen = await this.store.putJSON(this.name, this.data, this.gen);          // throws Conflict → caller stops
    return p;
  }
  // episode-level fields (e.g. verify_triggers), written with the same compare-and-swap
  async setTop(patch) { Object.assign(this.data, redact(patch)); this.gen = await this.store.putJSON(this.name, this.data, this.gen); return this.data; }
  // private sidecar (values that must never be logged, e.g. an upload session URI): same bucket, never part of reports
  async local(key, val) {
    const cur = await this.store.getJSON(this.localName), d = cur ? cur.json : {};
    if (val === undefined) return d[key] || null;
    if (val === null) delete d[key]; else d[key] = val;
    await this.store.putJSON(this.localName, d, cur ? cur.generation : '0'); return val;
  }
}

async function acquireLease(store, episode, holder, ttlS = 1800, now = () => Date.now()) {
  const name = `locks/${episode}.json`, body = { holder, until: new Date(now() + ttlS * 1000).toISOString() };
  try { const gen = await store.putJSON(name, body, '0'); return { name, gen, holder }; }
  catch (e) {
    if (!e.conflict) throw e;
    const cur = await store.getJSON(name);
    if (cur && new Date(cur.json.until).getTime() > now()) return null;          // held by another live execution
    try { const gen = await store.putJSON(name, body, cur ? cur.generation : '0'); return { name, gen, holder, took_over: cur && cur.json.holder }; }
    catch (e2) { if (e2.conflict) return null; throw e2; }
  }
}
async function releaseLease(store, lease) { if (lease) { try { await store.del(lease.name, lease.gen); } catch (e) { if (!e.conflict) throw e; } } }

module.exports = { CloudState, acquireLease, releaseLease, Conflict };
