const authService = require('./auth.service');
const { publicUser } = require('../../shared/security');

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Informe e-mail e senha.' });
  const result = await authService.signIn(email, password);
  return res.status(200).json(result);
}

async function refresh(req, res) {
  const result = await authService.rotateRefreshToken(req.body?.refreshToken);
  return res.status(200).json(result);
}

async function logout(req, res) {
  const result = await authService.signOut(req.body?.refreshToken, req.auth.id);
  return res.status(200).json(result);
}

async function me(req, res) {
  return res.status(200).json({ user: publicUser(req.auth) });
}

module.exports = { login, refresh, logout, me };
