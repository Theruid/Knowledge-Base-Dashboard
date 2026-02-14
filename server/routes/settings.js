import express from 'express';
import { authenticateToken } from './auth.js';
import db from '../db.js';

const router = express.Router();

// GET /api/settings/chatbot-environment - Get current chatbot environment setting
router.get('/chatbot-environment', authenticateToken, (req, res) => {
    try {
        const setting = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('chatbot_environment');

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Chatbot environment setting not found'
            });
        }

        res.json({
            success: true,
            environment: setting.value
        });
    } catch (error) {
        console.error('Error fetching chatbot environment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chatbot environment setting',
            error: error.message
        });
    }
});

// PUT /api/settings/chatbot-environment - Update chatbot environment setting (admin only)
router.put('/chatbot-environment', authenticateToken, (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only administrators can change chatbot environment settings'
            });
        }

        const { environment } = req.body;

        // Validate environment value
        if (!environment || !['dev', 'prod'].includes(environment)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid environment value. Must be "dev" or "prod"'
            });
        }

        // Update the setting
        db.prepare(`
      INSERT INTO system_settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).run('chatbot_environment', environment);

        console.log(`Chatbot environment updated to: ${environment} by user: ${req.user.username}`);

        res.json({
            success: true,
            message: `Chatbot environment updated to ${environment}`,
            environment: environment
        });
    } catch (error) {
        console.error('Error updating chatbot environment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update chatbot environment setting',
            error: error.message
        });
    }
});

export const settingsRoutes = router;
