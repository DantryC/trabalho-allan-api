const { Category, Book } = require('../../database/models');
const { fail } = require('../../shared/errors');

async function list() { return Category.findAll({ order: [['name', 'ASC']] }); }
async function create(data) {
  const name = String(data.name || '').trim();
  if (!name) throw fail('O nome da categoria é obrigatório.');
  try { return await Category.create({ name, description: data.description || null }); }
  catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') throw fail('Já existe uma categoria com esse nome.', 409);
    throw error;
  }
}
async function update(id, data) {
  const item = await Category.findByPk(id);
  if (!item) throw fail('Categoria não encontrada.', 404);
  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) throw fail('O nome da categoria é obrigatório.');
    item.name = name;
  }
  if (data.description !== undefined) item.description = data.description || null;
  try { await item.save(); return item; }
  catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') throw fail('Já existe uma categoria com esse nome.', 409);
    throw error;
  }
}
async function remove(id) {
  const item = await Category.findByPk(id);
  if (!item) throw fail('Categoria não encontrada.', 404);
  if (await Book.count({ where: { categoryId: item.id } })) throw fail('Não é possível excluir uma categoria vinculada a livros.', 409);
  await item.destroy();
  return { message: 'Categoria excluída.' };
}
module.exports = { list, create, update, remove };
