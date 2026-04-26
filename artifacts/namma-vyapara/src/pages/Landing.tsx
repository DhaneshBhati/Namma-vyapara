import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  IndianRupee,
  PhoneCall,
  Users,
  ArrowRight,
  Quote,
  ShieldCheck,
  Megaphone,
  MapPin,
  Star,
  Leaf,
} from "lucide-react";
import heroVendor from "@/assets/hero-vendor.png";
import produceFlatlay from "@/assets/produce-flatlay.png";
import vendorPortrait from "@/assets/vendor-portrait.png";

interface Props {
  onGuest: () => void;
  onVendorRegister: () => void;
  onVendorLogin: () => void;
  onContact: () => void;
}

export function Landing({ onGuest, onVendorRegister, onVendorLogin, onContact }: Props) {
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-60">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[920px] rounded-full bg-primary/30 blur-[120px]" />
          <div className="absolute top-20 right-0 h-[360px] w-[480px] rounded-full bg-secondary/25 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-[360px] w-[480px] rounded-full bg-accent/20 blur-[120px]" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-20 sm:pb-24 grid lg:grid-cols-12 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5 text-secondary" />
              Bengaluru's hyperlocal market
            </div>
            <h1 className="mt-5 font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight">
              Namma ooru's <br />
              <span className="text-gradient-warm">street economy,</span>{" "}
              <span className="text-gradient-cool">re-imagined.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              Find pushcart vendors and neighbourhood shops within walking distance — live,
              on a real map, right now. No app store. No commissions for vendors. Just
              namma vyapara.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={onGuest}
                className="glow-primary"
                data-testid="button-hero-guest"
              >
                Browse vendors near me <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onVendorRegister}
                data-testid="button-hero-vendor"
              >
                I'm a vendor — join free
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-accent" /> Zero commission for vendors
              </div>
              <div className="flex items-center gap-1.5">
                <PhoneCall className="h-4 w-4 text-secondary" /> No smartphone needed
              </div>
              <div className="flex items-center gap-1.5">
                <Leaf className="h-4 w-4 text-primary" /> 100% local & fresh
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/60 aspect-[4/5]">
              <img
                src={heroVendor}
                alt="Bengaluru pushcart vendor with fresh produce in golden morning light"
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/0 to-background/0" />

              {/* Floating live-vendor card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="absolute bottom-4 left-4 right-4 rounded-2xl bg-background/85 backdrop-blur-md border border-border/60 p-4 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_0_4px_rgba(16,185,129,0.18)]" />
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Live nearby
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-serif text-base">Mahesh's Fruit Cart</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Jayanagar 4th Block · 320m away
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold">
                    <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
                    4.8
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Floating produce chip */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="hidden md:flex absolute -left-6 top-10 items-center gap-2 rounded-full bg-background/90 backdrop-blur-md border border-border/60 px-3 py-2 shadow-lg"
            >
              <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-primary/30">
                <img src={produceFlatlay} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="leading-tight pr-2">
                <div className="text-xs font-semibold">Fresh today</div>
                <div className="text-[10px] text-muted-foreground">42 vendors live</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* TRUST STRIP — quick stats */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-4 pb-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { n: "850+", l: "Vendors onboarded" },
            { n: "12 km²", l: "Bengaluru covered" },
            { n: "₹0", l: "Commission, ever" },
            { n: "5 min", l: "Average sign-up" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 text-center"
            >
              <div className="font-serif text-2xl sm:text-3xl text-gradient-warm">{s.n}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WHY VENDORS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-secondary font-semibold">
            For vendors
          </div>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
            Built with pushcart owners — not for them.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three things every vendor we spoke to asked for. So we built exactly that.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: IndianRupee,
              title: "Zero Commission",
              text: "Keep 100% of your earnings. We don't take a cut, ever.",
              tone: "primary",
            },
            {
              icon: PhoneCall,
              title: "Voice-First Updates",
              text: "No smartphone? Call our helpline to update prices and stock.",
              tone: "secondary",
            },
            {
              icon: Users,
              title: "Reach More Customers",
              text: "Live map discovery plus delivery orders for shops nearby.",
              tone: "accent",
            },
          ].map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="glass rounded-2xl p-6 hover-elevate"
            >
              <div
                className={`h-11 w-11 rounded-lg grid place-items-center mb-4 ${
                  c.tone === "primary"
                    ? "bg-primary/15"
                    : c.tone === "secondary"
                      ? "bg-secondary/20"
                      : "bg-accent/15"
                }`}
              >
                <c.icon
                  className={`h-5 w-5 ${
                    c.tone === "primary"
                      ? "text-primary"
                      : c.tone === "secondary"
                        ? "text-secondary"
                        : "text-accent"
                  }`}
                />
              </div>
              <div className="font-serif text-xl mb-2">{c.title}</div>
              <p className="text-sm text-muted-foreground">{c.text}</p>
              <button
                className="text-xs text-primary mt-4 hover:underline"
                onClick={onContact}
              >
                Learn more →
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SUCCESS STORIES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 relative"
          >
            <div className="rounded-3xl overflow-hidden border border-border/60 shadow-xl aspect-[4/5]">
              <img
                src={vendorPortrait}
                alt="Smiling Bengaluru flower vendor with marigolds and jasmine"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 sm:-right-6 rounded-2xl bg-secondary text-secondary-foreground px-5 py-3 shadow-lg max-w-[200px]">
              <div className="font-serif text-2xl leading-none">+40%</div>
              <div className="text-xs opacity-90 mt-1">avg. sales lift in first month</div>
            </div>
          </motion.div>

          <div className="lg:col-span-7">
            <div className="text-center lg:text-left max-w-2xl">
              <div className="text-xs uppercase tracking-widest text-primary font-semibold">
                Stories from the streets
              </div>
              <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
                Real vendors. Real change.
              </h2>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {[
                {
                  quote:
                    "My sales went up 40% — and I don't even have a smartphone.",
                  who: "Mahesh",
                  role: "Pushcart vendor, Jayanagar",
                },
                {
                  quote:
                    "Delivery orders from nearby flats saved my shop in the slow afternoons.",
                  who: "Priya",
                  role: "Local store, Indiranagar",
                },
                {
                  quote:
                    "Customers find my coconut cart in 5 minutes. Earlier they walked past.",
                  who: "Anil",
                  role: "Pushcart vendor, Whitefield",
                },
                {
                  quote:
                    "Listing was free and the helpline call took 4 minutes. That's it.",
                  who: "Lakshmi",
                  role: "Flower vendor, Malleshwaram",
                },
              ].map((t, i) => (
                <motion.div
                  key={t.who}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="rounded-2xl border border-border/60 bg-card p-5 hover-elevate"
                >
                  <Quote className="h-5 w-5 text-secondary mb-2" />
                  <p className="text-sm italic">"{t.quote}"</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary grid place-items-center text-white text-sm font-semibold">
                      {t.who[0]}
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{t.who}</div>
                      <div className="text-[11px] text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-accent font-semibold">
            Three steps
          </div>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
            From cart to customers in 5 minutes
          </h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { n: "01", title: "Register", text: "Fill the simple form, or call our helpline. Takes under 5 minutes." },
            { n: "02", title: "Get Trained", text: "Receive a 5-minute voice or video guide in Kannada or English." },
            { n: "03", title: "Go Live", text: "Update prices by phone or one tap. Customers find you instantly." },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative rounded-2xl glass p-6"
            >
              <div className="font-serif text-5xl text-gradient-warm">{s.n}</div>
              <div className="mt-3 font-semibold text-lg">{s.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl border border-border/60 px-6 py-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" /> Supported by Rotary International
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" /> BBMP Partner
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" /> 100% Free for Vendors
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-secondary/30 p-10 sm:p-14">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/30 via-secondary/25 to-accent/25" />
          <div className="max-w-2xl">
            <Megaphone className="h-7 w-7 text-secondary" />
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">
              Ready to start?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Join hundreds of vendors in Bengaluru. Zero cost. Zero commission. Just more
              customers walking up to your stall.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={onVendorRegister}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 glow-secondary"
                data-testid="button-cta-vendor-register"
              >
                Register as vendor
              </Button>
              <Button size="lg" variant="outline" onClick={onContact} data-testid="button-cta-talk-support">
                Talk to support
              </Button>
              <Button size="lg" variant="ghost" onClick={onVendorLogin}>
                Already a vendor? Sign in
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
