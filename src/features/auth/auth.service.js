const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../../database/connection');
const { User, RefreshToken } = require('../../database/models');
const { env } = require('../../config/environment');
const { fail } = require('../../shared/errors');
const { digest, publicUser } = require('../../shared/security');

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVALID_LOGIN = 'E-mail ou senha inválidos.';

function createAccessToken(user) {
  return jwt.sign({
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: Boolean(user.isAdmin)
  }, env.jwtSecret, { expiresIn: env.accessTtl });
}

function createRefreshToken(user) {
  return jwt.sign({ id: user.id, purpose: 'refresh', nonce: crypto.randomUUID() }, env.refreshSecret, { expiresIn: '7d' });
}

async function storeRefreshToken(token, userId, transaction) {
  await RefreshToken.create({
    token: digest(token),
    userId,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    revoked: false
  }, { transaction });
}

async function signIn(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user || !user.active) throw fail(INVALID_LOGIN, 401);

  const validPassword = await bcrypt.compare(String(password || ''), user.password);
  if (!validPassword) throw fail(INVALID_LOGIN, 401);

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  await storeRefreshToken(refreshToken, user.id);
  return { accessToken, refreshToken, user: publicUser(user) };
}

async function rotateRefreshToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') throw fail('Refresh token não informado.', 401);

  const tokenHash = digest(rawToken);
  const stored = await RefreshToken.findOne({ where: { token: tokenHash } });
  if (!stored) throw fail('Refresh token não encontrado.', 401);

  if (stored.revoked) {
    await revokeAllForUser(stored.userId);
    throw fail('Reutilização de refresh token detectada. Todas as sessões foram revogadas.', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(rawToken, env.refreshSecret);
  } catch (_error) {
    await stored.update({ revoked: true });
    throw fail('Refresh token inválido ou expirado.', 401);
  }

  if (decoded.purpose !== 'refresh' || !decoded.id || Number(decoded.id) !== Number(stored.userId)) {
    await stored.update({ revoked: true });
    throw fail('Refresh token inválido.', 401);
  }
  if (new Date(stored.expiresAt).getTime() <= Date.now()) {
    await stored.update({ revoked: true });
    throw fail('Refresh token expirado.', 401);
  }

  const user = await User.findByPk(stored.userId);
  if (!user || !user.active) {
    await revokeAllForUser(stored.userId);
    throw fail('Usuário inativo ou inexistente.', 401);
  }

  const nextAccessToken = createAccessToken(user);
  const nextRefreshToken = createRefreshToken(user);
  const replayMessage = 'REFRESH_TOKEN_REPLAY_DURING_ROTATION';

  try {
    await db.transaction(async (transaction) => {
      const current = await RefreshToken.findByPk(stored.id, { transaction });
      if (!current || current.revoked) throw new Error(replayMessage);
      await current.update({ revoked: true }, { transaction });
      await storeRefreshToken(nextRefreshToken, user.id, transaction);
    });
  } catch (error) {
    if (error.message === replayMessage) {
      await revokeAllForUser(user.id);
      throw fail('Reutilização de refresh token detectada. Todas as sessões foram revogadas.', 401);
    }
    throw error;
  }

  return { accessToken: nextAccessToken, refreshToken: nextRefreshToken, user: publicUser(user) };
}

async function signOut(rawToken, userId) {
  if (!rawToken || typeof rawToken !== 'string') return { message: 'Sessão encerrada.' };
  const stored = await RefreshToken.findOne({ where: { token: digest(rawToken), userId } });
  if (stored && !stored.revoked) await stored.update({ revoked: true });
  return { message: 'Sessão encerrada.' };
}

async function revokeAllForUser(userId) {
  await RefreshToken.update({ revoked: true }, { where: { userId, revoked: false } });
}

module.exports = { signIn, rotateRefreshToken, signOut, createAccessToken, revokeAllForUser };
