import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper for calling Gemini with Exponential Backoff retry on transient errors
async function callGeminiWithRetry(
  apiCall: () => Promise<any>,
  maxRetries: number = 3,
  initialDelay: number = 300
) {
  let delay = initialDelay;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      const errorMsg = String(error.message || "").toLowerCase();
      const errorStatus = error.status || error.code || error.statusCode || 0;

      const isHardBillingLimit =
        errorMsg.includes("plan") ||
        errorMsg.includes("billing") ||
        errorMsg.includes("exceeded your current quota") ||
        errorMsg.includes("exceeded your current billing quota");

      if (isHardBillingLimit) {
        // Customize error for hard billing limits to fail fast and be descriptive
        const friendlyMsg = "Gemini API 额度已超限 (API Quota/Billing Exceeded)。请在 Settings(设置) -> Secrets 菜单更换有效的 API KEY，或者如果是免费版已超出当日用量上限，需等待次日重置。";
        const enhancedError = new Error(friendlyMsg);
        Object.assign(enhancedError, { status: 429, code: 429, originalError: error });
        throw enhancedError;
      }

      const isTransient =
        errorStatus === 503 ||
        errorStatus === 429 ||
        errorStatus === 500 ||
        errorMsg.includes("503") ||
        errorMsg.includes("500") ||
        errorMsg.includes("internal error") ||
        errorMsg.includes("unavailable") ||
        errorMsg.includes("high demand") ||
        errorMsg.includes("limit") ||
        errorMsg.includes("quota") ||
        errorMsg.includes("temporary") ||
        errorMsg.includes("overloaded");

      if (isTransient && attempt < maxRetries) {
        console.warn(`[Gemini] Transient error (${errorMsg.substring(0, 150)}), retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2.5; // exponential backoff
      } else {
        break;
      }
    }
  }
  throw lastError;
}

// AI TTS Proxy
app.post("/api/gemini/tts", async (req, res) => {
  try {
    const { text, voiceName = 'Charon', speedInstruction = 'at a natural pace' } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });
    console.log(`[TTS] Request: "${text.substring(0, 50)}..." voice: ${voiceName}`);
    
    const startTime = Date.now();
    let response;
    
    try {
      // Stage 1: Try with requested voice
      response = await callGeminiWithRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: `Say this ${speedInstruction} in English: ${text}`,
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName
                }
              }
            }
          }
        });
      }, 2, 250); // fast fail (2 attempts starting at 250ms)
    } catch (voiceError: any) {
      console.warn(`[TTS] Primary TTS attempt with voice '${voiceName}' failed: ${voiceError.message || voiceError}. Trying generic fallback voice 'Kore'.`);
      try {
        // Stage 2: Fallback to highly stable 'Kore' voice
        response = await callGeminiWithRetry(async () => {
          return await ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: `Say this ${speedInstruction} in English: ${text}`,
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Kore"
                  }
                }
              }
            }
          });
        }, 1, 200);
      } catch (fallbackError: any) {
        console.warn(`[TTS] Fallback voice 'Kore' also failed: ${fallbackError.message || fallbackError}. Trying without custom voiceConfig.`);
        // Stage 3: Try without speechConfig completely (uses model default voice)
        response = await callGeminiWithRetry(async () => {
          return await ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: `Say this ${speedInstruction} in English: ${text}`,
            config: {
              responseModalities: ["AUDIO"]
            }
          });
        }, 1, 200);
      }
    }

    console.log(`[TTS] Gemini response time: ${Date.now() - startTime}ms`);

    // Detailed check of candidate structure as per skill/SDK
    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p: any) => p.inlineData && p.inlineData.data);
    const base64Audio = audioPart?.inlineData?.data;

    if (!base64Audio || typeof base64Audio !== 'string') {
      console.error("[TTS] Invalid audio data found. Candidate structure:", JSON.stringify(candidate).substring(0, 500));
      return res.status(500).json({ 
        error: "No audio generated by AI model",
        details: "Invalid audio data format"
      });
    }

    console.log(`[TTS] Success: ${base64Audio.length} bytes of audio data`);
    res.json({ data: base64Audio });
  } catch (error: any) {
    console.error("[TTS] error:", error);
    const status = error.status || error.code || 500;
    const isStatusValid = typeof status === "number" && status >= 400 && status < 600;
    res.status(isStatusValid ? status : 500).json({ error: error.message || "Internal Server Error" });
  }
});

// AI Content Generation Proxy (for analysis, chat, etc.)
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { model = "gemini-3.5-flash", contents, config } = req.body;
    
    // Protect against deprecated or banned models
    let targetModel = model;
    if (targetModel === "gemini-2.0-flash" || targetModel === "gemini-1.5-flash") {
      targetModel = "gemini-3.5-flash";
    }

    // Try target model, and fallback to stable models if needed
    const modelsToTry = [
      targetModel,
      targetModel !== "gemini-3.5-flash" ? "gemini-3.5-flash" : null,
      targetModel !== "gemini-3.1-flash-lite" ? "gemini-3.1-flash-lite" : null,
    ].filter(Boolean) as string[];

    let response;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Gemini/generate] Executing request using model: ${modelName}`);
        response = await callGeminiWithRetry(async () => {
          return await ai.models.generateContent({
            model: modelName,
            contents,
            config
          });
        });
        if (response) {
          console.log(`[Gemini/generate] Successfully parsed response from model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.error(`[Gemini/generate] Error/timeout trying model ${modelName}:`, err.message || err);
      }
    }

    if (!response) {
      throw lastError || new Error("All attempts on fallback models failed due to transient loading issues");
    }

    res.json({ text: response.text, candidates: response.candidates });
  } catch (error: any) {
    console.error("Gemini generation error:", error);
    const status = error.status || error.code || 500;
    const isStatusValid = typeof status === "number" && status >= 400 && status < 600;
    res.status(isStatusValid ? status : 500).json({ error: error.message || "Internal Server Error" });
  }
});

// Music Generation Proxy
app.post("/api/gemini/music", async (req, res) => {
  try {
    const { prompt, model = "lyria-3-clip-preview" } = req.body;
    const response = await ai.models.generateContentStream({
      model,
      contents: prompt,
    });

    let audioBase64 = "";
    let lyrics = "";
    let mimeType = "audio/wav";

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
        if (part.text && !lyrics) {
          lyrics = part.text;
        }
      }
    }
    
    res.json({ audioBase64, lyrics, mimeType });
  } catch (error: any) {
    console.error("Music error:", error);
    const status = error.status || error.code || 500;
    const isStatusValid = typeof status === "number" && status >= 400 && status < 600;
    res.status(isStatusValid ? status : 500).json({ error: error.message || "Internal Server Error" });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
