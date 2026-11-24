const { DataTypes } = require('sequelize');
const { db } = require('../connection');
const RefreshToken = db.define('RefreshToken', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  revoked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: 'refresh_tokens' });
module.exports = { RefreshToken };
