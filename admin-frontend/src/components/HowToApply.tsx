import { Card } from "@/components/ui/card";
import { FileText, Mail, Plane } from "lucide-react";

const HowToApply = () => {
  const steps = [
    {
      number: "1",
      title: "Complete the form",
      icon: FileText,
      description:
        "Enter your travel and personal details in the online application.",
    },
    {
      number: "2",
      title: "Get your arrival card by email",
      icon: Mail,
      description:
        "Receive your Curaçao Digital Immigration Card as a PDF via email.",
    },
    {
      number: "3",
      title: "Show it at the airport",
      icon: Plane,
      description:
        "Present the card to immigration on arrival in Curaçao.",
    },
  ];

  return (
    <section className="py-16 bg-accent/30 font-quicksand">
      <div className="container mx-auto px-4">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
            How to Apply
          </h2>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <Card
                key={index}
                className="relative p-8 bg-white shadow-soft hover:shadow-elegant transition-all duration-300 transform hover:scale-105 border-primary/10"
              >
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-light text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                      {step.number}
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-primary mb-4">
                    {step.title}
                  </h3>

                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowToApply;
