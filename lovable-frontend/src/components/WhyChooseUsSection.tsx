import { ArrowRight, X, Check } from "lucide-react";

const comparisonRows = [
  {
    feature: "Guided, plain-language forms",
    sub: "Our step-by-step process walks you through every field — no confusing jargon or technical terms.",
    us: true,
    govt: false,
    govtNote: "Complex terminology & jargon",
  },
  {
    feature: "Expert review before submission",
    sub: "Our specialists check every application for errors, typos, and missing information before it's submitted.",
    us: true,
    govt: false,
    govtNote: "No error checking",
  },
  {
    feature: "24/7 dedicated support",
    sub: "Get help anytime via email or chat — our agents assist with form questions, document issues, or status inquiries.",
    us: true,
    govt: false,
    govtNote: "Business hours only, long waits",
  },
  {
    feature: "Money-back guarantee",
    sub: "If your eTA cannot be processed for any reason, you receive a full refund — no questions asked.",
    us: true,
    govt: false,
    govtNote: "No refund policy",
  },
  {
    feature: "Document preparation help",
    sub: "We ensure your passport details, travel dates, and supporting info all meet the exact requirements.",
    us: true,
    govt: false,
    govtNote: "Self-service only",
  },
  {
    feature: "Multilingual support",
    sub: "Apply comfortably in the language you prefer with assistance available in multiple languages.",
    us: true,
    govt: false,
    govtNote: "English & French only",
  },
  {
    feature: "256-bit SSL encryption",
    sub: "Your personal data is protected with bank-level encryption throughout the entire process.",
    us: true,
    govt: true,
    govtNote: "",
  },
];

const WhyChooseUsSection = () => (
  <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
    <div className="container mx-auto px-4 max-w-4xl">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Why Use Our Service?
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          You can apply on the government website directly — here's what you get when you use our assistance service instead.
        </p>
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-10">
        {/* Header */}
        <div className="grid grid-cols-[1fr_100px_100px] md:grid-cols-[1fr_140px_140px] bg-slate-50 border-b border-gray-100">
          <div className="p-4 md:p-5" />
          <div className="p-4 md:p-5 text-center border-l border-gray-100 bg-primary/5">
            <span className="text-sm font-bold text-primary">Our Service</span>
          </div>
          <div className="p-4 md:p-5 text-center border-l border-gray-100">
            <span className="text-sm font-bold text-muted-foreground">Gov. Website</span>
          </div>
        </div>

        {/* Rows */}
        {comparisonRows.map((row, i) => (
          <div
            key={i}
            className={`grid grid-cols-[1fr_100px_100px] md:grid-cols-[1fr_140px_140px] ${i < comparisonRows.length - 1 ? "border-b border-gray-100" : ""} hover:bg-slate-50/50 transition-colors`}
          >
            <div className="p-4 md:p-5">
              <span className="text-sm md:text-base font-semibold text-foreground">{row.feature}</span>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed">{row.sub}</p>
            </div>
            <div className="p-4 md:p-5 flex items-center justify-center border-l border-gray-100 bg-primary/[0.02]">
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="p-4 md:p-5 flex flex-col items-center justify-center border-l border-gray-100 gap-1">
              {row.govt ? (
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
                    <X className="w-4 h-4 text-red-400" />
                  </div>
                  {row.govtNote && (
                    <span className="text-[10px] text-muted-foreground text-center leading-tight hidden md:block">{row.govtNote}</span>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center">
        <a
          href="/apply"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-8 py-4 rounded-xl hover:bg-primary/90 transition-colors text-lg"
        >
          Start Your Application <ArrowRight className="w-5 h-5" />
        </a>
      </div>
    </div>
  </section>
);

export default WhyChooseUsSection;
