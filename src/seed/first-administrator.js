const { User } = require('../database/models');
const { env } = require('../config/environment');

async function ensureFirstAdministrator() {
  const administrator = await User.findOne({ where: { isAdmin: true } });
  if (administrator) return administrator;

  return User.create({
    name: env.admin.name,
    username: env.admin.username,
    email: env.admin.email,
    password: env.admin.password,
    isAdmin: true,
    active: true
  });
}

module.exports = { ensureFirstAdministrator };
