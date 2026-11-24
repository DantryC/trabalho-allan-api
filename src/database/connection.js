const fs = require('node:fs');
const path = require('node:path');
const { Sequelize } = require('sequelize');
const { env } = require('../config/environment');

if (env.databaseFile !== ':memory:') {
  fs.mkdirSync(path.dirname(env.databaseFile), { recursive: true });
}

const db = new Sequelize({
  dialect: 'sqlite',
  storage: env.databaseFile,
  logging: env.nodeEnv === 'development' ? false : false,
  define: { underscored: true, timestamps: true }
});

module.exports = { db };
