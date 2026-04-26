import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound, UserCog } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import {
  changeCustomerPassword,
  changeVendorPassword,
  getCustomerByPhone,
  getVendorByPhone,
  updateCustomer,
  updateVendor,
} from "@/lib/session";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSettingsDialog({ open, onOpenChange }: Props) {
  const { session } = useSession();
  const role = session?.role ?? "customer";

  const [name, setName] = useState(session?.name ?? "");
  const [altPhone, setAltPhone] = useState("");
  const [description, setDescription] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Load profile values when opening
  useEffect(() => {
    if (!open || !session?.phone) return;
    setName(session.name);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    if (role === "vendor") {
      const v = getVendorByPhone(session.phone);
      setAltPhone(v?.altPhone ?? "");
      setDescription(v?.description ?? "");
      if (v?.name) setName(v.name);
    } else {
      const c = getCustomerByPhone(session.phone);
      setName(c?.name ?? session.name);
    }
  }, [open, session?.phone, session?.name, role]);

  const handleSaveProfile = () => {
    if (!session?.phone) return;
    if (!name.trim()) {
      toast.error("Name can't be empty");
      return;
    }
    if (role === "vendor") {
      const updated = updateVendor(session.phone, {
        name: name.trim(),
        altPhone: altPhone.trim() || undefined,
        description: description.trim() || undefined,
      });
      if (!updated) {
        toast.error("Could not update profile");
        return;
      }
    } else {
      const updated = updateCustomer(session.phone, { name: name.trim() });
      if (!updated) {
        toast.error("Could not update profile");
        return;
      }
    }
    toast.success("Profile saved");
    onOpenChange(false);
  };

  const handleChangePassword = async () => {
    if (!session?.phone) return;
    if (!currentPw || !newPw || !confirmPw) {
      toast.error("Fill all fields");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New passwords don't match");
      return;
    }
    const fn =
      role === "vendor" ? changeVendorPassword : changeCustomerPassword;
    const res = await fn(session.phone, currentPw, newPw);
    if (!res.ok) {
      toast.error(res.reason ?? "Could not change password");
      return;
    }
    toast.success("Password updated");
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-accent/15 grid place-items-center">
              <UserCog className="h-4 w-4 text-accent" />
            </div>
            <DialogTitle className="text-xl">Profile settings</DialogTitle>
          </div>
          <DialogDescription>
            Update your personal details or change your password.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="profile" data-testid="tab-profile">
              Edit profile
            </TabsTrigger>
            <TabsTrigger value="password" data-testid="tab-password">
              Change password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ps-name">Display name</Label>
              <Input
                id="ps-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-profile-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone (login id)</Label>
              <Input value={session?.phone ?? ""} disabled />
              <p className="text-[11px] text-muted-foreground">
                Phone number can't be changed — it's your login identifier.
              </p>
            </div>

            {role === "vendor" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="ps-alt-phone">Alternate phone (optional)</Label>
                  <Input
                    id="ps-alt-phone"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="+91…"
                    data-testid="input-profile-alt-phone"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ps-desc">About your stall (optional)</Label>
                  <textarea
                    id="ps-desc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Family-run for 15 years near Indiranagar metro"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    data-testid="textarea-profile-desc"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} data-testid="button-save-profile">
                Save profile
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="password" className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ps-current">Current password</Label>
              <div className="relative">
                <Input
                  id="ps-current"
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="pr-9"
                  data-testid="input-current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showCurrent ? "Hide" : "Show"}
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ps-new">New password</Label>
              <div className="relative">
                <Input
                  id="ps-new"
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="pr-9"
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showNew ? "Hide" : "Show"}
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                At least 4 characters.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ps-confirm">Confirm new password</Label>
              <Input
                id="ps-confirm"
                type={showNew ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                data-testid="input-confirm-password"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                data-testid="button-change-password"
              >
                <KeyRound className="h-4 w-4 mr-1.5" /> Update password
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
