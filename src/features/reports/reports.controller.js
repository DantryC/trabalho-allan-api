const service = require('./reports.service');
async function dashboard(_req, res) { return res.json({ data: await service.dashboard() }); }
module.exports = { dashboard };
