import { Card } from "@/components/ui/card";
import { Users, FileText, AlertCircle } from "lucide-react";

const InfoCardsSection = () => {
  const infoCards = [
    {
      title: "What is a Canada eTA?",
      description: "An Electronic Travel Authorization (eTA) is an entry requirement for visa-exempt foreign nationals travelling to Canada by air. It is electronically linked to your passport.",
      icon: FileText,
    },
    {
      title: "Who Needs an eTA?",
      description: "Citizens of visa-exempt countries (excluding the U.S.) who are flying to or transiting through a Canadian airport need an eTA.",
      icon: Users,
    },
    {
      title: "Important",
      description: "Apply before you book your flight. An approved eTA is valid for up to five years or until your passport expires, whichever comes first.",
      icon: AlertCircle,
    },
  ];

  return (
    <section className="py-12 bg-primary">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {infoCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card
                key={index}
                className="bg-white border-l-4 border-l-primary rounded-lg p-6 shadow-soft"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon size={20} />
                  </div>
                  <h4 className="text-lg font-bold text-primary">
                    {card.title}
                  </h4>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {card.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default InfoCardsSection;
