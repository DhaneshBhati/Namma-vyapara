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
import { Label } from "@/components/ui/label";
import { BellRing, MapPin, Trash2 } from "lucide-react";
import {
  setVendorWatch,
  removeVendorWatch,
  getVendorWatch,
} from "@/lib/session";
import { useSession } from "@/contexts/SessionContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  vendorName: string;
  onChange?: () => void;
}

export function VendorNotifyDialog({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  onChange,
}: Props) {
  const { session } = useSession();
  const [range, setRange] = useState(1);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!open || !session?.phone) return;
    const w = getVendorWatch(session.phone, vendorId);
    setExists(!!w);
    setRange(w?.rangeKm ?? 1);
  }, [open, session?.phone, vendorId]);

  const handleSave = () => {
    if (!session?.phone) {
      toast.error("Sign in to set this");
      return;
    }
    setVendorWatch(session.phone, {
      vendorId,
      vendorName,
      rangeKm: range,
      createdAt: Date.now(),
    });
    toast.success(
      `We'll alert you when ${vendorName} is within ${range.toFixed(1)} km`,
    );
    onChange?.();
    onOpenChange(false);
  };

  const handleRemove = () => {
    if (!session?.phone) return;
    removeVendorWatch(session.phone, vendorId);
    toast.message(`Stopped watching ${vendorName}`);
    onChange?.();
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
            <DialogTitle className="text-xl">Notify me about {vendorName}</DialogTitle>
          </div>
          <DialogDescription>
            We'll send you a heads-up the moment this vendor enters the range
            you choose.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
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
            min={0.2}
            max={5}
            step={0.1}
            data-testid="slider-vendor-range"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest">
            <span>0.2 km</span>
            <span>2.5 km</span>
            <span>5 km</span>
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-2 flex-wrap">
          {exists ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={handleRemove}
              data-testid="button-remove-watch"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Stop watching
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} data-testid="button-save-watch">
            {exists ? "Update range" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
