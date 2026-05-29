const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // Roblox Assets API: até 20 MB para esse tipo de upload
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

function readRobloxResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function checkPassword(req) {
  if (!UPLOAD_PASSWORD) return false;
  const received = req.body.password || req.headers['x-upload-password'];
  return received === UPLOAD_PASSWORD;
}

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.fbx': 'model/fbx',
    '.gltf': 'model/gltf+json',
    '.glb': 'model/gltf-binary',
    '.rbxm': 'model/x-rbxm',
    '.rbxmx': 'model/x-rbxm'
  };
  return map[ext] || null;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/upload', upload.single('modelFile'), async (req, res) => {
  try {
    if (!ROBLOX_API_KEY) {
      return res.status(500).json({ error: 'Configure ROBLOX_API_KEY nas variáveis de ambiente do Render.' });
    }

    if (!UPLOAD_PASSWORD) {
      return res.status(500).json({ error: 'Configure UPLOAD_PASSWORD nas variáveis de ambiente do Render.' });
    }

    if (!checkPassword(req)) {
      return res.status(401).json({ error: 'Senha de upload incorreta.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Envie um arquivo .glb, .gltf, .fbx, .rbxm ou .rbxmx.' });
    }

    const contentType = getContentType(req.file.originalname);
    if (!contentType) {
      return res.status(400).json({ error: 'Formato não aceito. Use .glb, .gltf, .fbx, .rbxm ou .rbxmx.' });
    }

    const displayName = String(req.body.displayName || '').trim();
    const description = String(req.body.description || '').trim();
    const creatorType = String(req.body.creatorType || 'userId');
    const creatorId = String(req.body.creatorId || '').trim();

    if (!displayName) {
      return res.status(400).json({ error: 'Digite um nome para o asset.' });
    }

    if (!/^\d+$/.test(creatorId)) {
      return res.status(400).json({ error: 'Creator ID precisa ser um número. Use seu User ID ou Group ID.' });
    }

    if (!['userId', 'groupId'].includes(creatorType)) {
      return res.status(400).json({ error: 'creatorType inválido.' });
    }

    const requestPayload = {
      assetType: 'Model',
      displayName,
      description,
      creationContext: {
        creator: {
          [creatorType]: creatorId
        }
      }
    };

    const form = new FormData();
    form.append('request', JSON.stringify(requestPayload));
    form.append('fileContent', new Blob([req.file.buffer], { type: contentType }), req.file.originalname);

    const robloxRes = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: {
        'x-api-key': ROBLOX_API_KEY
      },
      body: form
    });

    const text = await robloxRes.text();
    const data = readRobloxResponse(text);

    if (!robloxRes.ok) {
      return res.status(robloxRes.status).json({
        error: 'Roblox recusou o upload.',
        status: robloxRes.status,
        roblox: data
      });
    }

    res.json({
      ok: true,
      message: 'Upload enviado para a Roblox. Agora acompanhe a operação.',
      operation: data
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor.', details: err.message });
  }
});

app.get('/api/operation', async (req, res) => {
  try {
    if (!ROBLOX_API_KEY) {
      return res.status(500).json({ error: 'Configure ROBLOX_API_KEY nas variáveis de ambiente do Render.' });
    }

    const operationPath = String(req.query.path || '').trim();
    if (!operationPath.startsWith('operations/')) {
      return res.status(400).json({ error: 'Informe um path válido, exemplo: operations/abc123.' });
    }

    const robloxRes = await fetch(`https://apis.roblox.com/assets/v1/${operationPath}`, {
      headers: {
        'x-api-key': ROBLOX_API_KEY
      }
    });

    const text = await robloxRes.text();
    const data = readRobloxResponse(text);

    if (!robloxRes.ok) {
      return res.status(robloxRes.status).json({
        error: 'Não consegui consultar a operação na Roblox.',
        status: robloxRes.status,
        roblox: data
      });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor.', details: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
