const { Op } = require('sequelize');
const { Book, Loan } = require('../../database/models');
const { todayIso } = require('../../shared/date');

async function dashboard() {
  const today = todayIso();
  const [bookTitles, bookCopies, activeLoans, overdueLoans, fineRows] = await Promise.all([
    Book.count(),
    Book.sum('totalCopies'),
    Loan.count({ where: { returnDate: null, dueDate: { [Op.gte]: today } } }),
    Loan.count({ where: { returnDate: null, dueDate: { [Op.lt]: today } } }),
    Loan.findAll({ where: { fine: { [Op.gt]: 0 } }, attributes: ['fine'], raw: true })
  ]);
  const fines = fineRows.reduce((sum, row) => sum + Number(row.fine || 0), 0);
  return {
    totalBooks: Number(bookTitles || 0),
    totalCopies: Number(bookCopies || 0),
    activeLoans,
    overdueLoans,
    totalFines: Number(fines.toFixed(2))
  };
}
module.exports = { dashboard };
