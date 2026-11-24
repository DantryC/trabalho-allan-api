const { DataTypes } = require('sequelize');
const { db } = require('../connection');
const Reader = db.define('Reader', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(140), allowNull: false },
  cpf: { type: DataTypes.STRING(14), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(160), allowNull: true, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING(25), allowNull: true }
}, { tableName: 'readers' });
module.exports = { Reader };
