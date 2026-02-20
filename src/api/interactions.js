import { jsonResp, getSessionUser } from './utils.js';

export async function handleInteractions(request, env, pathname, method) {
  if (pathname === '/api/student/interactions' && method === 'GET')  return getInteractions(request, env);
  if (pathname === '/api/student/interactions' && method === 'POST') return postInteraction(request, env);
  return jsonResp({ error: 'Not found' }, 404);
}

async function getInteractions(request, env) {
  const url = new URL(request.url);
  const sk      = url.searchParams.get('sk');
  const section = url.searchParams.get('section');
  const index   = url.searchParams.get('index');
  const key = `interactions:${sk}:${section}:${index}`;
  const data = await env.ASM_KV.get(key, { type: 'json' });
  return jsonResp({ interactions: data || [] });
}

async function postInteraction(request, env) {
  const user = await getSessionUser(env, request);
  if (!user || !['approved', 'admin', 'leader'].includes(user.role)) {
    return jsonResp({ error: 'Unauthorized' }, 403);
  }

  const body = await request.json();
  const { sk, section, index, interaction, rowIndex, studentName } = body;

  // 1. Store interaction list in KV keyed by student
  const kvKey = `interactions:${sk}:${section}:${index}`;
  const existing = (await env.ASM_KV.get(kvKey, { type: 'json' })) || [];
  existing.push(interaction);
  await env.ASM_KV.put(kvKey, JSON.stringify(existing));

  // 2. Store in global activity feed (keyed by timestamp for ordering)
  const actKey = `activity:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
  await env.ASM_KV.put(
    actKey,
    JSON.stringify({ ...interaction, studentName: studentName || '', sk, section, index, rowIndex }),
    { expirationTtl: 90 * 24 * 60 * 60 } // 90 days
  );

  // 3. Sync to Google Sheet (fire and forget)
  if (env.GOOGLE_SCRIPT_URL && rowIndex !== undefined) {
    try {
      const params = new URLSearchParams({
        action: 'addInteraction',
        payload: JSON.stringify({ sheet: sk, rowIndex, interaction }),
      });
      env.ASM_KV && fetch(env.GOOGLE_SCRIPT_URL + '?' + params).catch(() => {});
    } catch (e) {}
  }

  return jsonResp({ success: true });
}
