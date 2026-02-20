import { jsonResp, getSessionUser } from './utils.js';

export async function handleUpload(request, env) {
  const user = await getSessionUser(env, request);
  if (!user) return jsonResp({ error: 'Not authenticated' }, 401);
  if (!env.GOOGLE_SCRIPT_URL) return jsonResp({ error: 'Upload not configured' }, 500);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return jsonResp({ error: 'No file provided' }, 400);

    const buffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const mimeType = file.type || 'image/jpeg';
    const fileName = file.name || `upload_${Date.now()}.jpg`;
    const folderId = env.DRIVE_FOLDER_ID || '1p7TiaPjqEPGIBxFMUEwqIGwTi81HA15r';

    const res = await fetch(env.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'uploadPhoto', fileName, mimeType, base64, folderId }),
    });
    const data = await res.json();

    if (data.url || data.fileUrl) {
      return jsonResp({ url: data.url || data.fileUrl });
    }
    return jsonResp({ error: data.error || 'Upload failed' }, 500);
  } catch (e) {
    return jsonResp({ error: 'Upload error: ' + e.message }, 500);
  }
}
