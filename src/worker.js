/**
 * ASM 2026 Roster — Cloudflare Worker
 * Worship Grow Go · Anthem Students
 *
 * REQUIRED KV NAMESPACE BINDING:  ASM_KV
 * REQUIRED SECRETS:
 *   SITE_PASSWORD      (e.g. "Give em Jesus")
 *   ADMIN_EMAIL        (your email)
 *   GOOGLE_SCRIPT_URL  (Apps Script web app URL)
 *   MAILCHANNELS_FROM  (noreply@anthemstudents.org)
 *   DRIVE_FOLDER_ID    (1p7TiaPjqEPGIBxFMUEwqIGwTi81HA15r)
 */

import { handleAuth }         from './api/auth.js';
import { handleSheet }        from './api/sheet.js';
import { handleAdmin }        from './api/admin.js';
import { handleInteractions } from './api/interactions.js';
import { handleActivity }     from './api/activity.js';
import { handleBrainDump }    from './api/brainDump.js';
import { handleUpload }       from './api/upload.js';
import { getHTML }            from './html/index.js';
import { MANIFEST }           from './html/manifest.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // ── CORS preflight ──────────────────────────────────────
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // ── PWA Manifest ────────────────────────────────────────
    if (pathname === '/manifest.json') {
      return new Response(MANIFEST, {
        headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    // ── Auth endpoints ───────────────────────────────────────
    if (pathname.startsWith('/api/auth/') || pathname.startsWith('/api/me') || pathname.startsWith('/api/profile')) {
      return handleAuth(request, env, pathname, method);
    }

    // ── Sheet endpoints ──────────────────────────────────────
    if (pathname.startsWith('/api/sheet/')) {
      return handleSheet(request, env, pathname, method);
    }

    // ── Admin endpoints ──────────────────────────────────────
    if (pathname.startsWith('/api/admin/')) {
      return handleAdmin(request, env, pathname, method);
    }

    // ── Interaction endpoints ────────────────────────────────
    if (pathname.startsWith('/api/student/')) {
      return handleInteractions(request, env, pathname, method);
    }

    // ── Activity feed ────────────────────────────────────────
    if (pathname.startsWith('/api/activity/')) {
      return handleActivity(request, env, pathname, method);
    }

    // ── Brain dump ───────────────────────────────────────────
    if (pathname === '/api/brain-dump' && method === 'POST') {
      return handleBrainDump(request, env);
    }

    // ── Photo upload ─────────────────────────────────────────
    if (pathname === '/api/upload-photo' && method === 'POST') {
      return handleUpload(request, env);
    }

    // ── Serve the app HTML ───────────────────────────────────
    return new Response(getHTML(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};
