import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = [
  {
    q: "Is there really no commission for vendors?",
    a: "Yes. Namma Vyapara is free for vendors, forever. No commission, no listing fees, no data resold.",
  },
  {
    q: "What if I don't have a smartphone?",
    a: "Call our helpline and we'll register you and update your prices over the phone. Voice-first updates work in Kannada and English.",
  },
  {
    q: "How do customers find my stall?",
    a: "We show your live location on a map to anyone within walking distance. They can call you or get directions in one tap.",
  },
  {
    q: "How are orders handled?",
    a: "Customers can call you directly or, for shops, place a delivery order. The dashboard shows pending orders for you to confirm.",
  },
  {
    q: "What if I move my pushcart?",
    a: "Tap 'Update Live Location' on the vendor dashboard, or call the helpline. Your pin updates instantly.",
  },
];

export function Help() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-xs uppercase tracking-widest text-secondary font-semibold">
        Vendor Help
      </div>
      <h1 className="mt-2 font-serif text-4xl">Frequently asked questions</h1>
      <p className="mt-3 text-muted-foreground">
        Quick answers for vendors and customers. Need more help? Call our helpline at
        +91 80 1234 5678.
      </p>

      <div className="mt-8">
        <Accordion type="single" collapsible className="w-full">
          {FAQ.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </main>
  );
}
