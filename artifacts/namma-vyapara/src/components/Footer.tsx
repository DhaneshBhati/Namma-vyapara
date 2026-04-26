import { Link } from "wouter";
import { Sparkles } from "lucide-react";

export function Footer({ onVendorHelp }: { onVendorHelp: () => void }) {
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-secondary grid place-items-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="font-serif text-lg font-semibold">Namma Vyapara</div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            Bengaluru's hyperlocal market — connecting pushcart vendors and small shops
            to the customers right around them.
          </p>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Vendor Resources
          </div>
          <ul className="space-y-2 text-sm">
            <li>
              <button onClick={onVendorHelp} className="hover:text-primary text-left" data-testid="link-training">
                Training Videos
              </button>
            </li>
            <li>
              <button onClick={onVendorHelp} className="hover:text-primary text-left" data-testid="link-pricing">
                Pricing (Free)
              </button>
            </li>
            <li>
              <button onClick={onVendorHelp} className="hover:text-primary text-left" data-testid="link-agreement">
                Vendor Agreement
              </button>
            </li>
            <li>
              <button onClick={onVendorHelp} className="hover:text-primary text-left" data-testid="link-vendor-help">
                Vendor Help
              </button>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Product
          </div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="hover:text-primary">Discover Vendors</Link></li>
            <li><Link href="/about" className="hover:text-primary">About</Link></li>
            <li><Link href="/help" className="hover:text-primary">Help & FAQ</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Trust
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Supported by Rotary International</li>
            <li>BBMP Partner</li>
            <li>100% Free for Vendors</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 text-xs text-muted-foreground flex flex-col sm:flex-row gap-2 justify-between">
          <div>© {new Date().getFullYear()} Namma Vyapara. Built with namma ooru in mind.</div>
          <div>Made in Bengaluru.</div>
        </div>
      </div>
    </footer>
  );
}
