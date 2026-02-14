import express from 'express';
import db from '../db.js';
import { Parser } from 'json2csv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug route to check if the router is working
router.get('/debug', (req, res) => {
  console.log('Export debug route hit');
  res.status(200).json({ message: 'Export routes are working' });
});

// Export knowledge entries as CSV
router.get('/knowledge', (req, res) => {
  try {
    // Get all knowledge entries
    const entries = db.prepare('SELECT * FROM Knowledges').all();

    if (entries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No knowledge entries found to export'
      });
    }

    // Define fields for CSV
    const fields = ['UniqueID', 'knowledge_number', 'problem', 'detailed_solution', 'domain'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(entries);

    // Add BOM for Excel to recognize UTF-8
    const csvWithBOM = '\ufeff' + csv;

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=knowledge_export.csv');

    // Send CSV data with UTF-8 encoding and BOM
    res.send(csvWithBOM);
  } catch (error) {
    console.error('Error exporting knowledge entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export knowledge entries',
      error: error.message
    });
  }
});

// Export conversations as CSV
router.get('/conversations', (req, res) => {
  try {
    // Check if AnalayzeData table exists (note the spelling from the database check)
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='AnalayzeData'").get();

    if (!tableExists) {
      return res.status(404).json({
        success: false,
        message: 'Table AnalayzeData does not exist'
      });
    }

    // Query to get all data from AnalayzeData table
    const conversations = db.prepare(`
      SELECT 
        Conversation_ID,
        IS_BOT,
        message,
        Time,
        LockNumber,
        Metric1,
        Metric2
      FROM AnalayzeData
      ORDER BY Conversation_ID ASC
    `).all();

    // Even if there are no conversations, return an empty CSV file with headers
    // This is more user-friendly than returning a 404 error

    // Define fields for CSV export
    const fields = [
      'Conversation_ID',
      'IS_BOT',
      'message',
      'Time',
      'LockNumber',
      'Metric1',
      'Metric2'
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(conversations);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=conversations.csv');
    // Add BOM for Excel compatibility
    res.send('\ufeff' + csv);

  } catch (error) {
    console.error('Error exporting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export conversations',
      error: error.message
    });
  }
});


// Vector DB initialization endpoint has been moved to FastAPI app.py


export const exportRoutes = router;
