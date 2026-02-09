import express from 'express';
import db from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Submit chatbot feedback
router.post('/feedback', authenticateToken, async (req, res) => {
    try {
        const { message, response, feedbackType, reason } = req.body;
        const userId = req.user.id;
        const username = req.user.username;

        // Validate input
        if (!message || !response || !feedbackType) {
            return res.status(400).json({
                success: false,
                message: 'Message, response, and feedback type are required'
            });
        }

        if (!['positive', 'negative'].includes(feedbackType)) {
            return res.status(400).json({
                success: false,
                message: 'Feedback type must be either positive or negative'
            });
        }

        // Insert feedback
        const stmt = db.prepare(`
      INSERT INTO chatbot_feedback (user_id, username, message, response, feedback_type, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        const result = stmt.run(userId, username, message, response, feedbackType, reason || null);

        res.json({
            success: true,
            message: 'Feedback submitted successfully',
            feedbackId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting feedback',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;
