import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { db } from './_helpers/db';
import { errorHandler } from './_middleware/error-handler';
import { accountsController } from './accounts/accounts.controller';
import { setupSwagger } from './_helpers/swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/accounts', accountsController);

// Swagger Docs
setupSwagger(app);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Sync database
  db.sequelize.sync({ alter: false })
    .then(() => console.log('Database synced'))
    .catch((err: any) => console.error('Database sync error:', err));
});

export default app;