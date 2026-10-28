const express = require('express');
const path = require('path');
const cors = require('cors');

// Route modules
const authRoutes = require('./routes/auth.routes');
const equipmentRoutes = require('./routes/equipment.routes');
const bookingsRoutes = require('./routes/bookings.routes');
const approvalsRoutes = require('./routes/approvals.routes');
const checklistsRoutes = require('./routes/checklists.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const incidentsRoutes = require('./routes/incidents.routes');
const analyticsRoutes = require('./routes/analytics.routes');

// Middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Security and utility middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Shared Laboratory Equipment Booking and Conflict Prevention System',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/checklists', checklistsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Catch-all for undefined API routes
app.use('/api', notFoundHandler);

// Fallback to index.html for Single Page Application navigation
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  }
  next();
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
