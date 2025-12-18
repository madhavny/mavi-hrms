import express from 'express';
import path from 'path';
import logger from '@shared/utilities/logger.js';
import web from '@web/app.js';
import { setupGracefulShutdown } from '@shared/config/database.js';
import { startCelebrationJobs, stopCelebrationJobs } from '@shared/services/celebrations.js';

const PORT = process.env.APP_PORT || 9000;
const app = express();

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Mount all modular apps
app.use('/api/v1', web);

// Root health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Main API is running' });
});

app.listen(PORT, (err) => {
    if (err) {
        logger.error(`Error starting server: ${err.message}`);
        setTimeout(() => process.exit(1), 100);
        return;
    }
    logger.info(`🚀 Server running on port ${PORT}`);

    // Start celebration cron jobs (birthday & anniversary checks)
    startCelebrationJobs();
});

// Stop cron jobs on shutdown
process.on('SIGTERM', () => {
    stopCelebrationJobs();
});
process.on('SIGINT', () => {
    stopCelebrationJobs();
});

setupGracefulShutdown(app);