import { motion } from "framer-motion";
import { Heart, Sparkles, Users } from "lucide-react";

export function About() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-xs uppercase tracking-widest text-secondary font-semibold">
          About
        </div>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">
          Built with Bengaluru, <span className="text-gradient-warm">for Bengaluru.</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Namma Vyapara was born from a simple observation — the pushcart vendor and the
          neighbourhood shop are the heart of namma ooru, and yet they're invisible to the
          apps everyone uses every day. We're fixing that.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl glass p-5">
            <Heart className="h-5 w-5 text-primary" />
            <div className="mt-2 font-semibold">Vendor first</div>
            <p className="text-sm text-muted-foreground mt-1">
              Zero commission. No data resold. Vendors keep what they earn.
            </p>
          </div>
          <div className="rounded-xl glass p-5">
            <Users className="h-5 w-5 text-secondary" />
            <div className="mt-2 font-semibold">Community owned</div>
            <p className="text-sm text-muted-foreground mt-1">
              Built with vendor unions, BBMP, and customers like you.
            </p>
          </div>
          <div className="rounded-xl glass p-5">
            <Sparkles className="h-5 w-5 text-accent" />
            <div className="mt-2 font-semibold">Beautifully simple</div>
            <p className="text-sm text-muted-foreground mt-1">
              No app to download. No friction. Open the page, find a vendor.
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
