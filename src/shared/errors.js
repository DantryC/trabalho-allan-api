class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const fail = (message, statusCode = 400, details) => new AppError(message, statusCode, details);
module.exports = { AppError, fail };
