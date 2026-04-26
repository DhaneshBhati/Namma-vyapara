import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sprout,
  Trash2,
  Plus,
  Mic,
  MicOff,
  Languages,
  ArrowRight,
  Clock,
} from "lucide-react";
import {
  getFreshnessItems,
  setFreshnessItems,
  type FreshnessItem,
} from "@/lib/session";
import {
  startRecognition,
  isRecognitionSupported,
  translateToEnglish,
  speak,
  type RecognitionHandle,
} from "@/lib/voice";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  vendorPhone: string;
  subcategory?: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(iso: string): number {
  const d = new Date(iso + "T00:00:00");
  const t = new Date(todayIso() + "T00:00:00");
  return Math.max(0, Math.round((t.getTime() - d.getTime()) / 86400000));
}

function freshnessTone(days: number) {
  if (days <= 0)
    return { label: "Fresh today", color: "bg-accent/15 text-accent border-accent/40" };
  if (days === 1)
    return { label: "1 day old", color: "bg-secondary/15 text-secondary border-secondary/40" };
  if (days === 2)
    return {
      label: "2 days old",
      color: "bg-amber-500/15 text-amber-600 border-amber-500/40",
    };
  return {
    label: `${days} days old`,
    color: "bg-destructive/15 text-destructive border-destructive/40",
  };
}

function formatNow(): string {
  return new Date().toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function FreshnessBoard({ vendorPhone, subcategory }: Props) {
  const [items, setItems] = useState<FreshnessItem[]>([]);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [partial, setPartial] = useState("");
  const [translated, setTranslated] = useState("");
  const [listening, setListening] = useState(false);
  const [nowLabel, setNowLabel] = useState(formatNow());
  const recRef = useRef<RecognitionHandle | null>(null);
  const { lang } = useLanguage();

  useEffect(() => {
    setItems(getFreshnessItems(vendorPhone));
  }, [vendorPhone]);

  // Update the live time label every minute so the panel always reflects the
  // current system time (no manual entry needed).
  useEffect(() => {
    const id = window.setInterval(() => setNowLabel(formatNow()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const persist = (next: FreshnessItem[]) => {
    setItems(next);
    setFreshnessItems(vendorPhone, next);
  };

  const addItem = () => {
    if (!name.trim()) {
      toast.error("Please enter the item name");
      return;
    }
    const item: FreshnessItem = {
      id: `f_${Date.now()}`,
      name: name.trim(),
      qty: qty.trim() || "—",
      // Always stamp as today using system time — no manual date.
      purchasedAt: todayIso(),
    };
    persist([item, ...items]);
    setName("");
    setQty("");
    toast.success(`${item.name} added · stocked at ${formatNow()}`);
  };

  const removeItem = (id: string) => {
    persist(items.filter((i) => i.id !== id));
    toast.message("Removed from stock");
  };

  const stopListening = () => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  };

  const startListening = () => {
    if (!isRecognitionSupported()) {
      toast.error("Voice input is not supported on this browser");
      return;
    }
    setTranscript("");
    setPartial("");
    setListening(true);
    const handle = startRecognition({
      lang,
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

  const doTranslate = () => {
    const t = transcript.trim();
    if (!t) {
      toast.error("Speak the item first");
      return;
    }
    const { english } = translateToEnglish(t, lang);
    setTranslated(english);
    speak(english, "en-IN");
  };

  const acceptVoiceItem = () => {
    const text = (translated || transcript).trim();
    if (!text) {
      toast.error("Nothing to add");
      return;
    }
    // Try to split into "<name> <qty>" using the last token as qty if numeric.
    const tokens = text.split(/\s+/);
    let parsedName = text;
    let parsedQty = "";
    if (tokens.length >= 2) {
      const last = tokens[tokens.length - 1]!;
      if (/[0-9]/.test(last)) {
        parsedQty = last;
        parsedName = tokens.slice(0, -1).join(" ");
      }
    }
    const item: FreshnessItem = {
      id: `f_${Date.now()}`,
      name: parsedName.trim(),
      qty: parsedQty.trim() || "—",
      purchasedAt: todayIso(),
    };
    persist([item, ...items]);
    setVoiceOpen(false);
    setTranscript("");
    setTranslated("");
    setPartial("");
    toast.success(`${item.name} added · stocked at ${formatNow()}`);
  };

  const sample = useMemo(() => {
    if (subcategory === "Vegetables")
      return ["Tomato 1 kg", "Onion 1 kg", "Coriander bunch"];
    return ["Banana 1 dozen", "Mango 1 kg", "Sweet lime 6 pcs"];
  }, [subcategory]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-accent/15 grid place-items-center">
            <Sprout className="h-4 w-4 text-accent" />
          </div>
          <div>
            <div className="font-semibold">Stock freshness</div>
            <div className="text-xs text-muted-foreground">
              Customers see this on your card — only fresh sells.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs gap-1">
            <Clock className="h-3 w-3" />
            <span data-testid="text-fresh-now">{nowLabel}</span>
          </Badge>
          <Badge variant="outline" className="text-xs">
            {subcategory ?? "Fruits/Vegetables"}
          </Badge>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_140px_auto_auto] gap-2">
        <Input
          placeholder={`Item name e.g. ${sample[0]}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="input-fresh-name"
        />
        <Input
          placeholder="Qty (e.g. 1 kg)"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          data-testid="input-fresh-qty"
        />
        <Button
          variant="outline"
          onClick={() => {
            setVoiceOpen(true);
            setTranscript("");
            setTranslated("");
            setPartial("");
          }}
          data-testid="button-fresh-voice"
        >
          <Mic className="h-4 w-4 mr-1.5" />
          Voice
        </Button>
        <Button onClick={addItem} data-testid="button-fresh-add">
          <Plus className="h-4 w-4 mr-1.5" /> Add
        </Button>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Items are auto-stamped with the current date and time. No manual date
        entry needed.
      </div>

      <div className="mt-5 space-y-2">
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
            No stock entries yet. Add what you bought today, e.g. "{sample[0]}".
          </div>
        )}
        {items.map((it) => {
          const days = daysSince(it.purchasedAt);
          const tone = freshnessTone(days);
          return (
            <div
              key={it.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 hover-elevate"
              data-testid={`fresh-item-${it.id}`}
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{it.name}</div>
                <div className="text-xs text-muted-foreground">
                  Qty {it.qty} · stocked{" "}
                  {new Date(it.purchasedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] ${tone.color}`}>
                  {tone.label}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeItem(it.id)}
                  data-testid={`button-fresh-remove-${it.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Voice + translator dialog */}
      <Dialog
        open={voiceOpen}
        onOpenChange={(o) => {
          if (!o) stopListening();
          setVoiceOpen(o);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-accent" />
              Speak a stock item
            </DialogTitle>
            <DialogDescription>
              Speak in {lang === "kn-IN" ? "Kannada" : lang === "hi-IN" ? "Hindi" : "English"} —
              we translate to English and stamp with current time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={listening ? stopListening : startListening}
                className={`h-16 w-16 rounded-full ${
                  listening
                    ? "bg-destructive hover:bg-destructive/90"
                    : "bg-primary hover:bg-primary/90"
                }`}
                data-testid="button-fresh-mic"
              >
                {listening ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
              </Button>
              <Button
                onClick={doTranslate}
                disabled={!transcript.trim() || listening}
                data-testid="button-fresh-translate"
              >
                Translate <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                You said
              </div>
              <div className="rounded-lg border border-input bg-background p-3 min-h-[56px] text-sm">
                {transcript || (
                  <span className="text-muted-foreground">
                    Tap mic and speak the item + quantity…
                  </span>
                )}
                {partial && (
                  <span className="text-muted-foreground italic"> {partial}</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                English
              </div>
              <div className="rounded-lg border-2 border-accent/40 bg-accent/5 p-3 min-h-[56px] text-sm">
                {translated || (
                  <span className="text-muted-foreground">
                    Translation will appear here…
                  </span>
                )}
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground">
              Will be stamped as <strong>{formatNow()}</strong>.
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                stopListening();
                setVoiceOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={acceptVoiceItem}
              data-testid="button-fresh-voice-add"
            >
              Add to stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
