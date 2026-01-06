import express from 'express';
import clientsRoutes from './routes/clients.routes';
import stylistsRoutes from './routes/stylists.routes';
import servicesRoutes from './routes/services.routes';
import productsRoutes from './routes/products.routes';
import salesRoutes from './routes/sales.routes';

const app = express();
app.use(express.json());

app.use('/api/clients', clientsRoutes);
app.use('/api/stylists', stylistsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);

export default app;
