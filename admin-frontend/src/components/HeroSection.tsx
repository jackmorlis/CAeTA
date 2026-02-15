import { Button } from "@/components/ui/button";
import { FileText, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import bannerImage from "@/assets/thailand-beach-boat.jpg";
const HeroSection = () => {
  const navigate = useNavigate();

  return <section className="font-quicksand">
      {/* Desktop and Tablet */}
      <div className="hidden sm:flex relative bg-cover bg-center items-start justify-end max-h-[400px] md:max-h-[450px] lg:max-h-[500px]" style={{
      backgroundImage: `url(${bannerImage})`
    }}>
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Content Section - Semi-transparent overlay */}
        <div className="relative bg-white/85 backdrop-blur-md w-3/5 md:w-3/5 lg:w-3/5 flex items-start pt-2 md:pt-3 lg:pt-2 pb-2 md:pb-3 lg:pb-6">
          <div className="p-4 md:p-6 lg:p-12 w-full">
            <div className="space-y-3 md:space-y-4 lg:space-y-6 text-left">
              {/* Headline */}
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-6xl font-bold text-primary mb-2 md:mb-3 lg:mb-4 leading-tight">Dominican Republic E-Ticket</h1>
                <p className="text-sm md:text-base lg:text-2xl text-gray-800 mb-3 md:mb-4 lg:mb-6 leading-relaxed font-medium">Travelers must present a valid Dominican Republic E-Ticket to complete entry formalities upon arrival.</p>
              </div>

              {/* Process Steps */}
              <div className="space-y-3 md:space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
                <div className="flex items-start gap-2 md:gap-3 lg:gap-4">
                  <div className="w-6 h-6 md:w-8 md:h-8 lg:w-14 lg:h-14 bg-primary flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3 h-3 md:w-4 md:h-4 lg:w-7 lg:h-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xs md:text-sm lg:text-lg font-bold text-primary mb-1">
                      Fill Out the Form
                    </h3>
                    <p className="text-gray-700 text-xs md:text-xs lg:text-base font-medium">
                      Provide your details accurately to generate your digital arrival card.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 md:gap-3 lg:gap-4">
                  <div className="w-6 h-6 md:w-8 md:h-8 lg:w-14 lg:h-14 bg-primary flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3 h-3 md:w-4 md:h-4 lg:w-7 lg:h-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xs md:text-sm lg:text-lg font-bold text-primary mb-1">
                      Receive Your Card
                    </h3>
                    <p className="text-gray-700 text-xs md:text-xs lg:text-base font-medium">Your Dominican Republic E-Ticket will be sent to your email as a PDF document.</p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col lg:flex-row gap-2 md:gap-3 lg:gap-4 pt-2 lg:pt-3">
                <Button size="lg" onClick={() => navigate('/apply')} className="w-full bg-primary hover:bg-primary-dark text-primary-foreground font-bold px-3 md:px-4 lg:px-8 py-2 md:py-3 lg:py-4 shadow-lg hover:shadow-xl transition-all duration-300 text-xs md:text-sm lg:text-base">Apply for Your Dominican Republic E-Ticket</Button>
                <Button variant="outline" size="lg" onClick={() => navigate('/contact')} className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-bold px-3 md:px-4 lg:px-8 py-2 md:py-3 lg:py-4 transition-all duration-300 text-xs md:text-sm lg:text-base">
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="sm:hidden relative">
        {/* Background Image Section */}
        <div className="h-[30vh] bg-cover bg-center relative" style={{
        backgroundImage: `url(${bannerImage})`
      }}>
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Floating Content Box */}
        <div className="relative -mt-12 mx-4 mb-8">
          <div className="bg-white/90 backdrop-blur-md p-6 shadow-2xl rounded-lg">
            <div className="space-y-4 text-left">
              {/* Headline */}
              <div>
                <h1 className="text-2xl font-bold text-primary mb-2 leading-tight">
                  Dominican Republic E-Ticket
                </h1>
                <p className="text-sm text-gray-800 mb-4 leading-relaxed font-medium">
                  A valid Dominican Republic E-Ticket is required for all travelers to complete entry procedures.
                </p>
              </div>

              {/* Process Steps */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary mb-1">
                      Fill Out the Form
                    </h3>
                    <p className="text-gray-700 text-xs font-medium">
                      Complete your details to generate the digital arrival card.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary mb-1">
                      Receive Your Card
                    </h3>
                    <p className="text-gray-700 text-xs font-medium">
                      Your digital arrival card will be sent directly to your email as a PDF.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <Button size="lg" onClick={() => navigate('/apply')} className="w-full bg-primary hover:bg-primary-dark text-primary-foreground font-bold px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-300 text-sm">
                  Apply for Your Dominican Republic E-Ticket
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate('/contact')} className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-bold px-4 py-3 transition-all duration-300 text-sm">
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* White section below */}
        <div className="bg-white h-20"></div>
      </div>
    </section>;
};
export default HeroSection;