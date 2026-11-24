const { Op } = require('sequelize');
const { db } = require('../../database/connection');
const { Book, Category, Author, Loan } = require('../../database/models');
const { fail } = require('../../shared/errors');
const { asInteger } = require('../../shared/security');

const bookIncludes = [
  { model: Category, as: 'category' },
  { model: Author, as: 'authors', through: { attributes: [] } }
];

async function list(filters = {}) {
  const where = {};
  if (filters.title) where.title = { [Op.like]: `%${String(filters.title).trim()}%` };
  if (filters.categoryId) where.categoryId = Number(filters.categoryId);
  if (filters.available === 'true') where.availableCopies = { [Op.gt]: 0 };
  const include = [...bookIncludes];
  if (filters.authorId) {
    include[1] = { ...include[1], where: { id: Number(filters.authorId) }, required: true };
  }
  return Book.findAll({ where, include, order: [['title', 'ASC']] });
}

async function create(data) {
  const title = String(data.title || '').trim();
  const isbn = String(data.isbn || '').trim();
  const categoryId = asInteger(data.categoryId, 'Categoria', 1);
  const totalCopies = asInteger(data.totalCopies ?? 1, 'Exemplares', 0);
  const authorIds = Array.isArray(data.authorIds) ? [...new Set(data.authorIds.map(Number))] : [];
  if (!title || !isbn) throw fail('Título e ISBN são obrigatórios.');
  if (!authorIds.length || authorIds.some((id) => !Number.isInteger(id) || id < 1)) throw fail('Selecione pelo menos um autor.');
  const category = await Category.findByPk(categoryId);
  if (!category) throw fail('Categoria não encontrada.', 404);
  const authors = await Author.findAll({ where: { id: authorIds } });
  if (authors.length !== authorIds.length) throw fail('Um ou mais autores não foram encontrados.', 404);
  const availableCopies = data.availableCopies === undefined ? totalCopies : asInteger(data.availableCopies, 'Exemplares disponíveis', 0);
  if (availableCopies > totalCopies) throw fail('Exemplares disponíveis não pode superar o total.');
  try {
    return await db.transaction(async (transaction) => {
      const book = await Book.create({
        title, isbn, year: data.year ? asInteger(data.year, 'Ano', 1400) : null,
        totalCopies, availableCopies, categoryId
      }, { transaction });
      await book.setAuthors(authors, { transaction });
      return Book.findByPk(book.id, { include: bookIncludes, transaction });
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') throw fail('Já existe um livro com esse ISBN.', 409);
    throw error;
  }
}

async function update(id, data) {
  const book = await Book.findByPk(id, { include: bookIncludes });
  if (!book) throw fail('Livro não encontrado.', 404);
  const lentCopies = Number(book.totalCopies) - Number(book.availableCopies);
  const newTotal = data.totalCopies === undefined ? Number(book.totalCopies) : asInteger(data.totalCopies, 'Exemplares', 0);
  if (newTotal < lentCopies) throw fail('O total não pode ser menor que a quantidade de exemplares emprestados.', 409);
  const categoryId = data.categoryId === undefined ? book.categoryId : asInteger(data.categoryId, 'Categoria', 1);
  if (data.categoryId !== undefined && !(await Category.findByPk(categoryId))) throw fail('Categoria não encontrada.', 404);
  let authors = null;
  if (data.authorIds !== undefined) {
    if (!Array.isArray(data.authorIds) || data.authorIds.length === 0) throw fail('Selecione pelo menos um autor.');
    const ids = [...new Set(data.authorIds.map(Number))];
    authors = await Author.findAll({ where: { id: ids } });
    if (authors.length !== ids.length) throw fail('Um ou mais autores não foram encontrados.', 404);
  }
  if (data.title !== undefined) {
    const title = String(data.title).trim();
    if (!title) throw fail('O título do livro é obrigatório.');
    book.title = title;
  }
  if (data.isbn !== undefined) {
    const isbn = String(data.isbn).trim();
    if (!isbn) throw fail('O ISBN do livro é obrigatório.');
    book.isbn = isbn;
  }
  if (data.year !== undefined) book.year = data.year === '' || data.year === null ? null : asInteger(data.year, 'Ano', 1400);
  book.totalCopies = newTotal;
  book.availableCopies = newTotal - lentCopies;
  book.categoryId = categoryId;
  try {
    await db.transaction(async (transaction) => {
      await book.save({ transaction });
      if (authors) await book.setAuthors(authors, { transaction });
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') throw fail('Já existe um livro com esse ISBN.', 409);
    throw error;
  }
  return Book.findByPk(book.id, { include: bookIncludes });
}

async function remove(id) {
  const book = await Book.findByPk(id);
  if (!book) throw fail('Livro não encontrado.', 404);
  const loanHistory = await Loan.count({ where: { bookId: book.id } });
  if (loanHistory > 0 || Number(book.availableCopies) !== Number(book.totalCopies)) {
    throw fail('Não é possível excluir um livro com histórico de empréstimos ou exemplares emprestados.', 409);
  }
  await book.destroy();
  return { message: 'Livro excluído.' };
}
module.exports = { list, create, update, remove };
