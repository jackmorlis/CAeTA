import { Clock, Shield, Headphones, CheckCircle, ListChecks, ClipboardCheck, FileCheck2, Languages } from "lucide-react";
import { Card } from "@/components/ui/card";

const WhyChooseUsSection = () => {
  const benefits = [
    {
      icon: Clock,
      title: "Fast Processing",
      description: "Get your Curaçao Digital Immigration Card approved within 24-48 hours with our streamlined process.",
    },
    {
      icon: Shield,
      title: "100% Secure",
      description: "Your personal information is encrypted and protected with bank-level security protocols.",
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "Our dedicated support team is available around the clock to assist you with any questions.",
    },
    {
      icon: CheckCircle,
      title: "100% Money-Back Guarantee",
      description: "If you don’t get approved, you get a full refund. We review every application to meet all requirements before submission.",
    },
    {
      icon: ListChecks,
      title: "Clear, Step-by-Step Forms",
      description: "Easy guidance at every stage so you know exactly what to enter and where.",
    },
    {
      icon: ClipboardCheck,
      title: "Professional Review for Mistakes",
      description: "We carefully check your information and correct issues before submission.",
    },
    {
      icon: FileCheck2,
      title: "Help with Document Preparation",
      description: "Support to ensure your files meet the required format and specifications.",
    },
    {
      icon: Languages,
      title: "Customer Support in Multiple Languages",
      description: "Assistance available throughout the entire process whenever you need it.",
    },
  ];

  return (
    <section className="py-12 bg-primary">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-2">
            Why Choose Us?
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Card
                key={index}
                className="p-4 bg-white hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-primary mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-snug">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
