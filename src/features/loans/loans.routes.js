const { Router } = require('express');
const controller = require('./loans.controller');
const { asyncRoute } = require('../../shared/async-route');
const router = Router();
router.get('/', asyncRoute(controller.list));
router.post('/', asyncRoute(controller.create));
router.patch('/:id/due-date', asyncRoute(controller.updateDueDate));
router.patch('/:id/return', asyncRoute(controller.returnBook));
module.exports = { loansRoutes: router };
