import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  KeyRound,
  Copy,
  RefreshCcw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  activeCodeForVendor,
  codesUsedToday,
  dailyLimit,
  generateCodeForVendor,
  getCodesForVendor,
  subscribeRatings,
  type PurchaseCode,
} from "@/lib/ratings";
import { toast } from "sonner";

interface Props {
  vendorId: string;
  vendorName: string;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "expired";
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}m`;
  return `${min}m ${sec.toString().padStart(2, "0")}s`;
}

export function PurchaseCodePanel({ vendorId, vendorName }: Props) {
  const [active, setActive] = useState<PurchaseCode | null>(null);
  const [usedToday, setUsedToday] = useState(0);
  const [recent, setRecent] = useState<PurchaseCode[]>([]);
  const [now, setNow] = useState(Date.now());
  const [generating, setGenerating] = useState(false);

  const refresh = () => {
    setActive(activeCodeForVendor(vendorId));
    setUsedToday(codesUsedToday(vendorId));
    setRecent(getCodesForVendor(vendorId).slice(0, 5));
  };

  useEffect(() => {
    refresh();
    const unsub = subscribeRatings(refresh);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      unsub();
      window.clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const limit = dailyLimit();
  const remaining = Math.max(0, limit - usedToday);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const res = generateCodeForVendor(vendorId);
      setGenerating(false);
      if (!res.ok) {
        toast.error(res.reason ?? "Could not generate code");
        return;
      }
      refresh();
      toast.success(`New code ready: ${res.code!.code}`);
    }, 250);
  };

  const handleCopy = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.code);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const msLeft = active ? active.expiresAt - now : 0;

  const limitReached = remaining === 0;

  const usagePct = useMemo(
    () => Math.min(100, Math.round((usedToday / limit) * 100)),
    [usedToday, limit],
  );

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-600 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified Rating Codes
          </div>
          <h2 className="font-serif text-xl mt-0.5">
            Give buyers a code to rate {vendorName}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Generate a one-time 4-digit code after each purchase. The buyer
            enters it in the app to leave a verified rating. Codes expire in
            1 hour and can only be used once.
          </p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-emerald-500/15 grid place-items-center shrink-0">
          <KeyRound className="h-5 w-5 text-emerald-600" />
        </div>
      </div>

      {/* Active code display */}
      {active ? (
        <div
          className="rounded-2xl border-2 border-dashed border-emerald-500/60 bg-emerald-500/5 p-5 flex flex-col sm:flex-row items-center gap-4"
          data-testid="card-active-code"
        >
          <div
            className="font-mono text-5xl font-bold tracking-[0.4em] text-emerald-700 dark:text-emerald-400 select-all"
            data-testid="text-active-code"
          >
            {active.code}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start">
              <Clock className="h-3 w-3" /> Expires in
            </div>
            <div className="font-semibold">{formatTimeLeft(msLeft)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Read it out to your buyer or show them this screen.
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              aria-label="Copy code"
              data-testid="button-copy-code"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleGenerate}
              disabled={limitReached || generating}
              aria-label="New code"
              data-testid="button-new-code"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-5 text-center">
          <KeyRound className="h-8 w-8 text-muted-foreground mx-auto" />
          <div className="mt-2 font-medium">No active code</div>
          <div className="text-xs text-muted-foreground mt-1 mb-4">
            Generate one when a customer buys from you.
          </div>
          <Button
            onClick={handleGenerate}
            disabled={limitReached || generating}
            data-testid="button-generate-code"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4 mr-1.5" /> Generate 4-digit code
              </>
            )}
          </Button>
        </div>
      )}

      {/* Daily usage */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">
            Today's usage · resets at midnight
          </span>
          <Badge
            variant="outline"
            className={
              limitReached
                ? "border-destructive text-destructive"
                : "border-border"
            }
          >
            {usedToday}/{limit}
          </Badge>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full ${
              limitReached
                ? "bg-destructive"
                : usagePct > 75
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            } transition-all`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        {limitReached && (
          <div className="text-[11px] text-destructive mt-1.5">
            Daily limit reached. Resets at midnight to prevent rating fraud.
          </div>
        )}
      </div>

      {/* Recent codes log */}
      {recent.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Recent codes
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {recent.map((c) => {
              const isActive = !c.used && c.expiresAt > now;
              const expired = !c.used && c.expiresAt <= now;
              return (
                <div
                  key={`${c.code}-${c.generatedAt}`}
                  className="flex items-center gap-3 text-xs rounded-lg border border-border px-3 py-2"
                >
                  <span className="font-mono font-semibold tracking-widest">
                    {c.code}
                  </span>
                  <span className="text-muted-foreground flex-1">
                    {new Date(c.generatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {c.used && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Used
                    </Badge>
                  )}
                  {isActive && (
                    <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                      Active
                    </Badge>
                  )}
                  {expired && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Expired
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
