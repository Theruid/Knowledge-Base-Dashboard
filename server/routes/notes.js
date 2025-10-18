import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../routes/auth.js';

const router = express.Router();

// Authentication is now handled per-route instead of globally

// Note: The conversation_notes table is now created in db.js with user_id and username columns

// Get all notes for a conversation
router.get('/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const notes = db.prepare(
      'SELECT * FROM conversation_notes WHERE conversation_id = ? ORDER BY created_at DESC'
    ).all(conversationId);
    
    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error('Error fetching conversation notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation notes',
      error: error.message
    });
  }
});

// Add a note to a conversation
router.post('/', authenticateToken, (req, res) => {
  try {
    const { conversationId, note, tags } = req.body;
    // User is guaranteed to be authenticated due to middleware
    const userId = req.user.id;
    const username = req.user.username;
    
    if (!conversationId || !note) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID and note are required'
      });
    }
    
    // Convert tags array to string if provided
    const tagsString = tags && Array.isArray(tags) ? tags.join(',') : tags;
    
    const result = db.prepare(
      'INSERT INTO conversation_notes (conversation_id, note, tags, user_id, username) VALUES (?, ?, ?, ?, ?)'
    ).run(conversationId, note, tagsString, userId, username);
    
    const newNote = db.prepare('SELECT * FROM conversation_notes WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: newNote
    });
  } catch (error) {
    console.error('Error adding conversation note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add conversation note',
      error: error.message
    });
  }
});

// Update a note
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { note, tags } = req.body;
    const userId = req.user.id;
    const username = req.user.username;
    
    if (!note) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }
    
    // Convert tags array to string if provided
    const tagsString = tags && Array.isArray(tags) ? tags.join(',') : tags;
    
    // Check if note exists
    const existingNote = db.prepare('SELECT * FROM conversation_notes WHERE id = ?').get(id);
    
    if (!existingNote) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    // Check if user is the owner of the note or an admin
    if (existingNote.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this note'
      });
    }
    
    db.prepare(
      'UPDATE conversation_notes SET note = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(note, tagsString, id);
    
    const updatedNote = db.prepare('SELECT * FROM conversation_notes WHERE id = ?').get(id);
    
    res.json({
      success: true,
      message: 'Note updated successfully',
      data: updatedNote
    });
  } catch (error) {
    console.error('Error updating conversation note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update conversation note',
      error: error.message
    });
  }
});

// Delete a note
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if note exists
    const existingNote = db.prepare('SELECT * FROM conversation_notes WHERE id = ?').get(id);
    
    if (!existingNote) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    db.prepare('DELETE FROM conversation_notes WHERE id = ?').run(id);
    
    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting conversation note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation note',
      error: error.message
    });
  }
});

export const noteRoutes = router;
