export const Footer = () => (
  <footer className="bg-primary/90 text-primary-foreground/90 py-20 relative overflow-hidden">
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
    <div className="container mx-auto px-6 relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-start gap-12 border-b border-primary-foreground/10 pb-12">
        <div className="max-w-md">
          <h2 className="text-3xl font-serif mb-6 text-primary-foreground">
            Connect with intelligence.
          </h2>
          <p className="text-primary-foreground/80 mb-8 leading-relaxed font-medium">
            Stop wasting time on prep work. Let AI handle the structure so you
            can focus on learning. Join the waitlist today.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-12 sm:gap-24">
          <div>
            <h4 className="font-semibold text-primary-foreground mb-6 uppercase tracking-wider text-sm">
              Product
            </h4>
            <ul className="space-y-4">
              {["Features", "Pricing", "FAQ"].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-primary-foreground/70 hover:text-primary-foreground transition-colors font-medium"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-primary-foreground mb-6 uppercase tracking-wider text-sm">
              Company
            </h4>
            <ul className="space-y-4">
              {["About", "Blog", "Contact"].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-primary-foreground/70 hover:text-primary-foreground transition-colors font-medium"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-primary-foreground/60 font-medium">
        <p>© 2026 Noteably Inc. All rights reserved.</p>
        <div className="flex gap-6">
          <a
            href="#"
            className="hover:text-primary-foreground transition-colors"
          >
            Privacy Policy
          </a>
          <a
            href="#"
            className="hover:text-primary-foreground transition-colors"
          >
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  </footer>
);
