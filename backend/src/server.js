require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3200;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'poolside/laguna-xs.2:free';
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:4200';
const APP_TITLE = process.env.APP_TITLE || 'AI Resume Analyzer';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.set('trust proxy', 1);

// 🔥 RATE LIMITER (HYBRID: clientId + IP)
const analyzeLimiter = rateLimit({
  windowMs: 2 * 60 * 60 * 1000,
  max: 2,
  keyGenerator: (req) => {
    const clientId = req.body?.clientId || 'anon';

    // ✅ SAFE IP handling
    const ip = ipKeyGenerator(req);

    return `${ip}-${clientId}`;
  },
  message: {
    error: 'Too many requests. Please try again after 2 hours.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ---------------- PDF LOGIC ----------------

let pdfjsLibPromise;
function getPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsLibPromise;
}

async function extractTextFromPDF(buffer) {
  const pdfjsLib = await getPdfJs();
  const pdfData = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    fullText += `${pageText} `;
  }

  return fullText;
}

// ---------------- UTIL FUNCTIONS ----------------

function extractJsonObject(text) {
  if (!text || typeof text !== 'string') return null;

  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch (_) {
      return null;
    }
  }
}

function normalizeModelContent(message) {
  if (!message) return '';

  if (typeof message.content === 'string') return message.content;

  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('\n')
      .trim();
  }

  if (typeof message.reasoning === 'string') {
    return message.reasoning;
  }

  return '';
}

function normalizeAnalysisShape(parsed) {
  return {
    score: Number(parsed?.score ?? 0),
    strengths: Array.isArray(parsed?.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed?.weaknesses) ? parsed.weaknesses : [],
    keywordsMatched: Number(parsed?.keywordsMatched ?? 0),
    missingKeywords: Number(parsed?.missingKeywords ?? 0),
    contentQuality: Number(parsed?.contentQuality ?? 0)
  };
}

function normalizeJdAnalysisShape(parsed) {
  return {
    score: Number(parsed?.score ?? 0),
    jobMatchScore: Number(parsed?.jobMatchScore ?? parsed?.score ?? 0),
    strengths: Array.isArray(parsed?.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed?.weaknesses) ? parsed.weaknesses : [],
    missingKeywords: Array.isArray(parsed?.missingKeywords) ? parsed.missingKeywords : [],
    improvementPointers: Array.isArray(parsed?.improvementPointers) ? parsed.improvementPointers : []
  };
}

async function callOpenRouter(prompt, maxTokens = 400) {
  return axios.post(
    OPENROUTER_URL,
    {
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: maxTokens,
      temperature: 0.2
    },
    {
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': APP_ORIGIN,
        'X-Title': APP_TITLE
      }
    }
  );
}

// ---------------- ROUTES ----------------

app.get('/health', (_, res) => {
  res.json({ ok: true, service: 'backend', port: Number(PORT) });
});

// APPLY RATE LIMIT HERE
app.post('/analyze', analyzeLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY' });
    }

    const { file } = req.body;
    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const buffer = Buffer.from(file, 'base64');
    let text = await extractTextFromPDF(buffer);

    if (!text || text.trim().length === 0) {
      return res.json({
        score: 0,
        strengths: [],
        weaknesses: ['Unable to extract readable text from resume'],
        keywordsMatched: 0,
        missingKeywords: 0,
        contentQuality: 0
      });
    }

    text = text
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E]/g, '')
      .trim()
      .slice(0, 3000);

    const prompt = `
You are an ATS resume analyzer.

Be strict and concise.

Return ONLY valid JSON:
{
"score": number,
"strengths": string[],
"weaknesses": string[],
"keywordsMatched": number,
"missingKeywords": number,
"contentQuality": number
}

Resume:
${text}
`;

    let response = await callOpenRouter(prompt, 400);

    const message = response?.data?.choices?.[0]?.message;
    const raw = normalizeModelContent(message);
    let parsed = extractJsonObject(raw);
    let finishReason = response?.data?.choices?.[0]?.finish_reason;

    if (!parsed && finishReason === 'length') {
      const retryPrompt = `
Return ONLY minified valid JSON with this exact shape:
{"score":number,"strengths":string[],"weaknesses":string[],"keywordsMatched":number,"missingKeywords":number,"contentQuality":number}
Rules:
- score must be 0 to 100
- strengths max 5 items
- weaknesses max 5 items
- keywordsMatched must be 0 to 40
- missingKeywords must be 0 to 25
- contentQuality must be 0 to 100
- each item under 120 chars
- no markdown, no explanation

Resume:
${text}
`;

      response = await callOpenRouter(retryPrompt, 800);
      const retryMessage = response?.data?.choices?.[0]?.message;
      const retryRaw = normalizeModelContent(retryMessage);
      parsed = extractJsonObject(retryRaw);
      finishReason = response?.data?.choices?.[0]?.finish_reason;

      if (parsed) {
        return res.json(normalizeAnalysisShape(parsed));
      }
    }

    if (!parsed) {
      const failedMessage = response?.data?.choices?.[0]?.message;
      const failedRaw = normalizeModelContent(failedMessage);
      console.error('JSON Parse Error:', {
        model: OPENROUTER_MODEL,
        finishReason,
        message: failedMessage,
        raw: failedRaw
      });
      return res.status(500).json({
        error: 'Invalid JSON from AI',
        raw: failedRaw || null,
        finishReason: finishReason || null
      });
    }

    return res.json(normalizeAnalysisShape(parsed));

  } catch (err) {
    console.error('FULL ERROR:', err.response?.data || err.message);
    return res.status(500).json({
      error: err.response?.data || err.message
    });
  }
});

app.post('/analyze-jd', analyzeLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY in backend/.env' });
  }

    const { file, jobDescription } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    const buffer = Buffer.from(file, 'base64');
    let resumeText = await extractTextFromPDF(buffer);

    if (!resumeText || resumeText.trim().length === 0) {
      return res.json({
        score: 0,
        jobMatchScore: 0,
        strengths: [],
        weaknesses: ['Unable to extract readable text from resume'],
        missingKeywords: [],
        improvementPointers: []
      });
    }

    resumeText = resumeText.replace(/\n/g, ' ').replace(/\s+/g, ' ').replace(/[^\x20-\x7E]/g, '').trim().slice(0, 3500);
    const jdText = jobDescription.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2500);

    const prompt = `
You are an ATS resume analyzer comparing a resume against a job description.

Return ONLY valid JSON:
{
"score": number,
"jobMatchScore": number,
"strengths": string[],
"weaknesses": string[],
"missingKeywords": string[],
"improvementPointers": string[]
}

Rules:
- score and jobMatchScore must be 0 to 100
- strengths max 5
- weaknesses max 5
- missingKeywords max 10
- improvementPointers max 7
- each array item must be short and actionable

Job Description:
${jdText}

Resume:
${resumeText}
`;

    let response = await callOpenRouter(prompt, 900);
    let raw = normalizeModelContent(response?.data?.choices?.[0]?.message);
    let parsed = extractJsonObject(raw);
    let finishReason = response?.data?.choices?.[0]?.finish_reason;

    if (!parsed && finishReason === 'length') {
      const retryPrompt = `
Return ONLY minified valid JSON with this exact shape:
{"score":number,"jobMatchScore":number,"strengths":string[],"weaknesses":string[],"missingKeywords":string[],"improvementPointers":string[]}
Use short actionable phrases only.

Job Description:
${jdText}

Resume:
${resumeText}
`;
      response = await callOpenRouter(retryPrompt, 1200);
      raw = normalizeModelContent(response?.data?.choices?.[0]?.message);
      parsed = extractJsonObject(raw);
      finishReason = response?.data?.choices?.[0]?.finish_reason;
    }

    if (!parsed) {
      return res.status(500).json({
        error: 'Invalid JSON from AI',
        raw: raw || null,
        finishReason: finishReason || null
      });
    }

    return res.json(normalizeJdAnalysisShape(parsed));
  } catch (err) {
    console.error('FULL ERROR (JD):', err.response?.data || err.message);
    return res.status(500).json({
      error: err.response?.data || err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
