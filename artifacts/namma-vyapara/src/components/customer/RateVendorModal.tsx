import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Sprout, ShieldCheck, Loader2 } from "lucide-react";
import { addRating, verifyCode } from "@/lib/ratings";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  vendorName: string;
  /** Show fresh thumbs (only meaningful for fruits/veg pushcarts). */
  freshnessApplicable?: boolean;
  onRated?: () => void;
}

export function RateVendorModal({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  freshnessApplicable = true,
  onRated,
}: Props) {
  const [step, setStep] = useState<"code" | "rate">("code");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [quality, setQuality] = useState(0);
  // 0 = unset, otherwise 1..5 stars for freshness (only meaningful for
  // fruit/vegetable pushcarts where freshness varies day-to-day).
  const [freshness, setFreshness] = useState<number>(0);
  const [comment, setComment] = useState("");

  // Reset on close
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setStep("code");
      setCode("");
      setQuality(0);
      setFreshness(0);
      setComment("");
      setVerifying(false);
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  const codeValid = useMemo(() => /^[0-9]{4}$/.test(code), [code]);

  const handleVerify = () => {
    if (!codeValid) return;
    setVerifying(true);
    setTimeout(() => {
      const result = verifyCode(code, vendorId);
      setVerifying(false);
      if (!result.ok) {
        toast.error(result.reason ?? "Invalid or expired code");
        return;
      }
      setStep("rate");
    }, 350); // small delay for "Verifying…" feedback
  };

  const handleSubmit = () => {
    if (quality === 0) {
      toast.error("Please tap a star rating for product quality");
      return;
    }
    if (freshnessApplicable && freshness === 0) {
      toast.error("Please tap a freshness star rating");
      return;
    }
    const res = addRating({
      code,
      vendorId,
      quality,
      // For non-fresh-applicable vendors, mirror the quality score so the
      // freshness average exists but doesn't penalise them.
      freshness: freshnessApplicable ? freshness : quality,
      comment: comment.trim() || undefined,
    });
    if (!res.ok) {
      toast.error(res.reason ?? "Could not save rating");
      return;
    }
    toast.success("Thank you for rating!");
    onRated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/15 grid place-items-center">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <DialogTitle className="text-xl">
              {step === "code"
                ? "Enter your 4-digit purchase code"
                : `Rate ${vendorName}`}
            </DialogTitle>
          </div>
          <DialogDescription>
            {step === "code"
              ? "Only verified buyers can rate. Ask the vendor for the code shown on their dashboard."
              : "Your rating is shown as a verified purchase. It only takes a few seconds."}
          </DialogDescription>
        </DialogHeader>

        {step === "code" && (
          <div className="space-y-4">
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoFocus
              placeholder="• • • •"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              className="text-center text-3xl tracking-[0.5em] font-mono h-16"
              data-testid="input-rating-code"
            />
            <div className="text-xs text-muted-foreground">
              Tip — for the demo, try{" "}
              <span className="font-mono font-semibold text-primary">1234</span>{" "}
              for Mahesh's pushcart.
            </div>
          </div>
        )}

        {step === "rate" && (
          <div className="space-y-5">
            <div>
              <Label className="mb-2 block">Product quality</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuality(n)}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    data-testid={`star-${n}`}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-9 w-9 ${
                        n <= quality
                          ? "fill-secondary text-secondary"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {freshnessApplicable && (
              <div>
                <Label className="mb-2 block flex items-center gap-1.5">
                  <Sprout className="h-3.5 w-3.5 text-accent" />
                  Freshness (1 = stale, 5 = farm fresh)
                </Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFreshness(n)}
                      aria-label={`${n} freshness star${n > 1 ? "s" : ""}`}
                      data-testid={`fresh-star-${n}`}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-9 w-9 ${
                          n <= freshness
                            ? "fill-accent text-accent"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Only shown for fruit & vegetable pushcarts.
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="rating-comment" className="mb-2 block">
                Add a quick comment (optional)
              </Label>
              <textarea
                id="rating-comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Bananas were ripe, paid ₹60/dozen…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="textarea-rating-comment"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "code" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleVerify}
                disabled={!codeValid || verifying}
                data-testid="button-verify-code"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Verifying…
                  </>
                ) : (
                  <>Verify & Rate</>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("code")}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                data-testid="button-submit-rating"
              >
                Submit rating
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
