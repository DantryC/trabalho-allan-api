const service = require('./readers.service');
async function list(_req, res) { return res.json({ data: await service.list() }); }
async function create(req, res) { return res.status(201).json({ data: await service.create(req.body || {}) }); }
async function update(req, res) { return res.json({ data: await service.update(req.params.id, req.body || {}) }); }
async function history(req, res) { return res.json({ data: await service.history(req.params.id) }); }
async function remove(req, res) { return res.json(await service.remove(req.params.id)); }
module.exports = { list, create, update, history, remove };
