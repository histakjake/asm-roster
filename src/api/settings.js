import { jsonResp, getSessionUser } from './utils.js';

const SETTINGS_KEY = 'settings:org';

const DEFAULT_SETTINGS = {
  ministryName: 'Anthem Students',
  campus: '',
  logoUrl: '',
  logoEnabled: false,
  gradeTabs: {
    hs: { label: 'High School', grades: [9, 10, 11, 12] },
    ms: { label: 'Middle School', grades: [6, 7, 8] },
  },
  meetingDay: 'sunday',
  weekStartsOn: 'sunday',
  tracking: {
    hangoutNotes: true,
    tags: false,
    birthdays: true,
    showGrade: true,
    school: true,
    age: true,
  },
  defaults: {
    newStudentStatus: 'new',
    autoArchive: false,
    autoArchiveWeeks: 8,
  },
  access: {
    mode: 'leaders-only',
    passcode: '',
    passcodePermissions: {
      viewRoster: true,
      viewAttendance: false,
      viewNotes: false,
      viewPrayer: false,
    },
  },
  appearance: {
    compactMode: false,
    stickyBottomTabs: true,
  },
};

export async function handleSettings(request, env, pathname, method) {
  // Public settings — no auth needed (for branding on gate screen)
  if (pathname === '/api/settings/public' && method === 'GET') {
    return getPublicSettings(env);
  }

  // All other settings routes require admin
  const user = await getSessionUser(env, request);
  if (!user || user.role !== 'admin') {
    return jsonResp({ error: 'Admin access required' }, 403);
  }

  if (pathname === '/api/settings' && method === 'GET') return getSettings(env);
  if (pathname === '/api/settings' && method === 'POST') return saveSettings(request, env);

  return jsonResp({ error: 'Not found' }, 404);
}

async function getSettings(env) {
  const stored = await env.ASM_KV.get(SETTINGS_KEY, { type: 'json' });
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  return jsonResp({ settings });
}

async function saveSettings(request, env) {
  const updates = await request.json();
  const current = await env.ASM_KV.get(SETTINGS_KEY, { type: 'json' }) || {};
  const merged = deepMerge(DEFAULT_SETTINGS, current, updates);
  await env.ASM_KV.put(SETTINGS_KEY, JSON.stringify(merged));
  return jsonResp({ success: true, settings: merged });
}

async function getPublicSettings(env) {
  const stored = await env.ASM_KV.get(SETTINGS_KEY, { type: 'json' });
  const s = { ...DEFAULT_SETTINGS, ...stored };
  return jsonResp({
    ministryName: s.ministryName,
    campus: s.campus,
    logoUrl: s.logoEnabled && s.logoUrl ? s.logoUrl : '',
    logoEnabled: s.logoEnabled,
    gradeTabs: s.gradeTabs,
    tracking: s.tracking,
    appearance: s.appearance,
    accessMode: s.access?.mode || 'leaders-only',
  });
}

function deepMerge(...sources) {
  const result = {};
  for (const src of sources) {
    if (!src) continue;
    for (const key of Object.keys(src)) {
      if (src[key] && typeof src[key] === 'object' && !Array.isArray(src[key])) {
        result[key] = deepMerge(result[key] || {}, src[key]);
      } else {
        result[key] = src[key];
      }
    }
  }
  return result;
}
