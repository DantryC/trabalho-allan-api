const express = require('express');
const cors = require('cors');
const { env } = require('./config/environment');
const { apiRoutes } = require('./routes');
const { errorHandler } = require('./middlewares/error-handler');

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: env.frontUrl, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', application: 'Acervo Campus' }));
app.use('/v1', apiRoutes);
app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));
app.use(errorHandler);
module.exports = { app };
