const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { db } = require('../connection');

const User = db.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  username: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(160), allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING(255), allowNull: false },
  isAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => { user.password = await bcrypt.hash(user.password, 12); },
    beforeUpdate: async (user) => {
      if (user.changed('password')) user.password = await bcrypt.hash(user.password, 12);
    }
  }
});

module.exports = { User };
