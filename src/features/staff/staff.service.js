const { User, Loan, RefreshToken } = require('../../database/models');
const { db } = require('../../database/connection');
const { fail } = require('../../shared/errors');
const { publicUser } = require('../../shared/security');
const authService = require('../auth/auth.service');

async function listStaff() {
  const rows = await User.findAll({ where: { isAdmin: false }, order: [['name', 'ASC']] });
  return rows.map(publicUser);
}

async function createStaff(payload) {
  const name = String(payload.name || '').trim();
  const username = String(payload.username || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  if (!name || !username || !email || !password) throw fail('Nome, usuário, e-mail e senha são obrigatórios.');
  if (password.length < 8) throw fail('A senha deve possuir pelo menos 8 caracteres.');
  try {
    const staff = await User.create({ name, username, email, password, isAdmin: false, active: true });
    return publicUser(staff);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') throw fail('E-mail ou nome de usuário já cadastrado.', 409);
    throw error;
  }
}

async function updateStaff(id, payload) {
  const staff = await User.findByPk(id);
  if (!staff || staff.isAdmin) throw fail('Atendente não encontrado.', 404);
  if (payload.name !== undefined) {
    const name = String(payload.name).trim();
    if (!name) throw fail('O nome do atendente é obrigatório.');
    staff.name = name;
  }
  if (payload.username !== undefined) {
    const username = String(payload.username).trim();
    if (!username) throw fail('O nome de usuário é obrigatório.');
    staff.username = username;
  }
  if (payload.email !== undefined) {
    const email = String(payload.email).trim().toLowerCase();
    if (!email) throw fail('O e-mail é obrigatório.');
    staff.email = email;
  }
  if (payload.password !== undefined && payload.password !== '') {
    if (String(payload.password).length < 8) throw fail('A senha deve possuir pelo menos 8 caracteres.');
    staff.password = String(payload.password);
  }
  try {
    await staff.save();
    return publicUser(staff);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') throw fail('E-mail ou nome de usuário já cadastrado.', 409);
    throw error;
  }
}

async function setStaffActive(id, active) {
  const staff = await User.findByPk(id);
  if (!staff || staff.isAdmin) throw fail('Atendente não encontrado.', 404);
  staff.active = Boolean(active);
  await staff.save();
  if (!staff.active) await authService.revokeAllForUser(staff.id);
  return publicUser(staff);
}

async function removeStaff(id) {
  return db.transaction(async (transaction) => {
    const staff = await User.findByPk(id, { transaction });
    if (!staff || staff.isAdmin) throw fail('Atendente não encontrado.', 404);

    const issuedLoans = await Loan.count({ where: { userId: staff.id }, transaction });
    if (issuedLoans > 0) {
      throw fail('Não é possível excluir um atendente que possui empréstimos registrados.', 409);
    }

    await RefreshToken.destroy({ where: { userId: staff.id }, transaction });
    await staff.destroy({ transaction });
    return { message: 'Atendente excluído.' };
  });
}

module.exports = { listStaff, createStaff, updateStaff, setStaffActive, removeStaff };
