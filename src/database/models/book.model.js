const { DataTypes } = require('sequelize');
const { db } = require('../connection');
const Book = db.define('Book', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING(180), allowNull: false },
  isbn: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  year: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1400, max: 2200 } },
  totalCopies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 0 } },
  availableCopies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 0 } }
}, { tableName: 'books' });
module.exports = { Book };
