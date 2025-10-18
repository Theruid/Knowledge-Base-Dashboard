import express from 'express';
import db from '../db.js';

const router = express.Router();

// Note: The tags table is now created in db.js

// Get all tags
router.get('/', (req, res) => {
  try {
    const tags = db.prepare('SELECT * FROM tags ORDER BY name').all();
    
    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tags',
      error: error.message
    });
  }
});

// Add a new tag
router.post('/', (req, res) => {
  try {
    const { name, color } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Tag name is required'
      });
    }
    
    // Check if tag already exists
    const existingTag = db.prepare('SELECT * FROM tags WHERE name = ?').get(name);
    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: 'Tag with this name already exists'
      });
    }
    
    const result = db.prepare(
      'INSERT INTO tags (name, color) VALUES (?, ?)'
    ).run(name, color || '#3b82f6');
    
    const newTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({
      success: true,
      message: 'Tag added successfully',
      data: newTag
    });
  } catch (error) {
    console.error('Error adding tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add tag',
      error: error.message
    });
  }
});

// Update a tag
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Tag name is required'
      });
    }
    
    // Check if tag exists
    const existingTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    if (!existingTag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }
    
    // Check if new name already exists for another tag
    const duplicateTag = db.prepare('SELECT * FROM tags WHERE name = ? AND id != ?').get(name, id);
    if (duplicateTag) {
      return res.status(400).json({
        success: false,
        message: 'Another tag with this name already exists'
      });
    }
    
    db.prepare(
      'UPDATE tags SET name = ?, color = ? WHERE id = ?'
    ).run(name, color || existingTag.color, id);
    
    const updatedTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    
    res.json({
      success: true,
      message: 'Tag updated successfully',
      data: updatedTag
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tag',
      error: error.message
    });
  }
});

// Delete a tag
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if tag exists
    const existingTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    if (!existingTag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }
    
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    
    res.json({
      success: true,
      message: 'Tag deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tag',
      error: error.message
    });
  }
});

// Get tag statistics (count and percentage)
router.get('/stats', (req, res) => {
  try {
    // Get total conversations with notes
    const totalWithNotes = db.prepare('SELECT COUNT(*) as count FROM conversation_notes').get().count;
    
    // Get count for each tag
    const tagStats = db.prepare(`
      SELECT t.id, t.name, t.color, COUNT(cn.id) as count 
      FROM tags t
      LEFT JOIN conversation_notes cn ON cn.tags LIKE '%' || t.name || '%'
      GROUP BY t.id
      ORDER BY count DESC
    `).all();
    
    // Calculate percentages
    const statsWithPercentage = tagStats.map(tag => ({
      ...tag,
      percentage: totalWithNotes > 0 ? Math.round((tag.count / totalWithNotes) * 100) : 0
    }));
    
    res.json({
      success: true,
      data: {
        totalWithNotes,
        tags: statsWithPercentage
      }
    });
  } catch (error) {
    console.error('Error fetching tag statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tag statistics',
      error: error.message
    });
  }
});

export default router;
export { router as tagRoutes };
