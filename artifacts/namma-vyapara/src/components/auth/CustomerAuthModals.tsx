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
import { ShoppingBag, ArrowRight } from "lucide-react";
import { addCustomer, findCustomer, type Session } from "@/lib/session";
import { useSession } from "@/contexts/SessionContext";
import { toast } from "sonner";

function describeAuthError(err: unknown, fallback: string): string {
  const code = (err as { code?: string }).code ?? "";
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "Phone or password is incorrect";
  if (code.includes("user-not-found"))
    return "No account found for this phone — please register";
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
  onGuest: () => void;
  onSwitchToRegister: () => void;
  onSwitchToLogin: () => void;
}

export function CustomerAuthModals({
  loginOpen,
  registerOpen,
  onLoginOpenChange,
  onRegisterOpenChange,
  onGuest,
  onSwitchToRegister,
  onSwitchToLogin,
}: Props) {
  const { signIn } = useSession();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");

  const reset = () => {
    setPhone("");
    setPassword("");
    setName("");
    setConfirm("");
  };

  const [busy, setBusy] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone)) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setBusy(true);
    try {
      const customer = await findCustomer(phone, password);
      if (!customer) {
        toast.error("Phone or password is incorrect");
        return;
      }
      const session: Session = {
        role: "customer",
        name: customer.name,
        phone: customer.phone,
        loggedInAt: Date.now(),
      };
      signIn(session);
      toast.success(`Namaskara, ${customer.name}!`);
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
    if (!/^\d{10}$/.test(phone)) { toast.error("Enter a valid 10-digit phone number"); return; }
    if (password.length < 6) { toast.error("Password should be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    try {
      await addCustomer({ name: name.trim(), phone, password });
      toast.success("Account created — please sign in");
      reset();
      onRegisterOpenChange(false);
      onSwitchToLogin();
    } catch (err) {
      toast.error(describeAuthError(err, "Could not create account"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={loginOpen} onOpenChange={onLoginOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-primary/15 grid place-items-center">
                <ShoppingBag className="h-4 w-4 text-primary" />
              </div>
              <DialogTitle className="text-xl">Welcome back</DialogTitle>
            </div>
            <DialogDescription>
              Sign in to order from your favourite Bengaluru vendors.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Phone number</Label>
              <Input
                id="c-phone"
                inputMode="numeric"
                maxLength={10}
                placeholder="98XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                data-testid="input-customer-phone"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-pass">Password</Label>
              <Input
                id="c-pass"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-customer-password"
              />
              <button
                type="button"
                className="text-xs text-accent hover:underline"
                onClick={() => toast.info("OTP sent to your phone (mock)")}
              >
                Forgot password?
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={busy} data-testid="button-customer-login">
              {busy ? "Signing in…" : (<>Sign in <ArrowRight className="h-4 w-4 ml-1.5" /></>)}
            </Button>
          </form>
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-popover px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onLoginOpenChange(false);
              onGuest();
            }}
            data-testid="button-customer-continue-guest"
          >
            Continue as Guest
          </Button>
          <DialogFooter className="sm:justify-start">
            <p className="text-sm text-muted-foreground">
              New to Namma Vyapara?{" "}
              <button
                className="text-primary font-medium hover:underline"
                onClick={() => {
                  onLoginOpenChange(false);
                  onSwitchToRegister();
                }}
                data-testid="button-switch-to-register"
              >
                Create an account
              </button>
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={registerOpen} onOpenChange={onRegisterOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Create your account</DialogTitle>
            <DialogDescription>
              Save favourites, place orders, and support local vendors.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Full name</Label>
              <Input
                id="c-name"
                placeholder="Priya R"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-register-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-phone">Phone (10 digits)</Label>
              <Input
                id="cr-phone"
                inputMode="numeric"
                maxLength={10}
                placeholder="98XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                data-testid="input-register-phone"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cr-pass">Password</Label>
                <Input
                  id="cr-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-register-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cr-confirm">Confirm</Label>
                <Input
                  id="cr-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  data-testid="input-register-confirm"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={busy} data-testid="button-customer-register">
              {busy ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <DialogFooter className="sm:justify-start">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                className="text-primary font-medium hover:underline"
                onClick={() => {
                  onRegisterOpenChange(false);
                  onSwitchToLogin();
                }}
              >
                Sign in
              </button>
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
