import express from 'express';
import db from '../db.js';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Clear conversations table with confirmation
router.post('/clear-conversations', (req, res) => {
  try {
    const { confirmationText } = req.body;
    
    if (!confirmationText || confirmationText !== 'Delete') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation text "Delete" is required to clear the table'
      });
    }
    
    console.log('Clearing existing data from AnalayzeData table...');
    const deleteStmt = db.prepare('DELETE FROM AnalayzeData');
    const deleteResult = deleteStmt.run();
    console.log(`Deleted ${deleteResult.changes} existing records from AnalayzeData table`);
    
    return res.status(200).json({
      success: true,
      message: `Successfully cleared ${deleteResult.changes} records from the conversation table`,
      deletedCount: deleteResult.changes
    });
  } catch (error) {
    console.error('Error clearing conversation table:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear conversation table',
      error: error.message
    });
  }
});

// Import conversations from CSV (append mode)
router.post('/conversations', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // No longer clearing existing data - now in append mode

    // Check for BOM and remove if present
    let buffer = req.file.buffer;
    // UTF-8 BOM is EF BB BF
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      console.log('UTF-8 BOM detected, removing...');
      buffer = buffer.slice(3);
    }
    
    // Create a readable stream from the buffer
    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null);

    const results = [];
    let rowCount = 0;
    let successCount = 0;

    // Log the first few rows for debugging
    console.log('Starting CSV import...');
    
    // Use csv-parser with headers option set to false for files without headers
    bufferStream
      .pipe(csv({
        headers: false,
        skipLines: 0
      }))
      .on('data', (data) => {
        rowCount++;
        
        // Log the first row to see the structure
        if (rowCount === 1) {
          console.log('First row data:', data);
        }

        try {
          // For CSV without headers, data will be an array with numeric keys
          // Assuming the order is: Conversation_ID, IS_BOT, message, Time, LockNumber, Metric1, Metric2
          const isArray = Array.isArray(data) || Object.keys(data).every(key => !isNaN(parseInt(key)));
          
          let conversationId, isBot, message, time, lockNumber, metric1, metric2;
          
          if (isArray) {
            // Handle data as array (no headers)
            const values = isArray ? data : Object.values(data);
            
            // Assign values based on position
            conversationId = values[0];
            isBot = values[1];
            message = values[2];
            time = values[3];
            lockNumber = values[4];
            metric1 = values[5];
            metric2 = values[6];
          } else {
            // Handle data as object (with headers)
            // Find the correct field names regardless of case
            const findField = (possibleNames) => {
              for (const name of possibleNames) {
                if (data[name] !== undefined) return data[name];
              }
              return null;
            };
            
            // Get conversation ID from any possible field name
            conversationId = findField(['Conversation_ID', 'conversation_id', 'ConversationID', 'conversationId', 'CONVERSATION_ID']);
            isBot = findField(['IS_BOT', 'is_bot', 'IsBot', 'isBot']);
            message = findField(['message', 'Message', 'MESSAGE', 'text', 'Text']);
            time = findField(['Time', 'time', 'DATE', 'date', 'timestamp', 'Timestamp']);
            lockNumber = findField(['LockNumber', 'lockNumber', 'lock_number', 'Lock_Number']);
            metric1 = findField(['Metric1', 'metric1', 'METRIC1']);
            metric2 = findField(['Metric2', 'metric2', 'METRIC2']);
          }
          
          // Skip if we can't find a conversation ID or message
          if (!conversationId || !message) {
            console.log(`Skipping row ${rowCount}: Missing conversation ID or message`);
            return;
          }
          
          // Prepare the data for insertion
          const conversationData = {
            Conversation_ID: parseInt(conversationId) || 0,
            IS_BOT: parseInt(isBot) || 0,
            message: message || '',
            Time: time || new Date().toISOString(),
            LockNumber: parseInt(lockNumber) || 0,
            Metric1: metric1 || null,
            Metric2: metric2 || null
          };
          
          // Log a sample of the data being inserted
          if (rowCount <= 3) {
            console.log(`Inserting row ${rowCount}:`, conversationData);
          }

          // Insert into database
          const stmt = db.prepare(
            'INSERT INTO AnalayzeData (Conversation_ID, IS_BOT, message, Time, LockNumber, Metric1, Metric2) VALUES (?, ?, ?, ?, ?, ?, ?)'
          );
          
          stmt.run(
            conversationData.Conversation_ID,
            conversationData.IS_BOT,
            conversationData.message,
            conversationData.Time,
            conversationData.LockNumber,
            conversationData.Metric1,
            conversationData.Metric2
          );
          
          successCount++;
        } catch (err) {
          console.error('Error inserting row:', err);
        }
      })
      .on('end', () => {
        res.json({
          success: true,
          message: `Import completed. ${successCount} of ${rowCount} records imported successfully.`
        });
      })
      .on('error', (err) => {
        throw err;
      });
  } catch (error) {
    console.error('Error importing conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import conversations',
      error: error.message
    });
  }
});

export const importRoutes = router;
