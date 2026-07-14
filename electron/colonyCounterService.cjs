/**
 * Local FastAPI colony-counter service lifecycle for Electron.
 * Uses backend/colony_counter/.venv when present, else system python3/python.
 */
const { spawn } = require('child_process');
const { app } = require('electron');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');

function getBackendDir() {
  if (app?.isPackaged) {
    return path.join(process.resourcesPath, 'colony_counter');
  }
  return path.join(__dirname, '../backend/colony_counter');
}

function getPythonBin(backendDir) {
  const venvUnix = path.join(backendDir, '.venv', 'bin', 'python');
  const venvWin = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(venvUnix)) return venvUnix;
  if (fs.existsSync(venvWin)) return venvWin;
  return process.platform === 'win32' ? 'python' : 'python3';
}

let child = null;
let port = null;
let starting = null;

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const p = typeof addr === 'object' && addr ? addr.port : 0;
      server.close((err) => (err ? reject(err) : resolve(p)));
    });
    server.on('error', reject);
  });
}

function httpGetJson(url, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', (c) => {
        body += c;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(body) });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

async function waitForHealth(p, attempts = 40) {
  const url = `http://127.0.0.1:${p}/health`;
  for (let i = 0; i < attempts; i++) {
    try {
      const { status, json } = await httpGetJson(url, 800);
      if (status === 200 && json?.status === 'ok') return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function ensureColonyService() {
  if (port && child && !child.killed) {
    try {
      const { status } = await httpGetJson(`http://127.0.0.1:${port}/health`, 800);
      if (status === 200) return { port, baseUrl: `http://127.0.0.1:${port}` };
    } catch {
      stopColonyService();
    }
  }

  if (starting) return starting;

  starting = (async () => {
    const backendDir = getBackendDir();
    if (!fs.existsSync(path.join(backendDir, 'main.py'))) {
      throw new Error(
        'Colony Auto Count backend not found. Expected backend/colony_counter/main.py'
      );
    }

    const python = getPythonBin(backendDir);
    const p = await findFreePort();
    const args = [
      '-m',
      'uvicorn',
      'main:app',
      '--host',
      '127.0.0.1',
      '--port',
      String(p),
      '--log-level',
      'warning',
    ];

    child = spawn(python, args, {
      cwd: backendDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderrBuf = '';
    child.stderr.on('data', (d) => {
      stderrBuf += d.toString();
      if (stderrBuf.length > 4000) stderrBuf = stderrBuf.slice(-2000);
    });
    child.on('exit', () => {
      child = null;
      port = null;
    });

    const ok = await waitForHealth(p);
    if (!ok) {
      const hint = stderrBuf.trim() || 'uvicorn failed to start';
      stopColonyService();
      throw new Error(
        `Colony Auto Count service failed to start. Install deps: ` +
          `cd backend/colony_counter && python3 -m venv .venv && ` +
          `.venv/bin/pip install -r requirements.txt\n\n${hint}`
      );
    }

    port = p;
    return { port, baseUrl: `http://127.0.0.1:${port}` };
  })();

  try {
    return await starting;
  } finally {
    starting = null;
  }
}

function stopColonyService() {
  if (child && !child.killed) {
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  child = null;
  port = null;
}

function multipartBody(parts, boundary) {
  const chunks = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\n`, 'utf8'));
    chunks.push(Buffer.from(part.headers + '\r\n\r\n', 'utf8'));
    chunks.push(Buffer.isBuffer(part.body) ? part.body : Buffer.from(String(part.body), 'utf8'));
    chunks.push(Buffer.from('\r\n', 'utf8'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));
  return Buffer.concat(chunks);
}

function postMultipart(pathName, body, boundary, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: pathName,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => {
          chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
        });
        res.on('end', () => {
          let json;
          try {
            json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          } catch {
            reject(new Error(`Invalid response from colony service (${res.statusCode})`));
            return;
          }
          if (res.statusCode >= 400) {
            const detail = json.detail;
            const msg =
              typeof detail === 'string'
                ? detail
                : Array.isArray(detail)
                  ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
                  : json.message || `HTTP ${res.statusCode}`;
            reject(new Error(msg));
            return;
          }
          resolve(json);
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Colony count request timed out'));
    });
    req.write(body);
    req.end();
  });
}

/**
 * @param {Buffer} imageBuffer
 * @param {string} filename
 * @param {object} maskSpec required mask { type, ... }
 * @param {boolean} [debug]
 */
async function countColonies(imageBuffer, filename = 'plate.png', maskSpec, debug = false) {
  if (!maskSpec || typeof maskSpec !== 'object') {
    throw new Error('A counting mask is required');
  }
  await ensureColonyService();
  const boundary = `----BenchyBoundary${Date.now()}`;
  const body = multipartBody(
    [
      {
        headers:
          `Content-Disposition: form-data; name="image"; filename="${filename}"\r\n` +
          `Content-Type: application/octet-stream`,
        body: imageBuffer,
      },
      {
        headers: `Content-Disposition: form-data; name="mask"`,
        body: JSON.stringify(maskSpec),
      },
    ],
    boundary
  );
  const pathName = debug ? '/api/count-colonies?debug=true' : '/api/count-colonies';
  // Ensemble multi-scale pass can take 30–90s+ on large plates; debug adds stage encode.
  return postMultipart(pathName, body, boundary, debug ? 300000 : 180000);
}

async function suggestDish(imageBuffer, filename = 'plate.png') {
  await ensureColonyService();
  const boundary = `----BenchyBoundary${Date.now()}`;
  const body = multipartBody(
    [
      {
        headers:
          `Content-Disposition: form-data; name="image"; filename="${filename}"\r\n` +
          `Content-Type: application/octet-stream`,
        body: imageBuffer,
      },
    ],
    boundary
  );
  return postMultipart('/api/suggest-dish', body, boundary, 30000);
}

function sanitizeFixtureName(name) {
  const raw = String(name || 'plate')
    .replace(/\.[^.]+$/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return raw || `plate-${Date.now().toString(36)}`;
}

/**
 * Write a ground-truth fixture for the accuracy harness.
 * @param {{ imageBase64: string, plateName?: string, count: number, mask: object, density: string, notes?: string }} payload
 */
function saveGroundTruthFixture(payload) {
  const { imageBase64, plateName, count, mask, density, notes } = payload || {};
  if (!imageBase64) throw new Error('Missing image data');
  if (!mask || typeof mask !== 'object') throw new Error('Missing mask');
  if (!Number.isFinite(Number(count)) || Number(count) < 0) {
    throw new Error('Invalid marker count');
  }
  const dens = ['sparse', 'moderate', 'dense', 'mixed'].includes(density)
    ? density
    : 'moderate';

  const fixturesRoot = path.join(getBackendDir(), 'tests', 'fixtures');
  const folderName = sanitizeFixtureName(plateName);
  const dir = path.join(fixturesRoot, folderName);
  fs.mkdirSync(dir, { recursive: true });

  const imagePath = path.join(dir, 'image.png');
  const truthPath = path.join(dir, 'truth.json');
  fs.writeFileSync(imagePath, Buffer.from(imageBase64, 'base64'));

  const truth = {
    count: Math.floor(Number(count)),
    density: dens,
    mask,
    notes: notes || 'Manual count from Benchy Colony Counter',
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync(truthPath, `${JSON.stringify(truth, null, 2)}\n`, 'utf8');

  return {
    folder: dir,
    folderName,
    imagePath,
    truthPath,
    relativePath: path.join('tests', 'fixtures', folderName),
  };
}

module.exports = {
  ensureColonyService,
  stopColonyService,
  countColonies,
  suggestDish,
  saveGroundTruthFixture,
  getBackendDir,
};
