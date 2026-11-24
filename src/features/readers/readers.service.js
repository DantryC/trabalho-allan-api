const { Reader, Loan, Book } = require('../../database/models');
const { db } = require('../../database/connection');
const { fail } = require('../../shared/errors');
const { todayIso } = require('../../shared/date');

function normalizeCpf(value) { return String(value || '').replace(/\D/g, ''); }
async function list() { return Reader.findAll({ order: [['name', 'ASC']] }); }
async function create(data) {
  const name = String(data.name || '').trim();
  const cpf = normalizeCpf(data.cpf);
  if (!name || cpf.length !== 11) throw fail('Informe nome e CPF válido com 11 dígitos.');
  try { return await Reader.create({ name, cpf, email: data.email ? String(data.email).trim().toLowerCase() : null, phone: data.phone || null }); }
  catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') throw fail('Já existe um leitor com esse CPF.', 409);
    throw error;
  }
}
async function update(id, data) {
  const reader = await Reader.findByPk(id);
  if (!reader) throw fail('Leitor não encontrado.', 404);
  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) throw fail('O nome do leitor é obrigatório.');
    reader.name = name;
  }
  if (data.cpf !== undefined) {
    const cpf = normalizeCpf(data.cpf);
    if (cpf.length !== 11) throw fail('CPF deve conter 11 dígitos.');
    reader.cpf = cpf;
  }
  if (data.email !== undefined) reader.email = data.email ? String(data.email).trim().toLowerCase() : null;
  if (data.phone !== undefined) reader.phone = data.phone || null;
  try { await reader.save(); return reader; }
  catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') throw fail('Já existe um leitor com esse CPF.', 409);
    throw error;
  }
}
async function history(id) {
  const reader = await Reader.findByPk(id);
  if (!reader) throw fail('Leitor não encontrado.', 404);
  const rows = await Loan.findAll({ where: { readerId: id }, include: [{ model: Book, as: 'book' }], order: [['loanDate', 'DESC']] });
  const today = todayIso();
  return rows.map((loan) => ({ ...loan.toJSON(), status: !loan.returnDate && loan.dueDate < today ? 'ATRASADO' : loan.status }));
}
async function remove(id) {
  return db.transaction(async (transaction) => {
    const reader = await Reader.findByPk(id, { transaction });
    if (!reader) throw fail('Leitor não encontrado.', 404);
    const loanHistory = await Loan.count({ where: { readerId: reader.id }, transaction });
    if (loanHistory > 0) {
      throw fail('Não é possível excluir um leitor que possui histórico de empréstimos.', 409);
    }
    await reader.destroy({ transaction });
    return { message: 'Leitor excluído.' };
  });
}

module.exports = { list, create, update, history, remove };
