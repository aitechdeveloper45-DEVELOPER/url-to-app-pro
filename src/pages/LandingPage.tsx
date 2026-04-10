import { motion } from "framer-motion";
import { ArrowRight, Smartphone, Zap, Shield, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" },
  }),
};

const features = [
  {
    icon: Zap,
    title: "Instant Conversion",
    description: "Paste your URL and get a native Android APK or AAB in under 5 minutes.",
  },
  {
    icon: Smartphone,
    title: "Native WebView Shell",
    description: "Your web app wrapped in a real Android app with native navigation and feel.",
  },
  {
    icon: Shield,
    title: "App Signing",
    description: "Upload your own keystore or use our auto-generated debug signing key.",
  },
  {
    icon: Download,
    title: "APK & AAB Output",
    description: "Download APK for direct install or AAB for Google Play Store submission.",
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Glow Effect */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none opacity-50"
        style={{ background: "var(--gradient-glow)" }}
      />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto">
        <div className="font-heading text-xl font-bold tracking-tight text-foreground">
          <span className="text-gradient">Droidify</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/login">Log in</Link>
          </Button>
          <Button variant="hero" size="sm" asChild>
            <Link to="/signup">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-28 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-sm text-muted-foreground font-body">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
              Now supporting AAB for Play Store
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="font-heading text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight"
          >
            Turn any website into a{" "}
            <span className="text-gradient">native Android app</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-body leading-relaxed"
          >
            Paste your URL. Choose APK or AAB. Download your signed Android app
            in minutes — no Android Studio required.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Button variant="hero" size="lg" asChild>
              <Link to="/signup">
                Start Converting
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" asChild>
              <Link to="/login">View Dashboard</Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Floating mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-20 relative"
        >
          <div className="glass rounded-2xl p-6 md:p-8 mx-auto max-w-3xl glow">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
            </div>
            <div className="bg-muted rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-10 rounded-lg bg-secondary border border-border px-4 flex items-center">
                  <span className="text-muted-foreground text-sm font-body">https://your-webapp.com</span>
                </div>
                <div className="h-10 px-6 rounded-lg bg-primary flex items-center">
                  <span className="text-primary-foreground text-sm font-semibold">Convert</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-24 rounded-lg bg-secondary/50 border border-border/50 flex flex-col items-center justify-center gap-1">
                  <Smartphone className="h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground">APK</span>
                </div>
                <div className="h-24 rounded-lg bg-secondary/50 border border-border/50 flex flex-col items-center justify-center gap-1">
                  <Download className="h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground">AAB</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeUp} custom={0} className="font-heading text-3xl md:text-4xl font-bold">
            Everything you need to go native
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground mt-3 max-w-lg mx-auto font-body">
            From URL to installable APK in three simple steps.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              custom={i}
              className="glass rounded-2xl p-8 hover:border-primary/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm font-body leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="glass rounded-3xl p-12 md:p-16 glow"
        >
          <motion.h2 variants={fadeUp} custom={0} className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Ready to convert your first app?
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground font-body mb-8 max-w-md mx-auto">
            Join thousands of developers shipping Android apps without writing a single line of Java or Kotlin.
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <Button variant="hero" size="lg" asChild>
              <Link to="/signup">
                Create Free Account
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 text-center text-sm text-muted-foreground font-body">
        © {new Date().getFullYear()} Droidify. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
