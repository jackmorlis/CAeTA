import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, ShieldCheck, BadgeCheck, Headphones, Clock, Sparkles } from "lucide-react";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="font-quicksand">
        <section className="bg-slate-100/70">
          <div className="container mx-auto px-4 py-10 md:py-12 max-w-6xl">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">About Us</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Clear, transparent, and up-to-date pricing
              </p>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Canada eTA Service is a private platform, not affiliated with any government or embassy. The
              document fee is $49.99. We charge an additional service fee for our application support and expedited processing.
            </p>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mt-4">
              With us, there are no surprises and no hidden charges. We regularly review our products and prices to guarantee
              they are fair and in keeping with the latest international travel regulations.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Last review of our pricing and fees: February 5, 2026
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-6">
              Service Options for Canada eTA Application
            </h2>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card className="p-6 shadow-sm border border-slate-200 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground">Fast Processing</h3>
                  <div className="flex items-end gap-2 mt-2">
                    <div className="text-3xl font-bold text-foreground">$69.99</div>
                    <div className="text-xs text-muted-foreground mb-1">USD</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Standard expedited turnaround</p>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />Document Fee ($49.99) Included</div>
                  <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />Expedited Service (+$20.00)</div>
                  <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />Expert Application Review</div>
                  <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />24-48 Hour Processing</div>
                  <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />Email Support</div>
                </div>
                <Button className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold mt-auto" onClick={() => navigate("/apply")}>
                  Apply Now
                </Button>
              </Card>

              <Card className="p-6 shadow-sm border border-primary/40 relative flex flex-col">
                <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full">
                  Most Popular
                </div>
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground">Ultra-Fast Processing</h3>
                  <div className="flex items-end gap-2 mt-2">
                    <div className="text-3xl font-bold text-foreground">$99.99</div>
                    <div className="text-xs text-muted-foreground mb-1">USD</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Priority service for urgent travelers</p>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />Document Fee ($49.99) Included</div>
                  <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />Priority Handling (+$50.00)</div>
                  <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />Expert Application Review</div>
                  <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />6-12 Hour Priority Processing</div>
                  <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />24/7 Priority Support</div>
                  <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />100% Error-Free Guarantee</div>
                </div>
                <Button className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold mt-auto" onClick={() => navigate("/apply")}>
                  Apply Now
                </Button>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-8">
              What's Included in Our Service
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="w-6 h-6 text-primary" />
                  <div>
                    <h3 className="font-bold text-primary mb-1">Expert Application Review</h3>
                    <p className="text-sm text-muted-foreground">Every application is carefully reviewed by our team to ensure accuracy and compliance with immigration requirements.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <Clock className="w-6 h-6 text-primary" />
                  <div>
                    <h3 className="font-bold text-primary mb-1">Priority Options</h3>
                    <p className="text-sm text-muted-foreground">We process your Canada eTA quickly, with Ultra-Fast options available for last-minute travel needs.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                  <div>
                    <h3 className="font-bold text-primary mb-1">Secure &amp; Encrypted</h3>
                    <p className="text-sm text-muted-foreground">Your personal information is protected with SSL encryption and handled according to strict privacy standards.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <Headphones className="w-6 h-6 text-primary" />
                  <div>
                    <h3 className="font-bold text-primary mb-1">Dedicated Support</h3>
                    <p className="text-sm text-muted-foreground">Our customer support team is available to assist you throughout the application process.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <div>
                    <h3 className="font-bold text-primary mb-1">Trusted Worldwide</h3>
                    <p className="text-sm text-muted-foreground">Thousands of travelers trust us to help them prepare their Canada eTA applications successfully.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary" />
                  <div>
                    <h3 className="font-bold text-primary mb-1">Accuracy Guarantee</h3>
                    <p className="text-sm text-muted-foreground">We guarantee error-free applications or we'll fix any issues at no additional cost to you.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="max-w-4xl mx-auto bg-slate-50 border border-slate-200 rounded-xl p-6 md:p-8">
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              How We Charge for Your Application
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mb-6">
              Our mission is to make it quick and easy to complete your Canada eTA. We combine the base document fee and our service fee into one single payment.
            </p>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <Card className="p-5 text-center border border-slate-200">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Document Fee</div>
                  <div className="text-xl font-bold text-foreground">$49.99</div>
                </Card>
                <Card className="p-5 text-center border border-slate-200">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Fast Processing</div>
                  <div className="text-xl font-bold text-foreground">+$20.00</div>
                </Card>
                <Card className="p-5 text-center border border-slate-200">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Ultra-Fast</div>
                  <div className="text-xl font-bold text-foreground">+$50.00</div>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 border border-slate-200">
                  <h3 className="text-base font-bold text-foreground mb-2">Secure Checkout</h3>
                  <p className="text-sm text-muted-foreground">
                    We process all payments securely using HTTPS (SSL/TLS) encryption. Our systems are PCI-compliant, supporting all major credit and debit cards.
                  </p>
                </Card>
                <Card className="p-6 border border-slate-200">
                  <h3 className="text-base font-bold text-foreground mb-2">Data Protection</h3>
                  <p className="text-sm text-muted-foreground">
                    Your personal information is never shared with third parties. We handle every document according to strict global privacy standards and internal data protection policies.
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">Ready to Apply?</h2>
            <p className="text-sm md:text-base text-muted-foreground mb-6">
              Start your Canada eTA application today and travel with peace of mind.
            </p>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-3 text-base" onClick={() => navigate("/apply")}>
              Start Application
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
