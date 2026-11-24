const path = require('node:path');
require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  frontUrl: process.env.FRONT_URL || 'http://localhost:5173',
  appTimeZone: process.env.APP_TIME_ZONE || 'America/Sao_Paulo',
  jwtSecret: process.env.JWT_SECRET || '',
  refreshSecret: process.env.JWT_REFRESH_SECRET || '',
  accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  databaseFile: process.env.DATABASE_FILE === ':memory:'
    ? ':memory:'
    : path.resolve(process.cwd(), process.env.DATABASE_FILE || './storage/acervo-campus.sqlite'),
  admin: {
    name: process.env.ADMIN_NAME || 'Administrador',
    username: process.env.ADMIN_USERNAME || 'admin',
    email: (process.env.ADMIN_EMAIL || 'admin@acervocampus.local').trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || ''
  }
};

function validateEnvironment() {
  if (env.jwtSecret.length < 32 || /CHANGE_THIS|REPLACE_ME/i.test(env.jwtSecret)) throw new Error('Defina JWT_SECRET com um segredo aleatório de pelo menos 32 caracteres.');
  if (env.refreshSecret.length < 32 || /CHANGE_THIS|REPLACE_ME/i.test(env.refreshSecret)) throw new Error('Defina JWT_REFRESH_SECRET com outro segredo aleatório de pelo menos 32 caracteres.');
  if (env.jwtSecret === env.refreshSecret) throw new Error('JWT_SECRET e JWT_REFRESH_SECRET precisam ser diferentes.');
  if (env.admin.password.length < 8 || /CHANGE_THIS|REPLACE_ME/i.test(env.admin.password)) throw new Error('Defina ADMIN_PASSWORD com uma senha inicial de pelo menos 8 caracteres.');
  if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) throw new Error('PORT inválida.');
  try { new Intl.DateTimeFormat('en-US', { timeZone: env.appTimeZone }).format(new Date()); }
  catch { throw new Error('APP_TIME_ZONE deve conter um fuso horário IANA válido.'); }
}

module.exports = { env, validateEnvironment };
