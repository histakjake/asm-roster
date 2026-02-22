import {
  jsonResp, cookieStr, getSessionUser,
  hashPassword, verifyPassword, generateToken, sendEmail, trackMetric,
} from './utils.js';

const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export async function handleAuth(request, env, pathname, method) {
  if (pathname === '/api/auth/passcode'        && method === 'POST') return passcodeLogin(request, env);
  if (pathname === '/api/auth/check-password'  && method === 'POST') return checkPassword(request, env);
  if (pathname === '/api/auth/signup'          && method === 'POST') return signup(request, env);
  if (pathname === '/api/auth/login'           && method === 'POST') return login(request, env);
  if (pathname === '/api/auth/logout'          && method === 'POST') return logout(request, env);
  if (pathname === '/api/me'                   && method === 'GET')  return me(request, env);
  if (pathname === '/api/profile/update'       && method === 'POST') return profileUpdate(request, env);
  return jsonResp({ error: 'Not found' }, 404);
}

// ── Lane A: time-limited passcode session (view-only) ────────
async function passcodeLogin(request, env) {
  let passcode = '';
  try { ({ passcode = '' } = await request.json()); } catch (_) {}

  // Check KV settings first, then fall back to env secret
  let correct = '';
  const settings = await env.ASM_KV.get('settings:org', { type: 'json' });
  if (settings?.access?.mode === 'shared-passcode' && settings.access.passcode) {
    correct = settings.access.passcode;
  } else {
    correct = env.SITE_PASSWORD || '';
  }
  if (!correct || !passcode) return jsonResp({ error: 'Invalid passcode' }, 401);

  // Timing-safe comparison
  const a = new TextEncoder().encode(passcode.padEnd(128));
  const b = new TextEncoder().encode(correct.padEnd(128));
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  if (d !== 0 || passcode.length !== correct.length) {
    return jsonResp({ error: 'Invalid passcode' }, 401);
  }

  const TTL = 8 * 60 * 60; // 8 hours in seconds
  const token = generateToken();
  const expiresAt = Date.now() + TTL * 1000;

  await env.ASM_KV.put(`session:${token}`, JSON.stringify({
    type: 'passcode',
    expiresAt,
  }), { expirationTtl: TTL });

  const expiresTime = new Date(expiresAt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  return new Response(JSON.stringify({
    ok: true,
    expiresAt,
    message: `View-only access until ${expiresTime}`,
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieStr('asm_session', token, TTL),
    },
  });
}

async function checkPassword(request, env) {
  const { password } = await request.json();
  let correct = '';
  const settings = await env.ASM_KV.get('settings:org', { type: 'json' });
  if (settings?.access?.mode === 'shared-passcode' && settings.access.passcode) {
    correct = settings.access.passcode;
  } else {
    correct = env.SITE_PASSWORD || 'Give em Jesus';
  }
  const a = new TextEncoder().encode(password.padEnd(128));
  const b = new TextEncoder().encode(correct.padEnd(128));
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return jsonResp({ ok: d === 0 && password.length === correct.length });
}

async function signup(request, env) {
  const { email, password, name } = await request.json();
  if (!email || !password || !name) return jsonResp({ error: 'All fields required' }, 400);
  if (password.length < 8) return jsonResp({ error: 'Password must be at least 8 characters' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResp({ error: 'Invalid email' }, 400);
  if (await env.ASM_KV.get(`user:${email.toLowerCase()}`)) return jsonResp({ error: 'Account already exists' }, 409);

  const user = {
    email: email.toLowerCase(), name,
    passwordHash: await hashPassword(password),
    role: 'pending',
    createdAt: new Date().toISOString(),
  };
  await env.ASM_KV.put(`user:${email.toLowerCase()}`, JSON.stringify(user));

  if (env.ADMIN_EMAIL) {
    await sendEmail(env, {
      to: env.ADMIN_EMAIL,
      subject: `ASM Roster — New signup: ${name}`,
      html: `<div style="font-family:sans-serif;padding:24px;background:#0a0a0f;color:#f0f0f8">
        <h2 style="color:#f5c842">New Signup</h2>
        <p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p>
        <a href="https://anthemstudents.org" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#f5c842;color:#000;border-radius:8px;text-decoration:none;font-weight:bold">Open Admin Panel →</a>
      </div>`,
    });
  }
  return jsonResp({ success: true, message: 'Account created! You will be notified once approved.' });
}

async function login(request, env) {
  const { email, password } = await request.json();
  if (!email || !password) return jsonResp({ error: 'Email and password required' }, 400);
  const user = await env.ASM_KV.get(`user:${email.toLowerCase()}`, { type: 'json' });
  if (!user || !await verifyPassword(password, user.passwordHash)) {
    return jsonResp({ error: 'Invalid email or password' }, 401);
  }
  if (user.role === 'pending') {
    return jsonResp({ error: 'Your account is pending approval.' }, 403);
  }

  const token = generateToken();
  await env.ASM_KV.put(
    `session:${token}`,
    JSON.stringify({ email: user.email, expiresAt: Date.now() + SESSION_TTL * 1000 }),
    { expirationTtl: SESSION_TTL }
  );

  await trackMetric(env, 'login');

  const safeUser = {
    name: user.name, email: user.email, role: user.role,
    photoUrl: user.photoUrl, leaderSince: user.leaderSince, funFact: user.funFact,
  };

  return new Response(JSON.stringify({ success: true, user: safeUser }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieStr('asm_session', token, SESSION_TTL),
    },
  });
}

async function logout(request, env) {
  const m = (request.headers.get('Cookie') || '').match(/asm_session=([a-f0-9]+)/);
  if (m) await env.ASM_KV.delete(`session:${m[1]}`);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieStr('asm_session', '', 0) },
  });
}

async function me(request, env) {
  const user = await getSessionUser(env, request);
  if (!user) return jsonResp({ user: null });
  await trackMetric(env, 'pageview');
  return jsonResp({
    user: {
      name: user.name, email: user.email, role: user.role,
      photoUrl: user.photoUrl || null, leaderSince: user.leaderSince || null,
      funFact: user.funFact || null, expiresAt: user.expiresAt || null,
    },
  });
}

async function profileUpdate(request, env) {
  const user = await getSessionUser(env, request);
  if (!user || !user.email) return jsonResp({ error: 'Not authenticated' }, 401);
  const updates = await request.json();
  const allowed = ['name', 'leaderSince', 'funFact', 'photoUrl'];
  allowed.forEach(k => { if (updates[k] !== undefined) user[k] = updates[k]; });
  await env.ASM_KV.put(`user:${user.email}`, JSON.stringify(user));
  return jsonResp({ success: true });
}
