import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Proxy endpoint for RAG retrieve
router.post('/rag/retrieve', async (req, res) => {
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
    
    // Forward the request to the actual RAG API
    const response = await fetch(RAG_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      throw new Error(`RAG API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Return the data from the RAG API
    res.json(data);
  } catch (error) {
    console.error('Error proxying request to RAG API:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve data from RAG API',
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
