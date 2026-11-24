const { Author, Book } = require('../../database/models');
const { fail } = require('../../shared/errors');
async function list() { return Author.findAll({ order: [['name', 'ASC']] }); }
async function create(data) {
  const name = String(data.name || '').trim();
  if (!name) throw fail('O nome do autor é obrigatório.');
  return Author.create({ name, nationality: data.nationality || null, birthDate: data.birthDate || null });
}
async function update(id, data) {
  const author = await Author.findByPk(id);
  if (!author) throw fail('Autor não encontrado.', 404);
  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) throw fail('O nome do autor é obrigatório.');
    author.name = name;
  }
  if (data.nationality !== undefined) author.nationality = data.nationality || null;
  if (data.birthDate !== undefined) author.birthDate = data.birthDate || null;
  await author.save();
  return author;
}
async function remove(id) {
  const author = await Author.findByPk(id);
  if (!author) throw fail('Autor não encontrado.', 404);
  const linkedBooks = await author.countBooks();
  if (linkedBooks > 0) throw fail('Não é possível excluir um autor vinculado a livros.', 409);
  await author.destroy();
  return { message: 'Autor excluído.' };
}
module.exports = { list, create, update, remove };
