import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { EXTENDED_VOCABULARY } from "./src/vocabulary";

// authoritative state for the BCI Hybrid System
interface BciState {
  text: string;
  cursor_row: number;
  cursor_col: number;
  scan_mode: "ROW" | "COL";
  system_mode: "HYBRID" | "EOG_ONLY";
  eye_direction: "LEFT" | "CENTER" | "RIGHT" | "DISABLED";
  attention_level: number;
  electrode_contact: "GOOD" | "FAIR" | "POOR";
  learned_vocabulary?: string[];
  cursor_updated_at?: number;
  prediction: {
    label: string;
    confidence: number;
    blink_detected: boolean;
    attention_high: boolean;
    eog_raw: number;
    eeg_raw: number;
    system_mode: "HYBRID" | "EOG_ONLY";
    processed: boolean;
  };
}

let appState: BciState = {
  text: "",
  cursor_row: 0,
  cursor_col: 0,
  scan_mode: "ROW",
  system_mode: "HYBRID",
  eye_direction: "CENTER",
  attention_level: 42,
  electrode_contact: "GOOD",
  learned_vocabulary: [],
  cursor_updated_at: 0,
  prediction: {
    label: "RELAX",
    confidence: 0.95,
    blink_detected: false,
    attention_high: false,
    eog_raw: 0,
    eeg_raw: 0,
    system_mode: "HYBRID",
    processed: false
  }
};

// Vocabulary dictionary for server prediction backup
const VOCABULARY = EXTENDED_VOCABULARY;

function getWordSuggestions(text: string, count = 5, learnedVocabulary: string[] = []): string[] {
  const sanitizedLearned = (learnedVocabulary || []).map(w => w.toUpperCase().trim()).filter(w => {
    return w !== "HÁ MỒNG" && w !== "HÁ MỔNG" && w !== "MỒNG" && w !== "MỔNG" && !w.includes("MỒNG") && !w.includes("MỔNG");
  });

  const combinedSet = new Set([...sanitizedLearned, ...VOCABULARY]);
  const fullList = Array.from(combinedSet);

  const endsWithSpace = text.endsWith(" ");

  // Nếu chưa gõ bất kỳ ký tự nào, gợi ý các từ giao tiếp sống còn phổ biến nhất
  if (!text.trim()) {
    const basicStarts = [
      "TÔI", "MUỐN", "CẦN", "GIÚP TÔI", "CHÀO", "CẢM ƠN", "MỆT", "ĐAU", "ĂN", "UỐNG", "NGỦ", "XIN LỖI", "BÁC SĨ", "HÔM NAY"
    ];
    const merged = Array.from(new Set([...sanitizedLearned, ...basicStarts, ...fullList]));
    return merged.slice(0, count);
  }

  const words = text.trim().split(/\s+/);

  if (endsWithSpace) {
    // Kỹ thuật Next-word Prediction: Dự đoán từ tiếp theo dựa trên từ vừa kết thúc trước đó
    const lastCompletedWord = words[words.length - 1].toUpperCase();
    const nextWordSuggestions: string[] = [];
    const prefix = lastCompletedWord + " ";

    for (const phrase of fullList) {
      if (phrase.startsWith(prefix)) {
        const remaining = phrase.slice(prefix.length).trim();
        const nextWord = remaining.split(/\s+/)[0];
        if (nextWord && nextWord !== lastCompletedWord && !nextWordSuggestions.includes(nextWord)) {
          nextWordSuggestions.push(nextWord);
        }
      }
    }

    // Nếu không tìm thấy liên kết phù hợp, gợi ý các trạng từ / động từ giao tiếp mạnh
    const defaultFollows = ["MUỐN", "CẦN", "GIÚP", "ĂN", "UỐNG", "CẢM ƠN", "MỆT", "BÂY GIỜ", "SÁNG NAY", "XIN LỖI"];
    const candidates = Array.from(new Set([...nextWordSuggestions, ...defaultFollows]));
    return candidates.slice(0, count);
  } else {
    // Kỹ thuật Prefix Prediction: Lọc từ bắt đầu bằng phân đoạn chữ đang gõ dở
    const currentWordFragment = words[words.length - 1].toUpperCase();
    const matches = fullList.filter(w => {
      return w.startsWith(currentWordFragment) || w.split(/\s+/)[0].startsWith(currentWordFragment);
    });

    if (matches.length === 0) {
      return fullList.slice(0, count);
    }

    const mappedMatches = matches.map(m => {
      const parts = m.split(/\s+/);
      const idx = parts.findIndex(p => p.startsWith(currentWordFragment));
      if (idx !== -1) {
        return parts.slice(idx).join(" ");
      }
      return m;
    });

    return Array.from(new Set(mappedMatches)).slice(0, count);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // === SERVER-SIDE API ROUTES ===

  // GET State endpoint
  app.get("/api/state", (req, res) => {
    const words = appState.text.trim().split(/\s+/);
    const last = words.length > 0 ? words[words.length - 1] : "";
    const suggestions = getWordSuggestions(last, 5, appState.learned_vocabulary || []);

    res.json({
      ...appState,
      suggestions
    });
  });

  // POST State (Updates authoritative state directly from frontend actions)
  app.post("/api/state", (req, res) => {
    const updates = req.body || {};
    if (updates.text !== undefined) appState.text = updates.text;
    
    const isFromFrontend = updates.source === "frontend";

    if (updates.cursor_row !== undefined) {
      appState.cursor_row = updates.cursor_row;
      if (!isFromFrontend) appState.cursor_updated_at = Date.now();
    }
    if (updates.cursor_col !== undefined) {
      appState.cursor_col = updates.cursor_col;
      if (!isFromFrontend) appState.cursor_updated_at = Date.now();
    }
    if (updates.scan_mode !== undefined) {
      appState.scan_mode = updates.scan_mode;
      if (!isFromFrontend) appState.cursor_updated_at = Date.now();
    }

    if (updates.system_mode !== undefined) appState.system_mode = updates.system_mode;
    if (updates.eye_direction !== undefined) appState.eye_direction = updates.eye_direction;
    if (updates.attention_level !== undefined) appState.attention_level = updates.attention_level;
    if (updates.electrode_contact !== undefined) appState.electrode_contact = updates.electrode_contact;
    if (updates.learned_vocabulary !== undefined) appState.learned_vocabulary = updates.learned_vocabulary;
    if (updates.prediction !== undefined) {
      appState.prediction = { ...appState.prediction, ...updates.prediction };
    }
    res.json({ status: "success", state: appState });
  });

  // Dual-sync endpoint specifically for textBuffer synchronisation
  app.post("/api/sync", (req, res) => {
    const { text, attention_level, eye_direction } = req.body || {};
    if (text !== undefined) {
      appState.text = text;
    }
    if (attention_level !== undefined) {
      appState.attention_level = attention_level;
    }
    if (eye_direction !== undefined) {
      appState.eye_direction = eye_direction;
    }
    res.json({ status: "sync_ok", text: appState.text });
  });

  // RESET state endpoint
  app.get("/api/reset", (req, res) => {
    appState.text = "";
    appState.cursor_row = 0;
    appState.cursor_col = 0;
    appState.scan_mode = "ROW";
    appState.cursor_updated_at = Date.now();
    res.json({ status: "reset_success", text: appState.text });
  });

  // DELETE Last Char/Word endpoint
  app.get("/api/delete_last", (req, res) => {
    if (appState.text.length > 0) {
      appState.text = appState.text.slice(0, -1);
    }
    res.json({ status: "delete_success", text: appState.text });
  });

  // SELECT Suggestion endpoint
  app.post("/api/select_suggestion/:index", (req, res) => {
    const index = parseInt(req.params.index, 10);
    const words = appState.text.trim().split(/\s+/);
    if (words.length === 0 || !appState.text) {
      return res.status(400).json({ status: "no_words" });
    }
    const lastWord = words[words.length - 1];
    const suggestions = getWordSuggestions(lastWord);

    if (suggestions && index < suggestions.length) {
      const chosenWord = suggestions[index];
      words[words.length - 1] = chosenWord;
      appState.text = words.join(" ") + " ";
      return res.json({ status: "success", text: appState.text, selected: chosenWord });
    }
    res.status(400).json({ status: "out_of_bounds" });
  });

  // MANUAL Simulates manual movement coordinates
  app.post("/api/manual_move", (req, res) => {
    const { dir } = req.body || {};
    const step = dir === "LEFT" ? -1 : 1;
    if (appState.scan_mode === "ROW") {
      appState.cursor_row = (appState.cursor_row + step + 7) % 7;
    } else {
      appState.cursor_col = (appState.cursor_col + step + 6) % 6;
    }
    appState.cursor_updated_at = Date.now();
    res.json({ status: "moved", cursor_row: appState.cursor_row, cursor_col: appState.cursor_col, cursor_updated_at: appState.cursor_updated_at });
  });

  // MANUAL Simulates blink activations
  app.post("/api/manual_blink", (req, res) => {
    const { type } = req.body || {}; // 1 = Single, 2 = Double
    if (type === 2) {
      if (appState.text.length > 0) {
        appState.text = appState.text.slice(0, -1);
      }
      appState.prediction = {
        label: "NEUTRAL",
        confidence: 0.95,
        blink_detected: false,
        attention_high: false,
        eog_raw: -120,
        eeg_raw: 15,
        system_mode: appState.system_mode,
        processed: true
      };
    } else {
      appState.prediction = {
        label: "BLINK",
        confidence: 0.98,
        blink_detected: true,
        attention_high: appState.attention_level > 50,
        eog_raw: 980,
        eeg_raw: -45,
        system_mode: appState.system_mode,
        processed: false
      };
    }
    res.json({ status: "sim_triggered", text: appState.text, prediction: appState.prediction });
  });

  // ==========================================
  // 🔌 GIAO TIẾP VỚI PHẦN CỨNG THẬT (ESP32 + AD8232)
  // ==========================================
  // ESP32 sẽ gửi tín hiệu raw EOG/EEG qua WiFi tới Endpoint này (HTTP POST)
  // Ví dụ Payload từ ESP32: { "eog_raw": 512, "eeg_raw": 100, "timestamp": 1234567 }
  app.post("/api/hardware-stream", (req, res) => {
    const { eog_raw, eeg_raw, impedance } = req.body || {};
    
    // Cập nhật Raw data vào trạng thái hệ thống
    if (eog_raw !== undefined) appState.prediction.eog_raw = eog_raw;
    if (eeg_raw !== undefined) appState.prediction.eeg_raw = eeg_raw;
    if (impedance !== undefined && impedance > 20000) {
      appState.electrode_contact = "POOR";
    }

    res.json({ status: "received", accepted: true });
  });

  // Serve static assets or mount Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("[Vite] Integrating developer hot-reload middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Production] Mounting static file server...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NeuroType Backend] Running full-stack on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical: Failed to launch backend container:", err);
});
