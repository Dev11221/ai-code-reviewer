'use strict';
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { z } = require('zod');
const router = express.Router();
const limits = require('../../middleware/rateLimits');
const { validate } = require('../../middleware/validate');
const { HttpError, wrap } = require('../../middleware/errors');
const { upsertUser, createSession, destroySession } = require('../../lib/session');
const { getConfig } = require('../../config/env');
const { randomToken } = require('../../lib/crypto');
const { setCookie, readCookie, clearCookie, NAMES } = require('../../lib/cookies');

// "Connect GitHub": the visitor pastes their own GitHub token. We verify it with
// GitHub, keep it encrypted, and give the browser a session cookie.
// (The optional OAuth-app flow was removed: it needed extra secrets and redirect
// handling that this deployment never used, and unused auth code is attack surface.)

const tokenBody = z.strictObject({
  token: z.string().trim().min(20, 'That does not look like a GitHub token.').max(400).regex(/^[A-Za-z0-9_]+$/, 'That does not look like a GitHub token.'),
});

router.post('/auth/github/token', limits.githubToken(), validate({ body: tokenBody }), wrap(async (req, res) => {
  const { token } = req.body;
  try {
    const { data: gh, headers } = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      timeout: 15000,
    });
    const scopes = headers['x-oauth-scopes']; // present for classic tokens only
    if (typeof scopes === 'string' && !scopes.split(',').map((s) => s.trim()).includes('repo')) {
      throw new HttpError(400, 'That token is missing the "repo" permission. Create it again with "repo" ticked.');
    }
    const userId = await upsertUser({ githubId: gh.id, login: gh.login, name: gh.name, avatarUrl: gh.avatar_url, token });
    await createSession(req, res, userId);
    console.log(`[auth] ${gh.login} connected GitHub`);
    res.json({ ok: true, login: gh.login });
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err.response?.status === 401) {
      throw new HttpError(400, "GitHub rejected that token. Check that you copied all of it and that it hasn't expired.");
    }
    console.error('[auth] token connect failed:', err.message);
    throw new HttpError(502, 'Could not reach GitHub. Please try again.');
  }
}));

// The GitHub App has separate sign-in and install actions: sign-in must work
// after the one-time repository installation has already happened.
router.get('/auth/github/app/start', wrap(async (req, res) => {
  const config = getConfig();
  if (!config.githubAppEnabled) throw new HttpError(503, 'GitHub App sign-in is not configured yet.');
  const state = randomToken(32);
  setCookie(req, res, NAMES.githubOAuthState(), state, { maxAgeMs: 10 * 60 * 1000 });
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', config.githubAppClientId);
  authorizeUrl.searchParams.set('redirect_uri', config.githubAppCallbackUrl);
  authorizeUrl.searchParams.set('state', state);
  res.redirect(302, authorizeUrl.toString());
}));

router.get('/auth/github/app/install', wrap(async (req, res) => {
  const config = getConfig();
  if (!config.githubAppEnabled) throw new HttpError(503, 'GitHub App sign-in is not configured yet.');
  const state = randomToken(32);
  setCookie(req, res, NAMES.githubOAuthState(), state, { maxAgeMs: 10 * 60 * 1000 });
  const installUrl = new URL(`https://github.com/apps/${config.githubAppSlug}/installations/new`);
  installUrl.searchParams.set('state', state);
  res.redirect(302, installUrl.toString());
}));

router.get('/auth/github/app/callback', wrap(async (req, res) => {
  const config = getConfig();
  const state = readCookie(req, NAMES.githubOAuthState());
  clearCookie(req, res, NAMES.githubOAuthState());
  const returnedState = typeof req.query.state === 'string' ? req.query.state : '';
  const stateMatches = Boolean(state && returnedState.length === state.length && crypto.timingSafeEqual(Buffer.from(state), Buffer.from(returnedState)));
  if (!config.githubAppEnabled || !stateMatches) return res.redirect(`${config.dashboardUrl}/?github=error&reason=state`);
  if (typeof req.query.code !== 'string' || req.query.code.length > 200) return res.redirect(`${config.dashboardUrl}/?github=error&reason=cancelled`);
  try {
    const { data } = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: config.githubAppClientId,
      client_secret: config.githubAppClientSecret,
      code: req.query.code,
      redirect_uri: config.githubAppCallbackUrl,
    }, { headers: { Accept: 'application/json' }, timeout: 15000 });
    if (!data.access_token) throw new Error(data.error_description || 'GitHub did not return an access token.');
    const { data: gh } = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${data.access_token}`, Accept: 'application/vnd.github+json' }, timeout: 15000,
    });
    const tokenBundle = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      accessExpiresAt: Date.now() + Number(data.expires_in || 28800) * 1000,
      refreshExpiresAt: Date.now() + Number(data.refresh_token_expires_in || 15768000) * 1000,
    };
    const userId = await upsertUser({ githubId: gh.id, login: gh.login, name: gh.name, avatarUrl: gh.avatar_url, token: JSON.stringify(tokenBundle) });
    await createSession(req, res, userId);
    return res.redirect(`${config.dashboardUrl}/?github=connected`);
  } catch (err) {
    console.error('[auth] GitHub App authorization failed:', err.message);
    return res.redirect(`${config.dashboardUrl}/?github=error&reason=authorization`);
  }
}));

router.post('/auth/logout', wrap(async (req, res) => {
  await destroySession(req, res);
  res.json({ ok: true });
}));

module.exports = router;
