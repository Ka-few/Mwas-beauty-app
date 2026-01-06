import express from 'express';
import cors from 'cors';
import clientsRoutes from './routes/clients.routes';
import stylistsRoutes from './routes/stylists.routes';
import servicesRoutes from './routes/services.routes';
import productsRoutes from './routes/products.routes';
import salesRoutes from './routes/sales.routes';
import authRoutes from './routes/auth.routes';

const app = express();

// Enable CORS - MUST be before routes
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true
}));

app.use(express.json());

app.use('/api/clients', clientsRoutes);
app.use('/api/stylists', stylistsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/auth', authRoutes);

export default app;