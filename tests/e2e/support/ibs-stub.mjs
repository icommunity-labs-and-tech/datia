import http from 'node:http';
import { createHash, randomUUID } from 'node:crypto';

// Stand-in for the iBS API, for the e2e only. It answers the endpoints the app
// calls, with the shapes iBS sends, and exposes control routes so a test can
// decide how a KYC or a certification ends.

const PORT = Number(process.env.IBS_STUB_PORT ?? 4010);
const signatures = new Map(); // id -> status
const evidences = new Map(); // id -> { status, files, certification }

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data ? JSON.parse(data) : {}));
  });

// iBS publishes, per file, base64(SHA-512(bytes)); the app compares it with its own.
const integrityFor = (files) =>
  files.map((f) => ({
    name: f.name,
    type: 'file',
    algorithm: 'SHA-512',
    checksum: createHash('sha512').update(Buffer.from(f.file, 'base64')).digest('base64'),
    encoding: 'base64.standard',
  }));

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://stub');

  if (req.method === 'GET' && pathname === '/health') return send(res, 200, { ok: true });

  if (req.method === 'POST' && pathname.startsWith('/__control/signature/')) {
    const id = decodeURIComponent(pathname.split('/')[3]);
    const { status } = await readBody(req);
    signatures.set(id, status);
    return send(res, 200, { id, status });
  }

  if (req.method === 'POST' && pathname === '/__control/certify-waiting') {
    const certified = [];
    for (const [id, ev] of evidences) {
      if (ev.status !== 'waiting') continue;
      ev.status = 'certified';
      ev.certification = {
        timestamp: new Date().toISOString(),
        hash: `0x${createHash('sha256').update(id).digest('hex')}`,
        network: 'e2e-chain',
        links: { checker: `https://checker.stub/${id}`, block_explorer: `https://explorer.stub/tx/${id}` },
      };
      certified.push(id);
    }
    return send(res, 200, { evidence_ids: certified });
  }

  if (req.method === 'POST' && pathname === '/v2/signatures') {
    await readBody(req);
    const id = `sig_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    signatures.set(id, 'created');
    return send(res, 200, { signature_id: id, url: `https://kyc.stub/wizard/${id}` });
  }

  if (pathname.startsWith('/v2/signatures/')) {
    const id = decodeURIComponent(pathname.split('/')[3]);
    if (req.method === 'PUT') return send(res, 200, { url: `https://kyc.stub/wizard/${id}` });
    // iBS answers 200 with an empty body for an id it does not know.
    if (!signatures.has(id)) return send(res, 200, {});
    return send(res, 200, { id, status: signatures.get(id) });
  }

  if (req.method === 'POST' && pathname === '/v2/evidences') {
    const body = await readBody(req);
    const id = `evd_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    evidences.set(id, { status: 'waiting', files: body?.payload?.files ?? [] });
    return send(res, 200, { evidence_id: id });
  }

  if (req.method === 'GET' && pathname.startsWith('/v2/evidences/')) {
    const id = decodeURIComponent(pathname.split('/')[3]);
    const ev = evidences.get(id);
    if (!ev) return send(res, 404, { error: 'not found' });
    return send(res, 200, {
      id,
      status: ev.status,
      payload: { integrity: integrityFor(ev.files) },
      certification: ev.certification,
    });
  }

  send(res, 404, { error: 'unknown route', path: pathname });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`iBS double on http://127.0.0.1:${PORT}`);
});
