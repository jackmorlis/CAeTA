import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Shield, Headphones, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import arrivalCardImage from "@/assets/arrival-card.jpg";

const InfoSection = () => {
  const navigate = useNavigate();

  const advantages = [{
    icon: Clock,
    title: "Available Anytime",
    description: "Access our services 24 hours a day, year-round"
  }, {
    icon: RefreshCw,
    title: "Refund Protection",
    description: "Not happy with your application? Request a refund easily."
  }, {
    icon: Headphones,
    title: "Round-the-Clock Support",
    description: "Our team is ready to assist you at any time."
  }, {
    icon: Shield,
    title: "Effortless Process",
    description: "A simple, step-by-step application procedure"
  }];
  
  return <div className="pt-16 pb-8 bg-background font-quicksand">
      <div className="container mx-auto px-4 space-y-16">
        
        {/* What is Dominican Republic E-Ticket Section */}
        <div className="mx-4 lg:mx-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-primary">
                Understanding the <span className="text-primary-light">Dominican Republic E-Ticket</span>
              </h2>

              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  The <strong className="text-primary">Dominican Republic E-Ticket</strong> is a crucial travel document required for anyone entering the Dominican Republic. It collects essential information about visitors for immigration and entry tracking.
                </p>
                
                <p>
                  The Travel Declaration Card is designed to <strong className="text-primary">make your arrival smoother</strong> while supporting data collection for security and reporting purposes.
                </p>
                
                <p>
                  This process used to involve filling out a paper form at the airport. Today, everything is handled electronically, removing the need for physical paperwork entirely.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'instant' });
                  navigate('/apply');
                }} className="bg-primary hover:bg-primary-dark text-primary-foreground font-semibold px-6 py-3 rounded-lg shadow-soft transition-all duration-200">
                  Start Your Entry &gt;&gt;
                </Button>
                <Button variant="outline" size="lg" className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold px-6 py-3 rounded-lg transition-all duration-200">
                  Check Your Status
                </Button>
              </div>
            </div>
            
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <img src={arrivalCardImage} alt="Dominican Republic E-Ticket Preview" className="w-full h-auto rounded-lg shadow-soft" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Advantages Section */}
        <div className="bg-primary rounded-3xl p-8 lg:p-12 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
              Why Use Our Service
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {advantages.map((advantage, index) => {
            const IconComponent = advantage.icon;
            return <Card key={index} className="p-6 text-center bg-white/10 backdrop-blur-sm border-white/20 shadow-soft hover:shadow-elegant hover:bg-white/15 transition-all duration-300">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-primary-foreground mb-2">
                    {advantage.title}
                  </h3>
                  <p className="text-sm text-primary-foreground/80">
                    {advantage.description}
                  </p>
                </Card>;
          })}
          </div>
        </div>
        
        {/* Do I Need Section */}
        <div className="bg-accent/30 rounded-3xl p-8 lg:p-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-6 text-center">
            Do You Need an <span className="text-primary-light">Dominican Republic E-Ticket</span>?
          </h2>

          <div className="space-y-4 text-center max-w-4xl mx-auto">
            <p className="text-lg text-muted-foreground">
              <strong className="text-primary">Yes</strong>, all travelers entering the Dominican Republic must have a verified Travel Declaration Card.
            </p>
            
            <p className="text-lg text-muted-foreground">
              <strong className="text-primary-dark">Without this document, you cannot enter the country.</strong>
            </p>
            
            <p className="text-muted-foreground">
              Keep in mind, the Travel Declaration Card is separate from a visa. Even if a visa isn’t required, <strong className="text-primary">the Travel Declaration Card is always mandatory.</strong>
            </p>
          </div>
        </div>
        
        {/* Countries Section */}
        <div className="text-center">
        </div>
        
      </div>
    </div>;
};

export default InfoSection;
