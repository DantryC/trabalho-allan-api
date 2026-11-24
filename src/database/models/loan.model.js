const { DataTypes } = require('sequelize');
const { db } = require('../connection');
const Loan = db.define('Loan', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  loanDate: { type: DataTypes.DATEONLY, allowNull: false },
  dueDate: { type: DataTypes.DATEONLY, allowNull: false },
  returnDate: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('ATIVO', 'DEVOLVIDO', 'ATRASADO'), allowNull: false, defaultValue: 'ATIVO' },
  fine: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }
}, { tableName: 'loans' });
module.exports = { Loan };
