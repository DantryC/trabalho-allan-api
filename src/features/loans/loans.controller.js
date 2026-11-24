const service = require('./loans.service');
async function create(req, res) { return res.status(201).json({ data: await service.createLoan(req.body || {}, req.auth) }); }
async function list(req, res) { return res.json({ data: await service.listLoans(req.query.status) }); }
async function updateDueDate(req, res) { return res.json({ data: await service.updateLoanDueDate(req.params.id, req.body || {}) }); }
async function returnBook(req, res) { return res.json({ data: await service.returnLoan(req.params.id) }); }
module.exports = { create, list, updateDueDate, returnBook };
