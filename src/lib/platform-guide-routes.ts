/**
 * Platform guide API — tour, progress, feedback, help chat.
 */
import type { Hono } from 'hono';
import { generateId } from './auth';
import {
  STAFF_PLATFORM_GUIDE_TOUR,
  CLIENT_PLATFORM_GUIDE_TOUR,
  PLATFORM_MISSION,
  PLATFORM_GUIDE_KNOWLEDGE,
  FEEDBACK_CATEGORIES,
} from '../engine/platform-guide';
import { generateOrgAiText, setOrgAiFreeOverride, getOrgAiCredits } from './platform-extensions';
import { isPlatformOwnerUser } from './platform-owner';

type RegisterOpts = { authMiddleware: any };

export function registerPlatformGuideRoutes(app: Hono<any>, opts: RegisterOpts) {
  const { authMiddleware } = opts;

  app.get('/api/platform-guide/tour', authMiddleware, async (c) => {
    const user = c.get('user');
    const steps = user.role === 'client' ? CLIENT_PLATFORM_GUIDE_TOUR : STAFF_PLATFORM_GUIDE_TOUR;
    return c.json({
      steps,
      stepCount: steps.length,
      mission: PLATFORM_MISSION,
      feedbackCategories: FEEDBACK_CATEGORIES,
      helpPage: 'platform-guide',
    });
  });

  app.get('/api/platform-guide/progress', authMiddleware, async (c) => {
    const user = c.get('user');
    const row = await c.env.DB.prepare(
      'SELECT tour_step, tour_completed, tour_dismissed, updated_at FROM user_guide_progress WHERE user_id = ?',
    ).bind(user.id).first() as any;
    const credits = await getOrgAiCredits(c.env.DB, user.org_id).catch(() => null);
    return c.json({
      progress: row || { tour_step: 0, tour_completed: 0, tour_dismissed: 0 },
      aiFreeOverride: !!(credits as any)?.freeAiOverride,
      mission: PLATFORM_MISSION,
    });
  });

  app.patch('/api/platform-guide/progress', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const tourStep = Math.max(0, Number(body.tourStep || 0));
    const tourCompleted = body.tourCompleted ? 1 : 0;
    const tourDismissed = body.tourDismissed ? 1 : 0;
    await c.env.DB.prepare(
      `INSERT INTO user_guide_progress (user_id, org_id, tour_step, tour_completed, tour_dismissed, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         tour_step = excluded.tour_step,
         tour_completed = excluded.tour_completed,
         tour_dismissed = excluded.tour_dismissed,
         updated_at = datetime('now')`,
    ).bind(user.id, user.org_id, tourStep, tourCompleted, tourDismissed).run();
    return c.json({ ok: true });
  });

  app.post('/api/platform-guide/feedback', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const text = String(body.body || body.message || '').trim();
    if (text.length < 8) return c.json({ error: 'Please describe your idea (at least 8 characters)' }, 400);
    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO platform_feedback (id, org_id, user_id, user_email, category, subject, body, integration_request, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
    ).bind(
      id,
      user.org_id,
      user.id,
      user.email || null,
      String(body.category || 'improvement').slice(0, 40),
      String(body.subject || '').slice(0, 200) || null,
      text.slice(0, 8000),
      body.integrationRequest ? String(body.integrationRequest).slice(0, 500) : null,
    ).run();
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(
      generateId(), user.org_id, user.id, 'platform_feedback',
      'User submitted platform feedback',
      JSON.stringify({ feedbackId: id, category: body.category || 'improvement' }),
    ).run().catch(() => {});
    return c.json({
      ok: true,
      id,
      message: 'Thank you — Smart FCRA reads every submission. We build this platform for operators like you.',
    });
  });

  app.post('/api/platform-guide/ask', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const message = String(body.message || '').trim().slice(0, 2000);
    if (!message) return c.json({ error: 'message required' }, 400);
    try {
      const result = await generateOrgAiText({
        env: c.env,
        orgId: user.org_id,
        userId: user.id,
        feature: 'platform_guide',
        messages: [
          { role: 'system', content: `${PLATFORM_GUIDE_KNOWLEDGE}\n\nUser role: ${user.role}. Answer where to click in Smart FCRA. Under 150 words.` },
          { role: 'user', content: message },
        ],
      });
      return c.json({
        reply: result.text,
        provider: result.provider,
        creditsCharged: result.creditsCharged ?? 0,
        freeOverride: !!(result as any).freeOverride,
      });
    } catch (e: any) {
      return c.json({
        reply: 'Open Help & Guide for the full tour, Product Map for every page, or submit feedback — our team will help. (AI temporarily unavailable.)',
        fallback: true,
        error: e.message,
      });
    }
  });

  app.get('/api/platform-guide/feedback', authMiddleware, async (c) => {
    const user = c.get('user');
    if (!isPlatformOwnerUser(user, c.env) && user.role !== 'super_admin') {
      return c.json({ error: 'Platform owner only' }, 403);
    }
    const rows = await c.env.DB.prepare(
      `SELECT id, org_id, user_email, category, subject, body, integration_request, status, created_at
       FROM platform_feedback ORDER BY created_at DESC LIMIT 100`,
    ).all().catch(() => ({ results: [] }));
    return c.json({ feedback: rows.results || [] });
  });

  /** Platform owner: grant org free platform AI (no credit charges). */
  app.put('/api/admin/organizations/:orgId/ai-free-override', authMiddleware, async (c) => {
    const user = c.get('user');
    if (!isPlatformOwnerUser(user, c.env)) return c.json({ error: 'Platform owner only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const enabled = body.enabled === true || body.enabled === 1 || body.enabled === 'true';
    await setOrgAiFreeOverride(c.env.DB, c.req.param('orgId'), enabled);
    return c.json({
      ok: true,
      orgId: c.req.param('orgId'),
      freeAiOverride: enabled,
      message: enabled
        ? 'Org granted free platform AI — Workers AI + cascade without credit charges.'
        : 'Free AI override removed — normal credit metering applies.',
    });
  });
}
