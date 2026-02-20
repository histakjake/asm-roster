import { jsonResp, getSessionUser } from './utils.js';

export async function handleSheet(request, env, pathname, method) {
  if (pathname === '/api/sheet/read' && method === 'GET') return sheetRead(request, env);
  if (pathname === '/api/sheet/write' && method === 'GET') return sheetWrite(request, env);
  return jsonResp({ error: 'Not found' }, 404);
}

async function sheetRead(request, env) {
  if (!env.GOOGLE_SCRIPT_URL) return jsonResp({ error: 'GOOGLE_SCRIPT_URL not set' }, 500);
  try {
    const res = await fetch(env.GOOGLE_SCRIPT_URL + '?action=read');
    const text = await res.text();
    return new Response(text, { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return jsonResp({ error: 'Could not reach Google Sheet' }, 502);
  }
}

async function sheetWrite(request, env) {
  const user = await getSessionUser(env, request);
  if (!user || !['approved', 'admin', 'leader'].includes(user.role)) {
    return jsonResp({ error: 'Must be logged in and approved to edit.' }, 403);
  }
  if (!env.GOOGLE_SCRIPT_URL) return jsonResp({ error: 'GOOGLE_SCRIPT_URL not set' }, 500);
  try {
    const params = new URL(request.url).searchParams.toString();
    const res = await fetch(env.GOOGLE_SCRIPT_URL + '?' + params);
    const text = await res.text();
    return new Response(text, { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return jsonResp({ error: 'Could not reach Google Sheet' }, 502);
  }
}
