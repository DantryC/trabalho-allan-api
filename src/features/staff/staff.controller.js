const service = require('./staff.service');
async function list(_req, res) { return res.json({ data: await service.listStaff() }); }
async function create(req, res) { return res.status(201).json({ data: await service.createStaff(req.body || {}) }); }
async function update(req, res) { return res.json({ data: await service.updateStaff(req.params.id, req.body || {}) }); }
async function active(req, res) {
  const value = req.body?.active;
  if (typeof value !== 'boolean') return res.status(400).json({ message: 'Informe active como booleano.' });
  return res.json({ data: await service.setStaffActive(req.params.id, value) });
}
async function remove(req, res) { return res.json(await service.removeStaff(req.params.id)); }
module.exports = { list, create, update, active, remove };
