import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BellRing, MapPin } from "lucide-react";
import {
  PUSHCART_SUBCATEGORIES,
  type PushcartSubcategory,
} from "@/lib/vendors";
import {
  getNotifySettings,
  setNotifySettings,
  type NotifySettings,
} from "@/lib/session";
import { useSession } from "@/contexts/SessionContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (s: NotifySettings) => void;
}

export function NotifyMeDialog({ open, onOpenChange, onSaved }: Props) {
  const { session } = useSession();
  const [enabled, setEnabled] = useState(false);
  const [range, setRange] = useState(1);
  const [subs, setSubs] = useState<PushcartSubcategory[]>([
    "Fruits",
    "Vegetables",
  ]);

  useEffect(() => {
    if (!open || !session?.phone) return;
    const s = getNotifySettings(session.phone);
    setEnabled(s.enabled);
    setRange(s.rangeKm);
    setSubs(s.subcategories);
  }, [open, session?.phone]);

  const toggleSub = (s: PushcartSubcategory) => {
    setSubs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const handleSave = () => {
    if (!session?.phone) {
      toast.error("Please sign in to set notifications");
      return;
    }
    const settings: NotifySettings = {
      enabled,
      rangeKm: range,
      subcategories: subs,
    };
    setNotifySettings(session.phone, settings);
    toast.success(
      enabled
        ? `Notifications on — ${range} km radius`
        : "Notifications turned off",
    );
    onSaved?.(settings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-primary/15 grid place-items-center">
              <BellRing className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-xl">Notify me about pushcarts</DialogTitle>
          </div>
          <DialogDescription>
            We'll alert you when a matching pushcart vendor enters your range.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <div className="text-sm font-medium">Enable notifications</div>
              <div className="text-xs text-muted-foreground">
                You can turn this off any time
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              data-testid="switch-notify-enabled"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-accent" />
                Notify me within
              </Label>
              <span className="text-sm font-semibold text-primary">
                {range.toFixed(1)} km
              </span>
            </div>
            <Slider
              value={[range]}
              onValueChange={(v) => setRange(v[0]!)}
              min={0.5}
              max={5}
              step={0.5}
              data-testid="slider-notify-range"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest">
              <span>0.5 km</span>
              <span>2.5 km</span>
              <span>5 km</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categories I want alerts for</Label>
            <div className="flex flex-wrap gap-2">
              {PUSHCART_SUBCATEGORIES.map((s) => {
                const active = subs.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSub(s)}
                    data-testid={`chip-notify-${s}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {subs.length === 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-600/40">
                Pick at least one category
              </Badge>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={enabled && subs.length === 0}
            data-testid="button-notify-save"
          >
            Save preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
