const jwt = require('jsonwebtoken');
const { User } = require('../database/models');
const { env } = require('../config/environment');

async function requireAccess(req, res, next) {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Autenticação necessária.' });
  }

  try {
    const claims = jwt.verify(token, env.jwtSecret);
    const user = await User.findByPk(claims.id);
    if (!user || !user.active) return res.status(401).json({ message: 'Sessão inválida ou usuário inativo.' });
    req.auth = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Access token inválido ou expirado.' });
  }
}

function requireAdministrator(req, res, next) {
  if (!req.auth || !req.auth.isAdmin) {
    return res.status(403).json({ message: 'Acesso permitido somente para administradores.' });
  }
  return next();
}

module.exports = { requireAccess, requireAdministrator };
