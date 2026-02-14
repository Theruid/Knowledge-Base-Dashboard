import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { knowledgeRoutes } from './routes/knowledge.js';
import { conversationRoutes } from './routes/conversation.js';
import { exportRoutes } from './routes/export.js';
import { importRoutes } from './routes/import.js';
import { proxyRoutes } from './routes/proxy.js';
import { authRoutes, authenticateToken } from './routes/auth.js';
import chatbotRoutes from './routes/chatbot.js';
import { settingsRoutes } from './routes/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/conversation', conversationRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/settings', settingsRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = join(__dirname, '../dist');
  app.use(express.static(clientBuildPath));

  // Fallback route for client-side routing
  app.get('*', (req, res) => {
    // Only handle non-API routes
    if (!req.path.startsWith('/api/')) {
      res.sendFile(join(clientBuildPath, 'index.html'));
    } else {
      res.status(404).json({
        success: false,
        message: 'API endpoint not found'
      });
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'An error occurred on the server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});