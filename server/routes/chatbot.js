import express from 'express';
import db from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Submit chatbot feedback (unified for both chatbot and conversations)
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { message, response, feedbackType, reason, source = 'chatbot', conversationId, messageIndex, sessionId, tag } = req.body;
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

    // Insert feedback with source and tag
    const stmt = db.prepare(`
      INSERT INTO chatbot_feedback (user_id, username, message, response, feedback_type, reason, source, conversation_id, message_index, session_id, tag)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      username,
      message,
      response,
      feedbackType,
      reason || null,
      source,
      conversationId || null,
      messageIndex !== undefined ? messageIndex : null,
      sessionId || null,
      tag || null
    );

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

// Get feedback statistics (admin only) - supports filtering by source
router.get('/feedback-stats', authenticateToken, async (req, res) => {
  try {
    const { source } = req.query;
    const params = source ? [source] : [];

    // Get counts for chatbot source
    const chatbotPositive = db.prepare(`SELECT COUNT(*) as count FROM chatbot_feedback WHERE feedback_type = 'positive' AND source = 'chatbot'`).get();
    const chatbotNegative = db.prepare(`SELECT COUNT(*) as count FROM chatbot_feedback WHERE feedback_type = 'negative' AND source = 'chatbot'`).get();
    const chatbotTotal = db.prepare(`SELECT COUNT(*) as count FROM chatbot_feedback WHERE source = 'chatbot'`).get();

    // Get counts for conversation source
    const conversationPositive = db.prepare(`SELECT COUNT(*) as count FROM chatbot_feedback WHERE feedback_type = 'positive' AND source = 'conversation'`).get();
    const conversationNegative = db.prepare(`SELECT COUNT(*) as count FROM chatbot_feedback WHERE feedback_type = 'negative' AND source = 'conversation'`).get();
    const conversationTotal = db.prepare(`SELECT COUNT(*) as count FROM chatbot_feedback WHERE source = 'conversation'`).get();

    // Get overall counts (for backward compatibility)
    const positiveCountQuery = `SELECT COUNT(*) as count FROM chatbot_feedback WHERE feedback_type = 'positive'${source ? ' AND source = ?' : ''}`;
    const positiveCount = db.prepare(positiveCountQuery).get(...params);

    const negativeCountQuery = `SELECT COUNT(*) as count FROM chatbot_feedback WHERE feedback_type = 'negative'${source ? ' AND source = ?' : ''}`;
    const negativeCount = db.prepare(negativeCountQuery).get(...params);

    const totalCountQuery = `SELECT COUNT(*) as count FROM chatbot_feedback${source ? ' WHERE source = ?' : ''}`;
    const totalCount = db.prepare(totalCountQuery).get(...params);

    // Get tag statistics for chatbot source
    const chatbotTagStatsQuery = `
      SELECT tag, COUNT(*) as count 
      FROM chatbot_feedback 
      WHERE feedback_type = 'negative' AND tag IS NOT NULL AND source = 'chatbot'
      GROUP BY tag
      ORDER BY count DESC
    `;
    const chatbotTagStatsResult = db.prepare(chatbotTagStatsQuery).all();
    const chatbotTagStats = {};
    chatbotTagStatsResult.forEach(row => {
      chatbotTagStats[row.tag] = row.count;
    });

    // Get tag statistics for conversation source
    const conversationTagStatsQuery = `
      SELECT tag, COUNT(*) as count 
      FROM chatbot_feedback 
      WHERE feedback_type = 'negative' AND tag IS NOT NULL AND source = 'conversation'
      GROUP BY tag
      ORDER BY count DESC
    `;
    const conversationTagStatsResult = db.prepare(conversationTagStatsQuery).all();
    const conversationTagStats = {};
    conversationTagStatsResult.forEach(row => {
      conversationTagStats[row.tag] = row.count;
    });

    res.json({
      success: true,
      stats: {
        // Overall stats (backward compatibility)
        totalPositive: positiveCount.count,
        totalNegative: negativeCount.count,
        total: totalCount.count,
        // Chatbot source stats
        chatbot: {
          totalPositive: chatbotPositive.count,
          totalNegative: chatbotNegative.count,
          total: chatbotTotal.count
        },
        // Conversation source stats
        conversation: {
          totalPositive: conversationPositive.count,
          totalNegative: conversationNegative.count,
          total: conversationTotal.count
        },
        // Tag stats by source
        chatbotTagStats,
        conversationTagStats
      }
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user message statistics (admin only)
router.get('/user-stats', authenticateToken, async (req, res) => {
  try {
    // Count messages per user from chatbot_feedback (each feedback = 1 user message + 1 bot response)
    const userStats = db.prepare(`
      SELECT username, COUNT(*) as messageCount
      FROM chatbot_feedback
      WHERE username IS NOT NULL
      GROUP BY username
      ORDER BY messageCount DESC
    `).all();

    res.json({
      success: true,
      stats: userStats
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all feedbacks (admin and user only) - supports filtering
router.get('/feedback', authenticateToken, async (req, res) => {
  try {
    // Check if user is not chatbot role
    if (req.user.role === 'chatbot') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Chatbot role cannot access feedback management.'
      });
    }

    const { feedbackType, source } = req.query;

    let whereConditions = [];
    let params = [];

    if (feedbackType && ['positive', 'negative'].includes(feedbackType)) {
      whereConditions.push('feedback_type = ?');
      params.push(feedbackType);
    }

    if (source && ['chatbot', 'conversation'].includes(source)) {
      whereConditions.push('source = ?');
      params.push(source);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const feedbacks = db.prepare(`
      SELECT id, user_id, username, message, response, feedback_type, reason, source, conversation_id, message_index, session_id, tag, created_at
      FROM chatbot_feedback
      ${whereClause}
      ORDER BY created_at DESC
    `).all(...params);

    res.json({
      success: true,
      feedbacks
    });
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedbacks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete feedback (admin and user only)
router.delete('/feedback/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is not chatbot role
    if (req.user.role === 'chatbot') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Chatbot role cannot delete feedback.'
      });
    }

    const { id } = req.params;

    // Check if feedback exists
    const feedback = db.prepare('SELECT id FROM chatbot_feedback WHERE id = ?').get(id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Delete the feedback
    db.prepare('DELETE FROM chatbot_feedback WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Save chatbot conversation message
router.post('/conversation/save', authenticateToken, async (req, res) => {
  try {
    const { session_id, role, message } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    // Validate input
    if (!session_id || !role || !message) {
      return res.status(400).json({
        success: false,
        message: 'session_id, role, and message are required'
      });
    }

    if (!['user', 'assistant'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either user or assistant'
      });
    }

    // Insert conversation message
    const stmt = db.prepare(`
      INSERT INTO chatbot_conversations (session_id, user_id, username, role, message)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(session_id, userId, username, role, message);

    res.json({
      success: true,
      message: 'Conversation message saved successfully',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error saving conversation message:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving conversation message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all chatbot conversation sessions (grouped by session_id)
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    // Check if user is not chatbot role
    if (req.user.role === 'chatbot') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Chatbot role cannot access conversation management.'
      });
    }

    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Build search condition
    let searchCondition = '';
    let searchParams = [];

    if (search) {
      searchCondition = 'AND (cc.message LIKE ? OR cc.username LIKE ? OR cc.session_id LIKE ?)';
      const searchPattern = `%${search}%`;
      searchParams = [searchPattern, searchPattern, searchPattern];
    }

    // Get total count of unique sessions
    const totalQuery = `
      SELECT COUNT(DISTINCT session_id) as total
      FROM chatbot_conversations cc
      WHERE 1=1 ${searchCondition}
    `;
    const totalResult = db.prepare(totalQuery).get(...searchParams);
    const total = totalResult.total;

    // Get sessions with message count and latest message info
    const sessionsQuery = `
      SELECT 
        cc.session_id,
        cc.username,
        cc.user_id,
        COUNT(cc.id) as message_count,
        MAX(cc.created_at) as last_message_time,
        (SELECT message FROM chatbot_conversations 
         WHERE session_id = cc.session_id 
         ORDER BY created_at DESC LIMIT 1) as last_message
      FROM chatbot_conversations cc
      WHERE 1=1 ${searchCondition}
      GROUP BY cc.session_id
      ORDER BY last_message_time DESC
      LIMIT ? OFFSET ?
    `;

    const sessions = db.prepare(sessionsQuery).all(...searchParams, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      sessions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalSessions: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get messages for a specific chatbot conversation session
router.get('/conversations/:session_id', authenticateToken, async (req, res) => {
  try {
    // Check if user is not chatbot role
    if (req.user.role === 'chatbot') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Chatbot role cannot access conversation details.'
      });
    }

    const { session_id } = req.params;

    const messages = db.prepare(`
      SELECT id, role, message, created_at
      FROM chatbot_conversations
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(session_id);

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      session_id,
      messages
    });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversation messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
