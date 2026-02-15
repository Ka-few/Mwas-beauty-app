import express from 'express';
import cors from 'cors';
import clientsRoutes from './routes/clients.routes';
import stylistsRoutes from './routes/stylists.routes';
import servicesRoutes from './routes/services.routes';
import productsRoutes from './routes/products.routes';
import salesRoutes from './routes/sales.routes';
import authRoutes from './routes/auth.routes';
import expensesRoutes from './routes/expenses.routes';
import licenseRoutes from './routes/license.routes';
import { checkLicense } from './middleware/license.middleware';
import { authenticate } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error';

const app = express();

// Enable CORS - MUST be before routes
app.use(cors({
  origin: (origin, callback) => {
    // Account for Electron origins ('null', 'file://', etc)
    if (!origin || origin === 'null' || origin.startsWith('file://')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now during debug
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-context']
}));

// Request logging middleware for debugging
app.use((req, res, next) => {
  const origin = req.headers.origin || 'Direct/Proxy';
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${origin}`);
  next();
});

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// License routes (Exempt from full check)
app.use('/api/license', licenseRoutes);

// Apply license check to all following routes
app.use(checkLicense);

// Public Auth: Login
import { login } from './controllers/auth.controller';
app.post('/api/auth/login', login);

// Protected routes
app.use(authenticate);

app.use('/api/clients', clientsRoutes);
app.use('/api/stylists', stylistsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/auth', authRoutes); // authRoutes now protects everything except /login (which we redefined above)
app.use('/api/expenses', expensesRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;