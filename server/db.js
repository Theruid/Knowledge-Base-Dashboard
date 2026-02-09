import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../knsystem.db');

// Check if the database file exists
if (!fs.existsSync(dbPath)) {
  console.warn(`Database file not found at ${dbPath}. Creating new database.`);
}

const db = new Database(dbPath, { verbose: console.log });

// Initialize all database tables if they don't exist

// Knowledges table
db.exec(`
  CREATE TABLE IF NOT EXISTS Knowledges (
    UniqueID INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_number INTEGER,
    problem TEXT,
    detailed_solution TEXT
  )
`);

// Users table for authentication
db.exec(`
  CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_activated INTEGER DEFAULT 0,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
  );
`);

// Check if admin user exists
const adminExists = db.prepare('SELECT 1 FROM Users WHERE username = ? OR email = ?').get('admin', 'admin@example.com');

// Create admin user if it doesn't exist
if (!adminExists) {
  // Hash the password
  const saltRounds = 10;
  const adminPassword = 'admin123';
  const hashedPassword = bcrypt.hashSync(adminPassword, saltRounds);

  // Insert admin user
  const stmt = db.prepare('INSERT INTO Users (username, email, password, is_activated, role) VALUES (?, ?, ?, ?, ?)');
  stmt.run('admin', 'admin@example.com', hashedPassword, 1, 'admin');

  console.log('Admin user created with username: admin and password: admin123');
}

// AnalayzeData table (based on the screenshot)
db.exec(`
  CREATE TABLE IF NOT EXISTS AnalayzeData (
    Conversation_ID INTEGER PRIMARY KEY,
    IS_BOT INTEGER,
    message TEXT,
    Time TIMESTAMP,
    LockNumber INTEGER,
    Metric1 TEXT,
    Metric2 TEXT
  )
`);

// conversation_notes table
db.exec(`
  CREATE TABLE IF NOT EXISTS conversation_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    note TEXT,
    tags TEXT,
    user_id INTEGER,
    username TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id)
  )
`);

// tags table
db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// chatbot_feedback table
db.exec(`
  CREATE TABLE IF NOT EXISTS chatbot_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    feedback_type TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id)
  )
`);

export default db;