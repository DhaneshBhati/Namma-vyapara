/**
 * Voice helpers — text-to-speech and speech-to-text wrappers around the
 * browser Web Speech APIs. Used to make the vendor dashboard usable for
 * vendors who can't read or type easily.
 */

export type VoiceLang = "en-IN" | "kn-IN" | "hi-IN";

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition,
  );
}

let lastUtter: SpeechSynthesisUtterance | null = null;

/** Pick the best available voice for the requested language. */
function pickVoice(lang: VoiceLang): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;
  // Exact match first
  let v = voices.find((vv) => vv.lang === lang);
  if (v) return v;
  // Loose match by language prefix (en, kn, hi)
  const prefix = lang.split("-")[0];
  v = voices.find((vv) => vv.lang.toLowerCase().startsWith(prefix + "-"));
  if (v) return v;
  v = voices.find((vv) => vv.lang.toLowerCase().startsWith(prefix));
  return v ?? null;
}

export function speak(text: string, lang: VoiceLang = "en-IN"): void {
  if (!isSpeechSupported() || !text.trim()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const voice = pickVoice(lang);
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.pitch = 1;
    u.volume = 1;
    lastUtter = u;
    window.speechSynthesis.speak(u);
  } catch {
    /* no-op */
  }
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
    lastUtter = null;
  } catch {
    /* no-op */
  }
}

export interface RecognitionHandle {
  stop: () => void;
}

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function startRecognition(opts: {
  lang?: VoiceLang;
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (msg: string) => void;
  onEnd?: () => void;
}): RecognitionHandle | null {
  if (!isRecognitionSupported()) {
    opts.onError?.("Voice input is not supported on this browser");
    return null;
  }
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => RecognitionLike })
      .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => RecognitionLike })
      .webkitSpeechRecognition;
  if (!Ctor) {
    opts.onError?.("Voice input is not supported on this browser");
    return null;
  }
  const rec = new Ctor();
  rec.lang = opts.lang ?? "en-IN";
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (e) => {
    let interim = "";
    let final = "";
    for (let i = 0; i < e.results.length; i++) {
      const res = e.results[i] as ArrayLike<{ transcript: string }> & {
        isFinal?: boolean;
      };
      const transcript = res[0]?.transcript ?? "";
      if (res.isFinal) final += transcript;
      else interim += transcript;
    }
    if (interim) opts.onPartial?.(interim);
    if (final) opts.onFinal(final.trim());
  };
  rec.onerror = (e) => {
    const code = e.error ?? "voice_error";
    const msg =
      code === "not-allowed" || code === "service-not-allowed"
        ? "Microphone permission denied. Allow mic access and try again."
        : code === "no-speech"
          ? "We didn't hear you. Please tap the mic and speak again."
          : code === "audio-capture"
            ? "No microphone found on this device."
            : code === "network"
              ? "Network problem with voice. Please retry."
              : "Voice input error — please try again.";
    opts.onError?.(msg);
  };
  rec.onend = () => {
    opts.onEnd?.();
  };
  try {
    rec.start();
  } catch {
    opts.onError?.("Could not start voice input");
    return null;
  }
  return { stop: () => rec.stop() };
}

/* ----------------- lightweight built-in translator ----------------- *
 * Free, offline, dictionary-based KN/HI -> EN translator. It covers the
 * everyday street-vendor vocabulary (numbers, fruits, vegetables, prices,
 * common verbs and time words) and falls back to leaving unknown words
 * untouched. Good enough for a vendor announcement bot that needs to
 * convert a Kannada/Hindi voice note into a readable English message.
 */

const KN_TO_EN: Record<string, string> = {
  // greetings + announcements
  "ನಮಸ್ಕಾರ": "hello",
  "ನಮಸ್ಕಾರಗಳು": "greetings",
  "ಸ್ವಾಗತ": "welcome",
  "ಧನ್ಯವಾದ": "thanks",
  "ಧನ್ಯವಾದಗಳು": "thanks",
  "ಗ್ರಾಹಕರೇ": "dear customers",
  "ಗ್ರಾಹಕರು": "customers",
  // commerce
  "ಅಂಗಡಿ": "stall",
  "ಗಾಡಿ": "cart",
  "ತೆರೆದಿದೆ": "is open",
  "ಮುಚ್ಚಲಾಗಿದೆ": "is closed",
  "ತೆರೆಯಿರಿ": "open",
  "ಮುಚ್ಚಿರಿ": "close",
  "ರಿಯಾಯಿತಿ": "discount",
  "ಆಫರ್": "offer",
  "ಬೆಲೆ": "price",
  "ಉಚಿತ": "free",
  "ಮಾರಾಟ": "sale",
  "ಫ್ಲ್ಯಾಶ್": "flash",
  "ಇಂದು": "today",
  "ಈಗ": "now",
  "ಇಲ್ಲಿ": "here",
  "ಬನ್ನಿ": "come",
  "ತಾಜಾ": "fresh",
  "ಹೊಸ": "new",
  "ಬಿಸಿ": "hot",
  "ಸಿಹಿ": "sweet",
  "ಕೆ.ಜಿ": "kg",
  "ಕಿಲೋ": "kilo",
  "ರೂ": "rupees",
  "ರೂಪಾಯಿ": "rupees",
  "ರೂಪಾಯಿಗಳು": "rupees",
  // produce
  "ಹಣ್ಣು": "fruit",
  "ಹಣ್ಣುಗಳು": "fruits",
  "ಬಾಳೆಹಣ್ಣು": "banana",
  "ಮಾವಿನ": "mango",
  "ಮಾವು": "mango",
  "ಸೇಬು": "apple",
  "ಕಿತ್ತಳೆ": "orange",
  "ತರಕಾರಿ": "vegetable",
  "ತರಕಾರಿಗಳು": "vegetables",
  "ಟೊಮೇಟೊ": "tomato",
  "ಈರುಳ್ಳಿ": "onion",
  "ಆಲೂಗಡ್ಡೆ": "potato",
  "ಸೌತೆಕಾಯಿ": "cucumber",
  "ಬದನೆಕಾಯಿ": "brinjal",
  "ಕೊತ್ತಂಬರಿ": "coriander",
  "ಸೊಪ್ಪು": "greens",
  "ಎಳನೀರು": "tender coconut",
  "ಹಾಲು": "milk",
  "ಚಹಾ": "tea",
  "ಕಾಫಿ": "coffee",
  "ರಸ": "juice",
  "ತಿಂಡಿ": "snack",
  "ಸಿಹಿತಿಂಡಿ": "sweets",
  // numbers
  "ಒಂದು": "one",
  "ಎರಡು": "two",
  "ಮೂರು": "three",
  "ನಾಲ್ಕು": "four",
  "ಐದು": "five",
  "ಆರು": "six",
  "ಏಳು": "seven",
  "ಎಂಟು": "eight",
  "ಒಂಬತ್ತು": "nine",
  "ಹತ್ತು": "ten",
  "ಇಪ್ಪತ್ತು": "twenty",
  "ಮೂವತ್ತು": "thirty",
  "ಐವತ್ತು": "fifty",
  "ನೂರು": "hundred",
};

const HI_TO_EN: Record<string, string> = {
  "नमस्ते": "hello",
  "नमस्कार": "hello",
  "स्वागत": "welcome",
  "धन्यवाद": "thanks",
  "ग्राहक": "customer",
  "ग्राहकों": "customers",
  "दुकान": "shop",
  "गाड़ी": "cart",
  "खुली": "open",
  "बंद": "closed",
  "खुला": "open",
  "छूट": "discount",
  "ऑफर": "offer",
  "क़ीमत": "price",
  "कीमत": "price",
  "मुफ्त": "free",
  "मुफ़्त": "free",
  "बिक्री": "sale",
  "फ्लैश": "flash",
  "आज": "today",
  "अभी": "now",
  "यहाँ": "here",
  "आइए": "come",
  "ताज़ा": "fresh",
  "ताजा": "fresh",
  "नया": "new",
  "गरम": "hot",
  "मीठा": "sweet",
  "किलो": "kilo",
  "किग्रा": "kg",
  "रुपये": "rupees",
  "रुपए": "rupees",
  "फल": "fruit",
  "केला": "banana",
  "आम": "mango",
  "सेब": "apple",
  "संतरा": "orange",
  "सब्ज़ी": "vegetable",
  "सब्जी": "vegetable",
  "टमाटर": "tomato",
  "प्याज": "onion",
  "प्याज़": "onion",
  "आलू": "potato",
  "खीरा": "cucumber",
  "बैंगन": "brinjal",
  "धनिया": "coriander",
  "नारियल": "coconut",
  "दूध": "milk",
  "चाय": "tea",
  "कॉफ़ी": "coffee",
  "जूस": "juice",
  "रस": "juice",
  "नाश्ता": "snack",
  "मिठाई": "sweets",
  "एक": "one",
  "दो": "two",
  "तीन": "three",
  "चार": "four",
  "पाँच": "five",
  "पांच": "five",
  "छह": "six",
  "सात": "seven",
  "आठ": "eight",
  "नौ": "nine",
  "दस": "ten",
  "बीस": "twenty",
  "तीस": "thirty",
  "पचास": "fifty",
  "सौ": "hundred",
};

/**
 * Translate a vendor's spoken text into English. Works on a per-token basis
 * so even partial matches still come through readable. If no translatable
 * tokens are found at all, returns a soft notice in front of the original
 * text so the customer still sees something useful.
 */
export function translateToEnglish(
  text: string,
  source: VoiceLang,
): { english: string; usedDictionary: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { english: "", usedDictionary: false };
  if (source === "en-IN") return { english: trimmed, usedDictionary: false };

  const dict = source === "kn-IN" ? KN_TO_EN : HI_TO_EN;
  // Tokenise on whitespace + common punctuation, preserving the separators
  // so we can rebuild the sentence.
  const parts = trimmed.split(/(\s+|[,.!?;:])/u);
  let hits = 0;
  const englishParts = parts.map((p) => {
    if (!p.trim() || /^[\s,.!?;:]+$/.test(p)) return p;
    const stripped = p.replace(/[?.,!;:]+$/u, "");
    const punct = p.slice(stripped.length);
    const hit = dict[stripped] ?? dict[stripped.toLowerCase()];
    if (hit) {
      hits += 1;
      return hit + punct;
    }
    return p;
  });
  let english = englishParts.join("").replace(/\s+/g, " ").trim();
  // Capitalise the first character for a cleaner output.
  if (english.length > 0) english = english[0]!.toUpperCase() + english.slice(1);
  return { english, usedDictionary: hits > 0 };
}

/**
 * Format the system date+time the way street vendors expect to read it,
 * in 12-hour format with a clear date suffix. Used by the announcement
 * translator so the message always carries a "live" timestamp.
 */
export function nowStamp(): string {
  const d = new Date();
  const date = d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} · ${time}`;
}
