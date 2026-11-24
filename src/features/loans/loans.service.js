const { Loan, Book, Reader, User } = require('../../database/models');
const { db } = require('../../database/connection');
const { fail } = require('../../shared/errors');
const { todayIso } = require('../../shared/date');

function addDays(dateIso, days) {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(startIso, endIso) {
  const start = new Date(`${startIso}T00:00:00.000Z`).getTime();
  const end = new Date(`${endIso}T00:00:00.000Z`).getTime();
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function effectiveStatus(loan, today = todayIso()) {
  if (loan.returnDate) return 'DEVOLVIDO';
  return loan.dueDate < today ? 'ATRASADO' : 'ATIVO';
}

async function createLoan({ bookId, readerId }, operator) {
  const parsedBookId = Number(bookId);
  const parsedReaderId = Number(readerId);
  if (!Number.isInteger(parsedBookId) || parsedBookId < 1 || !Number.isInteger(parsedReaderId) || parsedReaderId < 1) {
    throw fail('Informe bookId e readerId válidos.');
  }

  return db.transaction(async (transaction) => {
    const book = await Book.findByPk(parsedBookId, { transaction });
    if (!book) throw fail('Livro não encontrado.', 404);
    const reader = await Reader.findByPk(parsedReaderId, { transaction });
    if (!reader) throw fail('Leitor não encontrado.', 404);
    if (Number(book.availableCopies) <= 0) throw fail('Não há exemplares disponíveis deste livro.', 409);

    const currentLoans = await Loan.findAll({
      where: { readerId: reader.id, returnDate: null },
      transaction
    });
    const today = todayIso();
    if (currentLoans.some((loan) => loan.dueDate < today)) {
      throw fail('O leitor possui empréstimo atrasado e não pode realizar outro.', 409);
    }
    if (currentLoans.length >= 3) throw fail('O leitor já possui o limite de três empréstimos ativos.', 409);

    const loanDate = today;
    const dueDate = addDays(loanDate, 7);
    await book.update({ availableCopies: Number(book.availableCopies) - 1 }, { transaction });
    const loan = await Loan.create({
      loanDate,
      dueDate,
      returnDate: null,
      status: 'ATIVO',
      fine: 0,
      bookId: book.id,
      readerId: reader.id,
      userId: operator.id
    }, { transaction });
    return Loan.findByPk(loan.id, {
      include: [
        { model: Book, as: 'book' },
        { model: Reader, as: 'reader' },
        { model: User, as: 'attendant', attributes: ['id', 'name', 'email'] }
      ], transaction
    });
  });
}

function isValidDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function updateLoanDueDate(id, { dueDate } = {}) {
  const loanId = Number(id);
  if (!Number.isInteger(loanId) || loanId < 1) throw fail('Identificador de empréstimo inválido.');
  if (!isValidDateOnly(dueDate)) throw fail('Informe uma data de vencimento válida no formato AAAA-MM-DD.');

  return db.transaction(async (transaction) => {
    const loan = await Loan.findByPk(loanId, { transaction });
    if (!loan) throw fail('Empréstimo não encontrado.', 404);
    if (loan.returnDate) throw fail('Não é possível alterar o vencimento de um empréstimo já devolvido.', 409);
    if (dueDate < loan.loanDate) throw fail('A data de vencimento não pode ser anterior à data do empréstimo.');

    await loan.update({ dueDate }, { transaction });
    return Loan.findByPk(loan.id, {
      include: [
        { model: Book, as: 'book' },
        { model: Reader, as: 'reader' },
        { model: User, as: 'attendant', attributes: ['id', 'name', 'email'] }
      ], transaction
    });
  });
}

async function returnLoan(id) {
  return db.transaction(async (transaction) => {
    const loan = await Loan.findByPk(id, { transaction });
    if (!loan) throw fail('Empréstimo não encontrado.', 404);
    if (loan.returnDate) throw fail('Este empréstimo já foi devolvido.', 409);
    const returnDate = todayIso();
    const overdueDays = daysBetween(loan.dueDate, returnDate);
    const fine = overdueDays * 1;
    const book = await Book.findByPk(loan.bookId, { transaction });
    if (!book) throw fail('Livro associado ao empréstimo não encontrado.', 409);

    await loan.update({ returnDate, status: 'DEVOLVIDO', fine }, { transaction });
    await book.update({ availableCopies: Math.min(Number(book.totalCopies), Number(book.availableCopies) + 1) }, { transaction });
    return {
      ...(await Loan.findByPk(loan.id, {
        include: [
          { model: Book, as: 'book' },
          { model: Reader, as: 'reader' },
          { model: User, as: 'attendant', attributes: ['id', 'name', 'email'] }
        ], transaction
      })).toJSON(),
      lateDays: overdueDays,
      fine: Number(fine.toFixed(2))
    };
  });
}

async function listLoans(status) {
  const rows = await Loan.findAll({
    include: [
      { model: Book, as: 'book' },
      { model: Reader, as: 'reader' },
      { model: User, as: 'attendant', attributes: ['id', 'name', 'email'] }
    ], order: [['loanDate', 'DESC'], ['id', 'DESC']]
  });
  const today = todayIso();
  const mapped = rows.map((loan) => ({ ...loan.toJSON(), status: effectiveStatus(loan, today) }));
  if (!status) return mapped;
  const allowed = ['ATIVO', 'ATRASADO', 'DEVOLVIDO'];
  if (!allowed.includes(status)) throw fail('Status inválido. Use ATIVO, ATRASADO ou DEVOLVIDO.');
  return mapped.filter((loan) => loan.status === status);
}

module.exports = { createLoan, updateLoanDueDate, returnLoan, listLoans, addDays, daysBetween, effectiveStatus, isValidDateOnly };
