const { DataTypes } = require('sequelize');
const { db } = require('../connection');
const Author = db.define('Author', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(140), allowNull: false },
  nationality: { type: DataTypes.STRING(80), allowNull: true },
  birthDate: { type: DataTypes.DATEONLY, allowNull: true }
}, { tableName: 'authors' });
module.exports = { Author };
