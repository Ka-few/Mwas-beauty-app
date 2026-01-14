import express from 'express';
import cors from 'cors';
import clientsRoutes from './routes/clients.routes';
import stylistsRoutes from './routes/stylists.routes';
import servicesRoutes from './routes/services.routes';
import productsRoutes from './routes/products.routes';
import salesRoutes from './routes/sales.routes';
import authRoutes from './routes/auth.routes';
import expensesRoutes from './routes/expenses.routes';

const app = express();

// Enable CORS - MUST be before routes
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl requests, or file://)
    if (!origin || origin === 'null' || origin.startsWith('file://')) {
      return callback(null, true);
    }
    // Allow localhost (development)
    if (origin.startsWith('http://localhost')) {
      return callback(null, true);
    }

    // Block others
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

app.use('/api/clients', clientsRoutes);
app.use('/api/stylists', stylistsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expensesRoutes);

export default app;