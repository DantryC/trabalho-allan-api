const { DataTypes } = require('sequelize');
const { db } = require('../connection');
const Category = db.define('Category', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(90), allowNull: false, unique: true },
  description: { type: DataTypes.STRING(500), allowNull: true }
}, { tableName: 'categories' });
module.exports = { Category };
