const crypto = require('node:crypto');

function digest(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    isAdmin: Boolean(user.isAdmin),
    active: Boolean(user.active)
  };
}

function asInteger(value, fieldName, minimum = 0) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum) {
    const { fail } = require('./errors');
    throw fail(`${fieldName} deve ser um número inteiro maior ou igual a ${minimum}.`);
  }
  return number;
}

module.exports = { digest, publicUser, asInteger };
