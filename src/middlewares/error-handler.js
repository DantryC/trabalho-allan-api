const { AppError } = require('../shared/errors');

function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return;
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message, ...(error.details ? { details: error.details } : {}) });
  }
  if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ message: 'Os dados informados não passaram pela validação.', details: error.errors?.map((item) => item.message) });
  }
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'Já existe um registro com os mesmos dados.' });
  }
  console.error(error);
  return res.status(500).json({ message: 'Ocorreu um erro interno. Tente novamente.' });
}
module.exports = { errorHandler };
