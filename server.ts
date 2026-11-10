import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Shared Gemini Client with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Lyria AI Music Generation Endpoint (lyria-3-clip-preview & lyria-3-pro-preview)
app.post('/api/music/generate', async (req, res) => {
  try {
    const { prompt, model = 'lyria-3-clip-preview' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt string is required' });
    }

    const selectedModel = model === 'lyria-3-pro-preview' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';
    console.log(`[Lyria API] Generating music with ${selectedModel}: "${prompt}"`);

    // Lyria streaming audio generation
    const responseStream = await ai.models.generateContentStream({
      model: selectedModel,
      contents: prompt,
    });

    const audioChunks: Buffer[] = [];
    let lyrics = '';
    let mimeType = 'audio/mpeg';

    for await (const chunk of responseStream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.inlineData?.data) {
          if (audioChunks.length === 0 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
        }
        if (part.text) {
          lyrics += part.text;
        }
      }
    }

    if (audioChunks.length === 0) {
      console.warn('[Lyria API] No audio chunks returned from model stream');
      return res.status(500).json({ error: 'No audio data was returned by the Lyria model' });
    }

    const audioBase64 = Buffer.concat(audioChunks).toString('base64');
    const audioDataUrl = `data:${mimeType};base64,${audioBase64}`;

    console.log(`[Lyria API] Music generated successfully (${(audioBase64.length / 1024).toFixed(1)} KB)`);

    return res.json({
      success: true,
      audioDataUrl,
      lyrics,
      model: selectedModel,
      prompt,
    });
  } catch (error: any) {
    console.error('[Lyria API Error]:', error);

    const errorMessage = error.message || 'Unknown music generation error';
    return res.status(500).json({
      error: errorMessage,
      isQuotaOrKeyError: /PERMISSION_DENIED|RESOURCE_EXHAUSTED|API_KEY/i.test(errorMessage),
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

async function startServer() {
  const distPath = fs.existsSync(path.resolve(__dirname, 'index.html'))
    ? __dirname
    : path.resolve(__dirname, 'dist');

  if (process.env.NODE_ENV === 'production' || fs.existsSync(path.resolve(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TikTok LIVE Studio full-stack server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
