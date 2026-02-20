import { jsonResp, getSessionUser, sendEmail } from './utils.js';

export async function handleAdmin(request, env, pathname, method) {
  if (pathname === '/api/admin/users'  && method === 'GET')  return listUsers(request, env);
  if (pathname === '/api/admin/update' && method === 'POST') return updateUser(request, env);
  return jsonResp({ error: 'Not found' }, 404);
}

async function listUsers(request, env) {
  const user = await getSessionUser(env, request);
  if (!user || user.role !== 'admin') return jsonResp({ error: 'Unauthorized' }, 403);
  const list = await env.ASM_KV.list({ prefix: 'user:' });
  const users = [];
  for (const key of list.keys) {
    const u = await env.ASM_KV.get(key.name, { type: 'json' });
    if (u) users.push({
      name: u.name, email: u.email, role: u.role,
      createdAt: u.createdAt, leaderSince: u.leaderSince,
    });
  }
  return jsonResp({ users });
}

async function updateUser(request, env) {
  const user = await getSessionUser(env, request);
  if (!user || user.role !== 'admin') return jsonResp({ error: 'Unauthorized' }, 403);
  const { email, role } = await request.json();
  if (!email || !['approved', 'pending', 'admin', 'leader'].includes(role)) {
    return jsonResp({ error: 'Invalid request' }, 400);
  }
  const target = await env.ASM_KV.get(`user:${email.toLowerCase()}`, { type: 'json' });
  if (!target) return jsonResp({ error: 'User not found' }, 404);
  const wasApproved = target.role === 'pending' && role !== 'pending';
  target.role = role;
  await env.ASM_KV.put(`user:${email.toLowerCase()}`, JSON.stringify(target));
  if (wasApproved) {
    await sendEmail(env, {
      to: target.email,
      subject: 'ASM Roster — Your account has been approved!',
      html: `<div style="font-family:sans-serif;padding:24px;background:#0a0a0f;color:#f0f0f8">
        <h2 style="color:#f5c842">You're in!</h2>
        <p>Hi ${target.name}, your account has been approved. Welcome to the team!</p>
        <a href="https://anthemstudents.org" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#f5c842;color:#000;border-radius:8px;text-decoration:none;font-weight:bold">Go to ASM Roster →</a>
      </div>`,
    });
  }
  return jsonResp({ success: true });
}
