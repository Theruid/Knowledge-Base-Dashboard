import express from 'express';
import db from '../db.js';

const router = express.Router();

// Get paginated list of conversations with search and sorting
router.get('/list', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const sortField = req.query.sortField || 'Conversation_ID';
    const sortDirection = req.query.sortDirection || 'desc';
    const onlyAnalyzed = req.query.onlyAnalyzed === 'true'; // New filter parameter
    const offset = (page - 1) * limit;

    // Validate sort field to prevent SQL injection
    const validSortFields = ['Conversation_ID', 'message_count'];
    const actualSortField = validSortFields.includes(sortField) ? sortField : 'Conversation_ID';

    // Validate sort direction
    const actualSortDirection = ['asc', 'desc'].includes(sortDirection.toLowerCase())
      ? sortDirection.toLowerCase()
      : 'desc';

    let query = `
      SELECT 
        c.Conversation_ID,
        COUNT(*) as message_count,
        MIN(c.Time) as first_message_time,
        MAX(c.Time) as last_message_time,
        CASE 
          WHEN bc.bot_count = fc.feedback_count AND bc.bot_count > 0 THEN 1 
          ELSE 0 
        END as analyzed
      FROM AnalayzeData c
      LEFT JOIN (
        SELECT Conversation_ID, COUNT(*) as bot_count 
        FROM AnalayzeData 
        WHERE IS_BOT = 1 
        GROUP BY Conversation_ID
      ) bc ON c.Conversation_ID = bc.Conversation_ID
      LEFT JOIN (
        SELECT conversation_id, COUNT(DISTINCT message_index) as feedback_count
        FROM chatbot_feedback
        WHERE source = 'conversation'
        GROUP BY conversation_id
      ) fc ON c.Conversation_ID = fc.conversation_id
    `;

    // Base query for counting total conversations
    let countQuery = 'SELECT COUNT(DISTINCT a.Conversation_ID) as total FROM AnalayzeData a';
    let countParams = [];

    const params = [];
    let whereConditions = [];

    // Add search condition
    if (search) {
      // Check if search is a number (potential conversation ID)
      const isNumeric = !isNaN(search) && !isNaN(parseFloat(search));

      if (isNumeric) {
        // Search by conversation ID
        whereConditions.push('c.Conversation_ID = ?');
        params.push(parseInt(search));

        countQuery += ' WHERE a.Conversation_ID = ?';
        countParams = [parseInt(search)];
      } else {
        // Search by message content
        whereConditions.push('c.message LIKE ?');
        params.push(`%${search}%`);

        countQuery += ' WHERE a.message LIKE ?';
        countParams = [`%${search}%`];
      }
    }


    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    // Complete the queries
    query += ` GROUP BY c.Conversation_ID ORDER BY ${actualSortField === 'Conversation_ID' ? 'c.' + actualSortField : actualSortField} ${actualSortDirection} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Execute the count query
    const countResult = db.prepare(countQuery).get(...countParams);

    // Execute the main query
    const conversations = db.prepare(query).all(...params);

    res.json({
      success: true,
      total: countResult.total,
      page,
      totalPages: Math.ceil(countResult.total / limit),
      data: conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
});

// Get all unique conversation IDs (for backward compatibility)
router.get('/ids', (req, res) => {
  try {
    const result = db.prepare('SELECT DISTINCT Conversation_ID FROM AnalayzeData ORDER BY Conversation_ID').all();

    res.json({
      success: true,
      data: result.map(item => item.Conversation_ID)
    });
  } catch (error) {
    console.error('Error fetching conversation IDs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation IDs',
      error: error.message
    });
  }
});


// Get conversation messages by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const messages = db.prepare(
      'SELECT * FROM AnalayzeData WHERE Conversation_ID = ? ORDER BY Time'
    ).all(id);

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation',
      error: error.message
    });
  }
});

// Get conversation statistics
router.get('/stats/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Get total messages
    const totalMessages = db.prepare(
      'SELECT COUNT(*) as count FROM AnalayzeData WHERE Conversation_ID = ?'
    ).get(id);

    // Get bot messages count
    const botMessages = db.prepare(
      'SELECT COUNT(*) as count FROM AnalayzeData WHERE Conversation_ID = ? AND IS_BOT = 1'
    ).get(id);

    // Get user messages count
    const userMessages = db.prepare(
      'SELECT COUNT(*) as count FROM AnalayzeData WHERE Conversation_ID = ? AND IS_BOT = 0'
    ).get(id);

    if (totalMessages.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      data: {
        totalMessages: totalMessages.count,
        botMessages: botMessages.count,
        userMessages: userMessages.count
      }
    });
  } catch (error) {
    console.error('Error fetching conversation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation statistics',
      error: error.message
    });
  }
});

// Get conversations by LOCK number
router.get('/by-lock/:lockNumber', (req, res) => {
  try {
    const { lockNumber } = req.params;

    const conversations = db.prepare(
      'SELECT DISTINCT Conversation_ID FROM AnalayzeData WHERE LockNumber = ? ORDER BY Time DESC'
    ).all(lockNumber);

    if (conversations.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    res.json({
      success: true,
      data: conversations.map(item => item.Conversation_ID)
    });
  } catch (error) {
    console.error('Error fetching conversations by LOCK number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations by LOCK number',
      error: error.message
    });
  }
});

// Get daily chat counts for the last 10 days
router.get('/daily-counts', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 10;

    // Query to get conversation counts per day for the last N days
    const result = db.prepare(`
      SELECT 
        DATE(Time) as date,
        COUNT(DISTINCT Conversation_ID) as count
      FROM AnalayzeData
      WHERE Time >= date('now', '-' || ? || ' days')
      GROUP BY DATE(Time)
      ORDER BY date DESC
      LIMIT ?
    `).all(days, days);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching daily conversation counts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily conversation counts',
      error: error.message
    });
  }
});

export const conversationRoutes = router;
