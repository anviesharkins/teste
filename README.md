# Roblox Render Uploader

Sistema simples para subir modelos 3D para Roblox Open Cloud Assets API usando Render.

## Variáveis de ambiente no Render

- `ROBLOX_API_KEY`: sua chave da Roblox Open Cloud.
- `UPLOAD_PASSWORD`: uma senha criada por você para proteger o formulário de upload.
- `NODE_VERSION`: `20`

## Render

- Build Command: `npm install`
- Start Command: `npm start`

## Formatos aceitos

- `.glb` -> `model/gltf-binary`
- `.gltf` -> `model/gltf+json`
- `.fbx` -> `model/fbx`
- `.rbxm` / `.rbxmx` -> `model/x-rbxm`

Recomendado: `.glb` com as texturas embutidas.
