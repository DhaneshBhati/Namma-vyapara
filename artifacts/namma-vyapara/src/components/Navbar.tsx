import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Moon,
  Sun,
  Menu,
  Store,
  ShoppingBag,
  LogOut,
  UserCircle2,
  Sparkles,
  Settings,
  ChevronDown,
} from "lucide-react";
import { applyTheme, getInitialTheme, type Theme } from "@/lib/theme";
import { useSession } from "@/contexts/SessionContext";
import { cn } from "@/lib/utils";
import { ProfileSettingsDialog } from "@/components/ProfileSettingsDialog";

interface NavbarProps {
  onCustomerLogin: () => void;
  onCustomerRegister: () => void;
  onVendorLogin: () => void;
  onVendorRegister: () => void;
  onGuest: () => void;
}

type AuthRole = "customer" | "vendor";

export function Navbar({
  onCustomerLogin,
  onCustomerRegister,
  onVendorLogin,
  onVendorRegister,
  onGuest,
}: NavbarProps) {
  const { session, signOut } = useSession();
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [authRole, setAuthRole] = useState<AuthRole>("customer");
  const [profileOpen, setProfileOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const isAuthed = !!session && session.role !== "guest";
  const isCustomer = session?.role === "customer" || session?.role === "guest";

  const handleLogin = () => {
    if (authRole === "customer") onCustomerLogin();
    else onVendorLogin();
  };

  const handleRegister = () => {
    if (authRole === "customer") onCustomerRegister();
    else onVendorRegister();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 backdrop-blur-xl bg-background/75">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 group shrink-0" data-testid="link-home">
          <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-secondary grid place-items-center glow-primary">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-serif font-semibold text-lg tracking-tight">
              Namma Vyapara
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hidden sm:block">
              Bengaluru's hyperlocal market
            </div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          <Link href="/" className="px-3 py-2 rounded-md text-sm hover-elevate" data-testid="link-home-nav">
            Home
          </Link>
          {isCustomer && (
            <Link href="/discover" className="px-3 py-2 rounded-md text-sm hover-elevate" data-testid="link-discover">
              Discover Map
            </Link>
          )}
          <Link href="/about" className="px-3 py-2 rounded-md text-sm hover-elevate" data-testid="link-about">
            About
          </Link>
          <Link href="/help" className="px-3 py-2 rounded-md text-sm hover-elevate" data-testid="link-help">
            Vendor Help
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {isAuthed ? (
            <div className="hidden md:flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full glass hover-elevate"
                    data-testid="button-profile-menu"
                  >
                    <UserCircle2 className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium" data-testid="text-session-name">
                      {session?.role === "vendor" ? `Vendor: ${session.name}` : session?.name}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    {session?.role === "vendor" ? "Vendor account" : "Customer account"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setProfileOpen(true)}
                    data-testid="menu-profile-settings"
                  >
                    <Settings className="h-4 w-4 mr-2" /> Profile settings
                  </DropdownMenuItem>
                  {session?.role === "customer" && (
                    <DropdownMenuItem
                      onClick={() => navigate("/discover")}
                      data-testid="menu-go-discover"
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" /> Discover map
                    </DropdownMenuItem>
                  )}
                  {session?.role === "vendor" && (
                    <DropdownMenuItem
                      onClick={() => navigate("/vendor")}
                      data-testid="menu-go-vendor"
                    >
                      <Store className="h-4 w-4 mr-2" /> My store
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      signOut();
                      navigate("/");
                    }}
                    data-testid="menu-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              {/* Customer / Vendor segmented toggle */}
              <div
                role="tablist"
                aria-label="Sign in as"
                className="relative inline-flex p-1 rounded-full bg-muted/60 border border-border/60"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={authRole === "customer"}
                  onClick={() => setAuthRole("customer")}
                  data-testid="toggle-role-customer"
                  className={cn(
                    "relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                    authRole === "customer"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Customer
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={authRole === "vendor"}
                  onClick={() => setAuthRole("vendor")}
                  data-testid="toggle-role-vendor"
                  className={cn(
                    "relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                    authRole === "vendor"
                      ? "bg-background text-secondary shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Store className="h-3.5 w-3.5" />
                  Vendor
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogin}
                data-testid="button-nav-login"
              >
                Login
              </Button>
              <Button
                size="sm"
                onClick={handleRegister}
                data-testid="button-nav-register"
                className={
                  authRole === "vendor"
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    : ""
                }
              >
                Register
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onGuest}
                className="text-muted-foreground"
                data-testid="button-nav-guest"
              >
                Guest
              </Button>
            </div>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-2 mt-8">
                <Link href="/" className="px-3 py-2 rounded-md text-sm hover-elevate">
                  Home
                </Link>
                {isCustomer && (
                  <Link href="/discover" className="px-3 py-2 rounded-md text-sm hover-elevate">
                    Discover Map
                  </Link>
                )}
                <Link href="/about" className="px-3 py-2 rounded-md text-sm hover-elevate">
                  About
                </Link>
                <Link href="/help" className="px-3 py-2 rounded-md text-sm hover-elevate">
                  Vendor Help
                </Link>
                <div className="h-px bg-border my-3" />
                {isAuthed ? (
                  <>
                    <div className="px-3 py-2 text-sm">
                      Signed in as <span className="font-medium">{session?.name}</span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setProfileOpen(true)}
                      data-testid="menu-profile-settings-mobile"
                    >
                      <Settings className="h-4 w-4 mr-1.5" /> Profile settings
                    </Button>
                    <Button variant="outline" onClick={() => { signOut(); navigate("/"); }}>
                      <LogOut className="h-4 w-4 mr-1.5" /> Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-[10px] uppercase tracking-widest text-primary font-semibold mt-2">
                      Customer
                    </div>
                    <Button variant="outline" onClick={onCustomerLogin}>
                      <ShoppingBag className="h-4 w-4 mr-1.5" /> Customer Login
                    </Button>
                    <Button onClick={onCustomerRegister}>Customer Register</Button>

                    <div className="text-[10px] uppercase tracking-widest text-secondary font-semibold mt-4">
                      Vendor
                    </div>
                    <Button
                      variant="outline"
                      className="border-secondary/50"
                      onClick={onVendorLogin}
                    >
                      <Store className="h-4 w-4 mr-1.5" /> Vendor Login
                    </Button>
                    <Button
                      onClick={onVendorRegister}
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    >
                      Vendor Register
                    </Button>

                    <div className="h-px bg-border my-3" />
                    <Button variant="ghost" onClick={onGuest}>Browse as Guest</Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {isAuthed && (
        <ProfileSettingsDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
        />
      )}
    </header>
  );
}
