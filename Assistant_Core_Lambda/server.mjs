import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// >>> ADD THIS LINE HERE <<<
app.get('/', (_req, res) => res.send('Core is up. POST /chat'));

// OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const msgs = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const messages = [{ role: 'system', content: 'You are a helpful assistant.' }, ...msgs];

    const out = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.3,
      messages,
    });

    const reply = out.choices?.[0]?.message?.content?.trim?.() ?? '';
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).send(err?.message || 'Server error');
  }
});

const PORT = Number(process.env.PORT || 8787);
app.listen(PORT, () => console.log(`Core listening on http://localhost:${PORT}`));
