const { DataTypes } = require('sequelize');
const { db } = require('../connection');
const BookAuthor = db.define('BookAuthor', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }
}, { tableName: 'book_authors', timestamps: false });
module.exports = { BookAuthor };
