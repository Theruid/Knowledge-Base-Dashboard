import express from 'express';
import db from '../db.js';

const router = express.Router();

// Get all knowledge entries with pagination
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const domain = req.query.domain || '';

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM Knowledges';
    let countParams = [];
    let whereClauseAdded = false;
    
    // Add domain filter if provided
    if (domain) {
      countQuery += ' WHERE domain = ?';
      countParams.push(domain);
      whereClauseAdded = true;
    }
    
    if (search) {
      // Check if search is a number to search in knowledge_number field
      const isNumeric = !isNaN(search) && !isNaN(parseFloat(search));
      
      if (isNumeric) {
        countQuery += whereClauseAdded ? ' AND (knowledge_number = ? OR problem LIKE ? OR detailed_solution LIKE ?)' : ' WHERE knowledge_number = ? OR problem LIKE ? OR detailed_solution LIKE ?';
        countParams.push(parseInt(search), `%${search}%`, `%${search}%`);
      } else {
        countQuery += whereClauseAdded ? ' AND (problem LIKE ? OR detailed_solution LIKE ?)' : ' WHERE problem LIKE ? OR detailed_solution LIKE ?';
        countParams.push(`%${search}%`, `%${search}%`);
      }
    }
    
    const countResult = db.prepare(countQuery).get(...countParams);
    
    // Get paginated results
    let query = 'SELECT * FROM Knowledges';
    let params = [];
    whereClauseAdded = false;
    
    // Add domain filter if provided
    if (domain) {
      query += ' WHERE domain = ?';
      params.push(domain);
      whereClauseAdded = true;
    }
    
    if (search) {
      // Check if search is a number to search in knowledge_number field
      const isNumeric = !isNaN(search) && !isNaN(parseFloat(search));
      
      if (isNumeric) {
        query += whereClauseAdded ? ' AND (knowledge_number = ? OR problem LIKE ? OR detailed_solution LIKE ?)' : ' WHERE knowledge_number = ? OR problem LIKE ? OR detailed_solution LIKE ?';
        params.push(parseInt(search), `%${search}%`, `%${search}%`);
      } else {
        query += whereClauseAdded ? ' AND (problem LIKE ? OR detailed_solution LIKE ?)' : ' WHERE problem LIKE ? OR detailed_solution LIKE ?';
        params.push(`%${search}%`, `%${search}%`);
      }
    }
    
    query += ' ORDER BY UniqueID ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const data = db.prepare(query).all(...params);
    
    res.json({
      success: true,
      total: countResult.total,
      page,
      totalPages: Math.ceil(countResult.total / limit),
      data
    });
  } catch (error) {
    console.error('Error fetching knowledge entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch knowledge entries',
      error: error.message
    });
  }
});

// Get count of unique knowledge numbers
router.get('/stats/unique-knowledge', (req, res) => {
  try {
    const result = db.prepare('SELECT COUNT(DISTINCT knowledge_number) as uniqueCount FROM Knowledges').get();
    
    res.json({
      success: true,
      data: {
        uniqueCount: result.uniqueCount
      }
    });
  } catch (error) {
    console.error('Error fetching unique knowledge count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unique knowledge count',
      error: error.message
    });
  }
});

// Get all available domains
router.get('/domains', (req, res) => {
  try {
    // Query to get all distinct domains, excluding null and empty values
    const domains = db.prepare("SELECT DISTINCT domain FROM Knowledges WHERE domain IS NOT NULL AND domain != '' ORDER BY domain").all();
    
    // Extract domain values from the result objects
    const domainList = domains.map(item => item.domain);
    
    res.json({
      success: true,
      data: domainList
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch domains',
      error: error.message
    });
  }
});

// Get a single knowledge entry
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const entry = db.prepare('SELECT * FROM Knowledges WHERE UniqueID = ?').get(id);
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge entry not found'
      });
    }
    
    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Error fetching knowledge entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch knowledge entry',
      error: error.message
    });
  }
});

// Create a new knowledge entry
router.post('/', (req, res) => {
  try {
    const { knowledge_number, problem, detailed_solution, domain } = req.body;
    
    if (!problem || !detailed_solution) {
      return res.status(400).json({
        success: false,
        message: 'Problem and detailed solution are required'
      });
    }
    
    const stmt = db.prepare(
      'INSERT INTO Knowledges (knowledge_number, problem, detailed_solution, domain) VALUES (?, ?, ?, ?)'
    );
    
    const result = stmt.run(knowledge_number || 0, problem, detailed_solution, domain || '');
    
    res.status(201).json({
      success: true,
      message: 'Knowledge entry created successfully',
      data: {
        UniqueID: result.lastInsertRowid,
        knowledge_number,
        problem,
        detailed_solution,
        domain
      }
    });
  } catch (error) {
    console.error('Error creating knowledge entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create knowledge entry',
      error: error.message
    });
  }
});

// Update a knowledge entry
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { knowledge_number, problem, detailed_solution, domain } = req.body;
    
    if (!problem || !detailed_solution) {
      return res.status(400).json({
        success: false,
        message: 'Problem and detailed solution are required'
      });
    }
    
    const entry = db.prepare('SELECT * FROM Knowledges WHERE UniqueID = ?').get(id);
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge entry not found'
      });
    }
    
    const stmt = db.prepare(
      'UPDATE Knowledges SET knowledge_number = ?, problem = ?, detailed_solution = ?, domain = ? WHERE UniqueID = ?'
    );
    
    stmt.run(knowledge_number || 0, problem, detailed_solution, domain || '', id);
    
    res.json({
      success: true,
      message: 'Knowledge entry updated successfully',
      data: {
        UniqueID: parseInt(id),
        knowledge_number,
        problem,
        detailed_solution,
        domain
      }
    });
  } catch (error) {
    console.error('Error updating knowledge entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update knowledge entry',
      error: error.message
    });
  }
});

// Delete a knowledge entry
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const entry = db.prepare('SELECT * FROM Knowledges WHERE UniqueID = ?').get(id);
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge entry not found'
      });
    }
    
    db.prepare('DELETE FROM Knowledges WHERE UniqueID = ?').run(id);
    
    res.json({
      success: true,
      message: 'Knowledge entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting knowledge entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete knowledge entry',
      error: error.message
    });
  }
});

export const knowledgeRoutes = router;