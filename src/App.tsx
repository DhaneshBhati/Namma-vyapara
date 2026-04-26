import { useState, useCallback } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider, useSession } from "@/contexts/SessionContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CustomerAuthModals } from "@/components/auth/CustomerAuthModals";
import { VendorAuthModals } from "@/components/auth/VendorAuthModals";
import { Landing } from "@/pages/Landing";
import { CustomerHome } from "@/pages/CustomerHome";
import { CustomerDashboard } from "@/pages/CustomerDashboard";
import { VendorDashboard } from "@/pages/VendorDashboard";
import { About } from "@/pages/About";
import { Help } from "@/pages/Help";
import NotFound from "@/pages/not-found";
import { toast } from "sonner";

function HomeRoute({ openCustomerLogin }: { openCustomerLogin: () => void }) {
  const { session } = useSession();
  if (session?.role === "vendor") return <VendorDashboard />;
  if (session?.role === "customer" || session?.role === "guest")
    return <CustomerHome onSignIn={openCustomerLogin} />;
  return null;
}

function DiscoverRoute({ openCustomerLogin }: { openCustomerLogin: () => void }) {
  const { session } = useSession();
  const [, navigate] = useLocation();
  if (!session) {
    navigate("/");
    return null;
  }
  if (session.role === "vendor") {
    // Vendors don't have customer discover; bounce them home
    navigate("/");
    return null;
  }
  return <CustomerDashboard onSignIn={openCustomerLogin} />;
}

function Shell() {
  const { session, signIn } = useSession();
  const [, navigate] = useLocation();
  const [customerLoginOpen, setCustomerLoginOpen] = useState(false);
  const [customerRegisterOpen, setCustomerRegisterOpen] = useState(false);
  const [vendorLoginOpen, setVendorLoginOpen] = useState(false);
  const [vendorRegisterOpen, setVendorRegisterOpen] = useState(false);

  const handleGuest = useCallback(() => {
    signIn({ role: "guest", name: "Guest", loggedInAt: Date.now() });
    toast.success("Browsing as Guest — no sign-in needed");
    navigate("/");
  }, [signIn, navigate]);

  const handleVendorHelp = useCallback(() => {
    toast.info("Vendor support: +91 80 1234 5678");
  }, []);

  const showLanding = !session;

  return (
    <>
      <Navbar
        onCustomerLogin={() => setCustomerLoginOpen(true)}
        onCustomerRegister={() => setCustomerRegisterOpen(true)}
        onVendorLogin={() => setVendorLoginOpen(true)}
        onVendorRegister={() => setVendorRegisterOpen(true)}
        onGuest={handleGuest}
      />

      <Switch>
        <Route path="/about" component={About} />
        <Route path="/help" component={Help} />
        <Route path="/discover">
          <DiscoverRoute openCustomerLogin={() => setCustomerLoginOpen(true)} />
        </Route>
        <Route path="/">
          {showLanding ? (
            <Landing
              onGuest={handleGuest}
              onVendorRegister={() => setVendorRegisterOpen(true)}
              onVendorLogin={() => setVendorLoginOpen(true)}
              onContact={handleVendorHelp}
            />
          ) : (
            <HomeRoute openCustomerLogin={() => setCustomerLoginOpen(true)} />
          )}
        </Route>
        <Route component={NotFound} />
      </Switch>

      <Footer onVendorHelp={handleVendorHelp} />

      <CustomerAuthModals
        loginOpen={customerLoginOpen}
        registerOpen={customerRegisterOpen}
        onLoginOpenChange={setCustomerLoginOpen}
        onRegisterOpenChange={setCustomerRegisterOpen}
        onGuest={handleGuest}
        onSwitchToRegister={() => setCustomerRegisterOpen(true)}
        onSwitchToLogin={() => setCustomerLoginOpen(true)}
      />
      <VendorAuthModals
        loginOpen={vendorLoginOpen}
        registerOpen={vendorRegisterOpen}
        onLoginOpenChange={setVendorLoginOpen}
        onRegisterOpenChange={setVendorRegisterOpen}
        onSwitchToRegister={() => setVendorRegisterOpen(true)}
        onSwitchToLogin={() => setVendorLoginOpen(true)}
      />
    </>
  );
}

function App() {
  return (
    <TooltipProvider>
      <LanguageProvider>
        <SessionProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Shell />
          </WouterRouter>
          <Toaster richColors position="top-right" />
        </SessionProvider>
      </LanguageProvider>
    </TooltipProvider>
  );
}

export default App;
