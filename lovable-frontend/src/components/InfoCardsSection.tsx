import { Card } from "@/components/ui/card";
import { Users, FileText, AlertCircle } from "lucide-react";

const InfoCardsSection = () => {
  const infoCards = [
    {
      title: "What is the Curaçao Digital Immigration Card?",
      description: "New online form for traveller identification and entry details — replacing the old paper card.",
      icon: FileText,
    },
    {
      title: "Who Needs It?",
      description: "Required for all travellers entering or departing Curaçao.",
      icon: Users,
    },
    {
      title: "Important",
      description: "Complete in English to avoid delays or penalties. The form must be filled within three (3) days before arrival (i.e., up to 72 hours before your entry).",
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
