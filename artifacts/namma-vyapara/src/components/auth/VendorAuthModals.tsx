import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Store, MapPin, ArrowRight } from "lucide-react";
import {
  addVendor,
  findVendor,
  type Session,
  type VendorRecord,
} from "@/lib/session";
import { PUSHCART_SUBCATEGORIES, type PushcartSubcategory } from "@/lib/vendors";
import { useSession } from "@/contexts/SessionContext";
import { toast } from "sonner";

function describeAuthError(err: unknown, fallback: string): string {
  const code = (err as { code?: string }).code ?? "";
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "Vendor ID or password is incorrect";
  if (code.includes("user-not-found"))
    return "No vendor account found — please register";
  if (code.includes("email-already-in-use"))
    return "This phone is already registered — please sign in";
  if (code.includes("weak-password"))
    return "Password must be at least 6 characters";
  if (code.includes("too-many-requests"))
    return "Too many attempts — please wait a moment";
  if (code.includes("network-request-failed"))
    return "Network error — check your connection";
  return fallback;
}

interface Props {
  loginOpen: boolean;
  registerOpen: boolean;
  onLoginOpenChange: (open: boolean) => void;
  onRegisterOpenChange: (open: boolean) => void;
  onSwitchToRegister: () => void;
  onSwitchToLogin: () => void;
}

export function VendorAuthModals({
  loginOpen,
  registerOpen,
  onLoginOpenChange,
  onRegisterOpenChange,
  onSwitchToRegister,
  onSwitchToLogin,
}: Props) {
  const { signIn } = useSession();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [vendorType, setVendorType] = useState<"Pushcart" | "Local Shop">("Pushcart");
  const [subcategory, setSubcategory] = useState<PushcartSubcategory>("Fruits");
  const [name, setName] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [description, setDescription] = useState("");
  const [confirm, setConfirm] = useState("");

  const reset = () => {
    setPhone("");
    setPassword("");
    setName("");
    setAltPhone("");
    setCoords(null);
    setDescription("");
    setConfirm("");
    setSubcategory("Fruits");
    setVendorType("Pushcart");
  };

  const [busy, setBusy] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone)) { toast.error("Enter a valid 10-digit phone"); return; }
    setBusy(true);
    try {
      const vendor: VendorRecord | null = await findVendor(phone, password);
      if (!vendor) {
        toast.error("Vendor ID or password is incorrect");
        return;
      }
      const session: Session = {
        role: "vendor",
        name: vendor.name,
        phone: vendor.phone,
        vendorType: vendor.vendorType,
        vendorSubcategory: vendor.subcategory,
        loggedInAt: Date.now(),
      };
      signIn(session);
      toast.success(`Logged in as Vendor: ${vendor.name}`);
      reset();
      onLoginOpenChange(false);
    } catch (err) {
      toast.error(describeAuthError(err, "Could not sign in"));
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (!/^\d{10}$/.test(phone)) { toast.error("Enter a valid 10-digit phone"); return; }
    if (altPhone && !/^\d{10}$/.test(altPhone)) {
      toast.error("Alternate phone must be 10 digits"); return;
    }
    if (!description.trim()) { toast.error("Please describe your products briefly"); return; }
    if (password.length < 6) { toast.error("Password should be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    try {
      await addVendor({
        vendorType,
        subcategory: vendorType === "Pushcart" ? subcategory : undefined,
        name: name.trim(),
        phone,
        altPhone: altPhone || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
        description: description.trim(),
        password,
      });
      toast.success("Vendor registered — please sign in");
      reset();
      onRegisterOpenChange(false);
      onSwitchToLogin();
    } catch (err) {
      toast.error(describeAuthError(err, "Could not register vendor"));
    } finally {
      setBusy(false);
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Location captured");
      },
      () => toast.error("Could not get location — please allow permission"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <>
      <Dialog open={loginOpen} onOpenChange={onLoginOpenChange}>
        <DialogContent className="sm:max-w-md border-secondary/40">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-secondary to-primary rounded-t-lg" />
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-secondary/15 grid place-items-center">
                <Store className="h-4 w-4 text-secondary" />
              </div>
              <DialogTitle className="text-xl">Vendor Login — Namma Vyapara</DialogTitle>
            </div>
            <DialogDescription>
              Sign in to your vendor dashboard. Pushcart or shop — your stall, your terms.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="v-phone">Vendor ID or registered phone</Label>
              <Input
                id="v-phone"
                inputMode="numeric"
                maxLength={10}
                placeholder="98XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                data-testid="input-vendor-phone"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-pass">Password</Label>
              <Input
                id="v-pass"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-vendor-password"
              />
              <button
                type="button"
                className="text-xs text-secondary hover:underline"
                onClick={() => toast.info("OTP sent to your phone (mock)")}
              >
                Forgot password?
              </button>
            </div>
            <Button
              type="submit"
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
              disabled={busy}
              data-testid="button-vendor-login"
            >
              {busy ? "Signing in…" : (<>Sign in <ArrowRight className="h-4 w-4 ml-1.5" /></>)}
            </Button>
          </form>
          <DialogFooter className="sm:justify-start">
            <p className="text-sm text-muted-foreground">
              New vendor?{" "}
              <button
                className="text-secondary font-medium hover:underline"
                onClick={() => {
                  onLoginOpenChange(false);
                  onSwitchToRegister();
                }}
                data-testid="button-switch-to-vendor-register"
              >
                Register here
              </button>
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={registerOpen} onOpenChange={onRegisterOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-secondary/40">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-secondary to-primary rounded-t-lg" />
          <DialogHeader>
            <DialogTitle className="text-xl">Become a Vendor — Join Namma Vyapara</DialogTitle>
            <DialogDescription>
              Zero commission. Voice-first updates. Reach customers right around your stall.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label>Vendor type</Label>
              <RadioGroup
                value={vendorType}
                onValueChange={(v) => setVendorType(v as "Pushcart" | "Local Shop")}
                className="grid grid-cols-2 gap-3"
              >
                <label
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer hover-elevate ${
                    vendorType === "Pushcart" ? "border-secondary bg-secondary/10" : "border-border"
                  }`}
                >
                  <RadioGroupItem value="Pushcart" id="vt-push" />
                  <span className="text-sm font-medium">Pushcart</span>
                </label>
                <label
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer hover-elevate ${
                    vendorType === "Local Shop" ? "border-secondary bg-secondary/10" : "border-border"
                  }`}
                >
                  <RadioGroupItem value="Local Shop" id="vt-shop" />
                  <span className="text-sm font-medium">Local Shop</span>
                </label>
              </RadioGroup>
            </div>

            {vendorType === "Pushcart" && (
              <div className="space-y-2">
                <Label>Pushcart category</Label>
                <div className="flex flex-wrap gap-2">
                  {PUSHCART_SUBCATEGORIES.map((s) => {
                    const active = subcategory === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSubcategory(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          active
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                        data-testid={`chip-vendor-sub-${s}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                {(subcategory === "Fruits" || subcategory === "Vegetables") && (
                  <p className="text-xs text-muted-foreground">
                    Stock-freshness tracking will be enabled on your dashboard.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="v-name">Full name</Label>
              <Input
                id="v-name"
                placeholder="Mahesh K"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-vendor-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vr-phone">Phone *</Label>
                <Input
                  id="vr-phone"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="98XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  data-testid="input-vendor-register-phone"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vr-alt">Alternate phone</Label>
                <Input
                  id="vr-alt"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Optional"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Stall location</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={captureLocation}
                  data-testid="button-vendor-capture-location"
                >
                  <MapPin className="h-4 w-4 mr-1.5" />
                  Get current location
                </Button>
                <span className="text-sm text-muted-foreground">
                  {coords
                    ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                    : "Not set"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-desc">What do you sell?</Label>
              <Textarea
                id="v-desc"
                rows={3}
                placeholder="Fresh tender coconut, sliced fruits, daily..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="input-vendor-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vr-pass">Password</Label>
                <Input
                  id="vr-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-vendor-register-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vr-confirm">Confirm</Label>
                <Input
                  id="vr-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
              disabled={busy}
              data-testid="button-vendor-register"
            >
              {busy ? "Registering…" : "Register stall"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
