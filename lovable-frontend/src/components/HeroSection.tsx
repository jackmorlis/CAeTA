import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import worldDottedMap from "@/assets/world-dotted-map.png";
import { FileText, Mail } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative bg-gradient-to-b from-white via-blue-50 to-blue-100 shadow-[0_8px_32px_-8px_rgba(30,77,183,0.15)] overflow-hidden">
      {/* Decorative dotted world map background - Desktop only */}
      <div className="hidden md:block absolute inset-0 opacity-15 pointer-events-none overflow-hidden mix-blend-multiply">
        <img src={worldDottedMap} alt="" className="w-full h-full object-cover" />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block container mx-auto px-6 pt-8 md:pt-12 pb-10 md:pb-14 relative z-10">
        <div className="grid md:grid-cols-[1fr_400px] gap-10 items-center max-w-6xl mx-auto">
          {/* Left Content */}
          <div>
            <div className="inline-block bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-bold text-sm mb-3">
              Canada Electronic Travel Authorization (eTA)
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
              Apply for Your Canada eTA Online — Fast &amp; Easy
            </h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
              A Canada eTA is an electronic travel authorization required for visa-exempt foreign nationals travelling to Canada by air. Apply online in minutes with our guided assistance service.
            </p>
            <div className="flex gap-4 mb-5">
              <Button
                size="lg"
                onClick={() => navigate('/apply')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                Apply Now
              </Button>
            </div>
            <div className="hidden md:block max-w-2xl rounded-md border border-amber-200/60 bg-amber-50/50 px-3 py-2 text-xs italic text-amber-900/70">
              This website is a private, independent service provider and is not affiliated with, endorsed by, or operated by any government agency. We are not part of or connected to any official immigration or border authority.
            </div>
          </div>

          {/* Right Steps Card */}
          <div className="relative bg-gradient-to-b from-white to-[#f0f5ff] rounded-2xl shadow-lg p-8">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-40 pointer-events-none" />
            <div className="relative">
              <h3 className="text-2xl font-bold text-primary mb-4">Application Process</h3>

              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-extrabold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <div className="font-bold text-foreground">Complete the online form</div>
                    <div className="text-sm text-muted-foreground mt-0.5">Enter your passport, personal, and travel details accurately.</div>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-extrabold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <div className="font-bold text-foreground">Pay the processing fee</div>
                    <div className="text-sm text-muted-foreground mt-0.5">Use secure payment options provided on our portal.</div>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-extrabold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <div className="font-bold text-foreground">Details Review &amp; Verification</div>
                    <div className="text-sm text-muted-foreground mt-0.5">Our specialists review your application to ensure all information is complete and accurate before processing.</div>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-extrabold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <div className="font-bold text-foreground">Delivery &amp; Approval</div>
                    <div className="text-sm text-muted-foreground mt-0.5">Receive your eTA confirmation via email once approved. Your eTA is electronically linked to your passport.</div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground mt-5 pt-4 border-t border-border">
                Pro Tip: Apply at least 72 hours before your travel date.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden container mx-auto px-4 py-8 relative z-10">
        <div className="text-center space-y-6">
          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground leading-tight">
            Canada eTA — Electronic Travel Authorization
          </h2>

          {/* Description */}
          <p className="text-base text-muted-foreground">
            A Canada eTA is required for visa-exempt foreign nationals travelling to Canada by air.
          </p>

          {/* Simple Cards */}
          <div className="space-y-4 mt-8">
            {/* Fill Out Form Card */}
            <div className="bg-white rounded-lg p-6 shadow-md flex items-start gap-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-foreground text-lg mb-2">Fill Out the Form</h3>
                <p className="text-sm text-muted-foreground">
                  Complete your passport and travel details to apply for your Canada eTA.
                </p>
              </div>
            </div>

            {/* Receive eTA */}
            <div className="bg-white rounded-lg p-6 shadow-md flex items-start gap-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-foreground text-lg mb-2">Receive Your eTA</h3>
                <p className="text-sm text-muted-foreground">
                  Your eTA confirmation will be sent directly to your email. It is electronically linked to your passport.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Apply Button */}
          <Button
            size="lg"
            onClick={() => navigate('/apply')}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold mt-6"
          >
            Apply Now
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
