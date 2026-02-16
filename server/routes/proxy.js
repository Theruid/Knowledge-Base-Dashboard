import express from 'express';
import fetch from 'node-fetch';
import https from 'https';
import { authenticateToken } from './auth.js';
import db from '../db.js';

const router = express.Router();

// Create an https agent that ignores SSL errors (like curl -k)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Helper function to get chatbot API URL based on environment setting
const getChatbotApiUrl = () => {
  try {
    const setting = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('chatbot_environment');
    const env = setting?.value || 'dev';

    const urls = {
      dev: 'https://sg-nlp-dev.ml.abramad.com/masoud-ragaas/rag_chatbot',
      prod: 'https://sg-nlp.ml.abramad.com/rag_chatbot'
    };

    return urls[env] || urls.dev;
  } catch (error) {
    console.error('Error reading chatbot environment setting:', error);
    // Fallback to dev URL
    return 'https://sg-nlp-dev.ml.abramad.com/masoud-ragaas/rag_chatbot';
  }
};

// Proxy endpoint for RAG Chatbot
router.post('/rag-chatbot', async (req, res) => {
  try {
    const { text, history } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text parameter is required'
      });
    }

    // Get API URL based on environment setting (dev/prod)
    const CHATBOT_API_URL = getChatbotApiUrl();
    console.log(`Forwarding Chatbot request to: ${CHATBOT_API_URL}`);

    // Add timeout handling - 90 seconds for RAG responses
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      console.error('Chatbot API request timed out after 90 seconds');
    }, 90000);

    try {
      // Forward the request to the Chatbot API
      const response = await fetch(CHATBOT_API_URL, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'X-Customer-ID': 'sepidar_test', // Hardcoded as per plan
          'X-API-Key': 'dev_api_key',       // Hardcoded as per plan
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          history: history || []
        }),
        agent: httpsAgent,
        signal: controller.signal
      });

      clearTimeout(timeout);

      // The external API returns plain text/markdown, not JSON
      const responseText = await response.text();
      console.log(`Chatbot API response status: ${response.status}`);
      console.log(`Chatbot API response body (first 200 chars): ${responseText.substring(0, 200)}...`);

      if (!response.ok) {
        console.error(`Chatbot API error ${response.status}`);
        return res.status(response.status).json({
          success: false,
          message: `Chatbot API responded with status: ${response.status}`,
          debug: responseText
        });
      }

      // Return the text response wrapped in a JSON object
      res.json({
        success: true,
        answer: responseText,
        history: history || []
      });
    } catch (error) {
      clearTimeout(timeout);

      // Handle timeout errors separately
      if (error.name === 'AbortError') {
        console.error('Chatbot API request was aborted due to timeout');
        return res.status(504).json({
          success: false,
          message: 'The chatbot is taking too long to respond. Please try again.',
          error: 'Request timeout'
        });
      }

      console.error('Error proxying request to Chatbot API:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve response from Chatbot API',
        error: error.message
      });
    }
  } catch (error) {
    // This catch handles errors from parameter validation or unexpected errors
    console.error('Unexpected error in rag-chatbot endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Proxy endpoint for RAG retrieve (requires authentication - accessible by all authenticated users including chatbot role)
router.post('/rag/retrieve', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text parameter is required'
      });
    }

    // Get RAG API URL from environment variable or use default
    const RAG_API_URL = process.env.RAG_API_URL || 'http://172.17.224.86:8686/rag/retrieve/';
    console.log(`Forwarding RAG request to: ${RAG_API_URL}`);

    // Add timeout handling - 30 seconds for RAG retrieval
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      console.error('RAG API request timed out after 30 seconds');
    }, 30000);

    try {
      // Forward the request to the actual RAG API
      const response = await fetch(RAG_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`RAG API responded with status: ${response.status}`);
      }

      const data = await response.json();

      // Return the data from the RAG API
      res.json(data);
    } catch (error) {
      clearTimeout(timeout);

      // Handle timeout errors
      if (error.name === 'AbortError') {
        console.error('RAG API request was aborted due to timeout');
        return res.status(504).json({
          success: false,
          message: 'RAG retrieval timed out. Please try again.',
          error: 'Request timeout'
        });
      }

      console.error('Error proxying request to RAG API:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve data from RAG API',
        error: error.message
      });
    }
  } catch (error) {
    // Handles errors from validation or unexpected issues
    console.error('Unexpected error in rag/retrieve endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Proxy endpoint for Gemini API
router.post('/gemini/generate', async (req, res) => {
  try {
    const { prompt, temperature, topK, topP, maxOutputTokens } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt parameter is required'
      });
    }

    // Get Gemini API key from environment variable
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDWkZKTiKfrVDl1PPpSLbwUBno4OfNC6rE';
    const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    console.log(`Forwarding Gemini request to model: ${GEMINI_MODEL}`);

    // Forward the request to the Gemini API
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: temperature || 0.2,
          topK: topK || 40,
          topP: topP || 0.95,
          maxOutputTokens: maxOutputTokens || 1024
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Return the data from the Gemini API
    res.json(data);
  } catch (error) {
    console.error('Error proxying request to Gemini API:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate content from Gemini API',
      error: error.message
    });
  }
});

export const proxyRoutes = router;
