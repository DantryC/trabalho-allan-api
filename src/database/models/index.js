const { User } = require('./user.model');
const { Category } = require('./category.model');
const { Author } = require('./author.model');
const { Book } = require('./book.model');
const { BookAuthor } = require('./book-author.model');
const { Reader } = require('./reader.model');
const { Loan } = require('./loan.model');
const { RefreshToken } = require('./refresh-token.model');

Category.hasMany(Book, { foreignKey: { name: 'categoryId', allowNull: false }, onDelete: 'RESTRICT' });
Book.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Book.belongsToMany(Author, { through: BookAuthor, as: 'authors', foreignKey: 'bookId', otherKey: 'authorId' });
Author.belongsToMany(Book, { through: BookAuthor, as: 'books', foreignKey: 'authorId', otherKey: 'bookId' });
Reader.hasMany(Loan, { foreignKey: { name: 'readerId', allowNull: false }, as: 'loans' });
Loan.belongsTo(Reader, { foreignKey: 'readerId', as: 'reader' });
Book.hasMany(Loan, { foreignKey: { name: 'bookId', allowNull: false }, as: 'loans' });
Loan.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });
User.hasMany(Loan, { foreignKey: { name: 'userId', allowNull: false }, as: 'issuedLoans' });
Loan.belongsTo(User, { foreignKey: 'userId', as: 'attendant' });
User.hasMany(RefreshToken, { foreignKey: { name: 'userId', allowNull: false }, as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { User, Category, Author, Book, BookAuthor, Reader, Loan, RefreshToken };
