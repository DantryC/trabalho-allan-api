const { Router } = require('express');
const controller = require('./auth.controller');
const { asyncRoute } = require('../../shared/async-route');
const { requireAccess } = require('../../middlewares/require-access');

const router = Router();
router.post('/login', asyncRoute(controller.login));
router.post('/refresh', asyncRoute(controller.refresh));
router.post('/logout', requireAccess, asyncRoute(controller.logout));
router.get('/me', requireAccess, asyncRoute(controller.me));
module.exports = { authRoutes: router };
