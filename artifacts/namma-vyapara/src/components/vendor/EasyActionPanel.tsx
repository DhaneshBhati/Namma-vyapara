import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Volume2,
  Mic,
  MicOff,
  DoorOpen,
  DoorClosed,
  Megaphone,
  Languages,
  ArrowRight,
} from "lucide-react";
import {
  speak,
  stopSpeaking,
  startRecognition,
  isRecognitionSupported,
  translateToEnglish,
  nowStamp,
  type RecognitionHandle,
  type VoiceLang,
} from "@/lib/voice";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Action {
  key: "open" | "close" | "translate" | "announce";
  labelEn: string;
  labelKn: string;
  labelHi: string;
  speakEn: string;
  speakKn: string;
  speakHi: string;
  Icon: React.ComponentType<{ className?: string }>;
  bg: string;
  fg: string;
}

const ACTIONS: Action[] = [
  {
    key: "open",
    labelEn: "Open Stall",
    labelKn: "ಅಂಗಡಿ ತೆರೆಯಿರಿ",
    labelHi: "दुकान खोलें",
    speakEn: "Your stall is now open. Customers can find you on the map.",
    speakKn: "ನಿಮ್ಮ ಅಂಗಡಿ ತೆರೆದಿದೆ. ಗ್ರಾಹಕರು ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಬಹುದು.",
    speakHi: "आपकी दुकान अब खुली है। ग्राहक नक्शे पर देख सकते हैं।",
    Icon: DoorOpen,
    bg: "bg-accent/15",
    fg: "text-accent",
  },
  {
    key: "close",
    labelEn: "Close Stall",
    labelKn: "ಅಂಗಡಿ ಮುಚ್ಚಿರಿ",
    labelHi: "दुकान बंद करें",
    speakEn: "Your stall is closed. Live sharing has stopped.",
    speakKn: "ನಿಮ್ಮ ಅಂಗಡಿ ಮುಚ್ಚಲಾಗಿದೆ. ಲೈವ್ ಹಂಚಿಕೆ ನಿಂತಿದೆ.",
    speakHi: "आपकी दुकान बंद है। लाइव शेयरिंग रुक गई है।",
    Icon: DoorClosed,
    bg: "bg-muted",
    fg: "text-muted-foreground",
  },
  {
    key: "translate",
    labelEn: "Translator Bot",
    labelKn: "ಅನುವಾದ ಬಾಟ್",
    labelHi: "अनुवादक बॉट",
    speakEn:
      "Tap the microphone, speak in your language, and I will translate to English with the date and time.",
    speakKn:
      "ಮೈಕ್ ಒತ್ತಿ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ. ನಾನು ಇಂಗ್ಲಿಷ್‌ಗೆ ಅನುವಾದಿಸುತ್ತೇನೆ.",
    speakHi:
      "माइक दबाइए और अपनी भाषा में बोलिए। मैं अंग्रेज़ी में अनुवाद कर दूँगा।",
    Icon: Languages,
    bg: "bg-secondary/15",
    fg: "text-secondary",
  },
  {
    key: "announce",
    labelEn: "Speak Announcement",
    labelKn: "ಧ್ವನಿ ಮೂಲಕ ಘೋಷಣೆ",
    labelHi: "आवाज़ से घोषणा",
    speakEn: "Tap the microphone, then speak your message.",
    speakKn: "ಮೈಕ್ ಒತ್ತಿ, ನಂತರ ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಹೇಳಿ.",
    speakHi: "माइक दबाएँ, फिर अपना संदेश बोलें।",
    Icon: Megaphone,
    bg: "bg-primary/15",
    fg: "text-primary",
  },
];

interface Props {
  vendorName: string;
  /** Whether the stall is currently open. Controlled by the parent. */
  stallOpen: boolean;
  /** Toggle stall state. */
  onStallChange: (open: boolean) => void;
  /** Fires with the final transcript (in original language). */
  onAnnounce: (text: string, lang: VoiceLang) => void;
}

const labelFor = (a: Action, lang: VoiceLang) =>
  lang === "kn-IN" ? a.labelKn : lang === "hi-IN" ? a.labelHi : a.labelEn;
const speakFor = (a: Action, lang: VoiceLang) =>
  lang === "kn-IN" ? a.speakKn : lang === "hi-IN" ? a.speakHi : a.speakEn;

export function EasyActionPanel({
  vendorName,
  stallOpen,
  onStallChange,
  onAnnounce,
}: Props) {
  const { lang, setLang } = useLanguage();
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [partial, setPartial] = useState("");
  const [translated, setTranslated] = useState("");
  const [stamp, setStamp] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<RecognitionHandle | null>(null);
  const welcomedRef = useRef(false);

  // Welcome speech once on mount.
  useEffect(() => {
    if (welcomedRef.current) return;
    welcomedRef.current = true;
    const t = window.setTimeout(() => {
      const msg =
        lang === "kn-IN"
          ? `ಸ್ವಾಗತ ${vendorName}. ದೊಡ್ಡ ಬಟನ್ ಒತ್ತಿ ಕೆಲಸ ಮಾಡಿ.`
          : lang === "hi-IN"
            ? `स्वागत ${vendorName}। बड़ा बटन दबाकर काम करें।`
            : `Welcome ${vendorName}. Tap a big button to do anything.`;
      speak(msg, lang);
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sayLabel = (a: Action, e: React.MouseEvent) => {
    e.stopPropagation();
    speak(labelFor(a, lang), lang);
  };

  const handleAction = (a: Action) => {
    if (a.key === "announce") {
      setTranscript("");
      setPartial("");
      setAnnounceOpen(true);
      speak(speakFor(a, lang), lang);
      return;
    }
    if (a.key === "translate") {
      setTranscript("");
      setPartial("");
      setTranslated("");
      setStamp(nowStamp());
      setTranslateOpen(true);
      speak(speakFor(a, lang), lang);
      return;
    }
    if (a.key === "open") {
      onStallChange(true);
      toast.success("Stall opened — live sharing on");
    } else if (a.key === "close") {
      onStallChange(false);
      toast.message("Stall closed — live sharing off");
    }
    speak(speakFor(a, lang), lang);
  };

  const startListening = (recLang: VoiceLang) => {
    setTranscript("");
    setPartial("");
    if (!isRecognitionSupported()) {
      toast.error("Voice input is not supported on this browser");
      return;
    }
    setListening(true);
    const handle = startRecognition({
      lang: recLang,
      onPartial: (t) => setPartial(t),
      onFinal: (t) => {
        setTranscript((prev) => (prev ? `${prev} ${t}` : t));
        setPartial("");
      },
      onError: (msg) => {
        toast.error(msg);
        setListening(false);
      },
      onEnd: () => {
        setListening(false);
        setPartial("");
      },
    });
    recRef.current = handle;
  };

  const stopListening = () => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  };

  const submitAnnouncement = () => {
    const text = transcript.trim();
    if (!text) {
      toast.error("Please speak or type a message first");
      speak(
        lang === "kn-IN"
          ? "ದಯವಿಟ್ಟು ಸಂದೇಶವನ್ನು ಹೇಳಿ ಅಥವಾ ಬರೆಯಿರಿ."
          : lang === "hi-IN"
            ? "कृपया पहले संदेश बोलें या लिखें।"
            : "Please speak or type a message first.",
        lang,
      );
      return;
    }
    onAnnounce(text, lang);
    setAnnounceOpen(false);
    setTranscript("");
    speak(
      lang === "kn-IN"
        ? "ಘೋಷಣೆಯನ್ನು ಗ್ರಾಹಕರಿಗೆ ಕಳುಹಿಸಲಾಗಿದೆ."
        : lang === "hi-IN"
          ? "घोषणा ग्राहकों को भेज दी गई।"
          : "Your announcement was sent to nearby customers.",
      lang,
    );
  };

  const doTranslate = () => {
    const text = transcript.trim();
    if (!text) {
      toast.error("Speak something to translate");
      return;
    }
    const { english } = translateToEnglish(text, lang);
    setTranslated(english);
    setStamp(nowStamp());
    speak(english, "en-IN");
  };

  return (
    <>
      <Card className="p-6 border-2 border-secondary/40">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-secondary font-semibold">
              Easy Mode
            </div>
            <div className="font-serif text-2xl mt-1">
              Big buttons. Voice help. No reading needed.
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ದೊಡ್ಡ ಬಟನ್, ಧ್ವನಿ ಸಹಾಯ — ಓದುವ ಅಗತ್ಯವಿಲ್ಲ.
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
              <button
                onClick={() => {
                  setLang("en-IN");
                  speak("English selected", "en-IN");
                }}
                className={`px-3 py-1.5 ${
                  lang === "en-IN"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-background hover:bg-muted"
                }`}
                data-testid="button-lang-en"
              >
                EN
              </button>
              <button
                onClick={() => {
                  setLang("kn-IN");
                  speak("ಕನ್ನಡ ಆಯ್ಕೆಯಾಗಿದೆ", "kn-IN");
                }}
                className={`px-3 py-1.5 ${
                  lang === "kn-IN"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-background hover:bg-muted"
                }`}
                data-testid="button-lang-kn"
              >
                ಕನ್ನಡ
              </button>
              <button
                onClick={() => {
                  setLang("hi-IN");
                  speak("हिंदी चुनी गई", "hi-IN");
                }}
                className={`px-3 py-1.5 ${
                  lang === "hi-IN"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-background hover:bg-muted"
                }`}
                data-testid="button-lang-hi"
              >
                हिंदी
              </button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                stopSpeaking();
                speak(
                  lang === "kn-IN"
                    ? "ಧ್ವನಿ ನಿಲ್ಲಿಸಲಾಗಿದೆ."
                    : lang === "hi-IN"
                      ? "आवाज़ रोक दी गई।"
                      : "Voice stopped.",
                  lang,
                );
              }}
              data-testid="button-stop-voice"
            >
              Stop voice
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ACTIONS.map((a) => {
            const isOpenBtn = a.key === "open";
            const isCloseBtn = a.key === "close";
            const showActiveOpen = isOpenBtn && stallOpen;
            const showActiveClose = isCloseBtn && !stallOpen;
            const active = showActiveOpen || showActiveClose;
            return (
              <button
                key={a.key}
                onClick={() => handleAction(a)}
                className={`relative rounded-2xl border-2 p-4 sm:p-5 text-left hover-elevate transition-colors min-h-[140px] flex flex-col items-start justify-between ${
                  active
                    ? "border-secondary bg-secondary/10"
                    : "border-border bg-background"
                }`}
                data-testid={`easy-action-${a.key}`}
              >
                <div
                  className={`h-12 w-12 rounded-xl grid place-items-center ${a.bg}`}
                >
                  <a.Icon className={`h-7 w-7 ${a.fg}`} />
                </div>
                <div className="mt-3">
                  <div className="text-base font-semibold">{labelFor(a, lang)}</div>
                  <div className="text-xs text-muted-foreground">
                    {lang === "kn-IN" ? a.labelEn : a.labelKn}
                  </div>
                </div>
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => sayLabel(a, e)}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full grid place-items-center bg-muted hover:bg-secondary/20 cursor-pointer"
                  aria-label="Read aloud"
                  data-testid={`easy-action-speak-${a.key}`}
                >
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          Tap any button to do something. Tap the speaker icon to hear what it
          does. ಯಾವುದೇ ಬಟನ್ ಒತ್ತಿ ಕೆಲಸ ಮಾಡಿ. ಸ್ಪೀಕರ್ ಒತ್ತಿ ಕೇಳಿ.
        </div>
      </Card>

      {/* Announcement dialog */}
      <Dialog
        open={announceOpen}
        onOpenChange={(o) => {
          if (!o) stopListening();
          setAnnounceOpen(o);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Speak your announcement
            </DialogTitle>
            <DialogDescription>
              Tap the mic and say your message. We'll send it to nearby
              customers. ಮೈಕ್ ಒತ್ತಿ ನಿಮ್ಮ ಸಂದೇಶ ಹೇಳಿ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={listening ? stopListening : () => startListening(lang)}
                className={`h-20 w-20 rounded-full ${
                  listening
                    ? "bg-destructive hover:bg-destructive/90"
                    : "bg-primary hover:bg-primary/90"
                }`}
                data-testid="button-mic"
              >
                {listening ? (
                  <MicOff className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              {listening
                ? "Listening... speak now"
                : "Tap mic to speak · ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿ"}
            </div>

            <div className="rounded-lg border border-input bg-background p-3 min-h-[88px] text-sm">
              {transcript ? (
                <span>{transcript}</span>
              ) : (
                <span className="text-muted-foreground">
                  Your message will appear here...
                </span>
              )}
              {partial && (
                <span className="text-muted-foreground italic"> {partial}</span>
              )}
            </div>

            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={2}
              placeholder="Or type if you prefer..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              data-testid="textarea-easy-announce"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                stopListening();
                setAnnounceOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={submitAnnouncement}
              data-testid="button-easy-announce-send"
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Translator dialog */}
      <Dialog
        open={translateOpen}
        onOpenChange={(o) => {
          if (!o) stopListening();
          setTranslateOpen(o);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-secondary" />
              Translator bot · {lang === "kn-IN" ? "ಕನ್ನಡ → English" : lang === "hi-IN" ? "हिंदी → English" : "English"}
            </DialogTitle>
            <DialogDescription>
              Speak in your language. We translate to English and stamp the
              system date and time so customers always know when you said it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={listening ? stopListening : () => startListening(lang)}
                className={`h-16 w-16 rounded-full ${
                  listening
                    ? "bg-destructive hover:bg-destructive/90"
                    : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                }`}
                data-testid="button-translator-mic"
              >
                {listening ? (
                  <MicOff className="h-7 w-7" />
                ) : (
                  <Mic className="h-7 w-7" />
                )}
              </Button>
              <Button
                onClick={doTranslate}
                disabled={!transcript.trim() || listening}
                data-testid="button-translate-now"
              >
                Translate <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                You said
              </div>
              <div className="rounded-lg border border-input bg-background p-3 min-h-[64px] text-sm">
                {transcript || (
                  <span className="text-muted-foreground">
                    Tap mic and speak in {lang === "kn-IN" ? "Kannada" : lang === "hi-IN" ? "Hindi" : "English"}…
                  </span>
                )}
                {partial && (
                  <span className="text-muted-foreground italic"> {partial}</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center justify-between">
                <span>English translation</span>
                {stamp && (
                  <span className="font-mono normal-case text-foreground">
                    {stamp}
                  </span>
                )}
              </div>
              <div className="rounded-lg border-2 border-secondary/40 bg-secondary/5 p-3 min-h-[64px] text-sm">
                {translated || (
                  <span className="text-muted-foreground">
                    Translation will appear here…
                  </span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                stopListening();
                setTranslateOpen(false);
              }}
            >
              Close
            </Button>
            {translated && (
              <Button
                onClick={() => {
                  const text = `${translated} (${stamp})`;
                  onAnnounce(text, "en-IN");
                  setTranslateOpen(false);
                }}
                data-testid="button-translate-broadcast"
              >
                Send English to customers
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
