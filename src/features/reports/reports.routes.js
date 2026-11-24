const { Router } = require('express');
const controller = require('./reports.controller');
const { asyncRoute } = require('../../shared/async-route');
const { requireAdministrator } = require('../../middlewares/require-access');
const router = Router();
router.get('/dashboard', requireAdministrator, asyncRoute(controller.dashboard));
module.exports = { reportsRoutes: router };
