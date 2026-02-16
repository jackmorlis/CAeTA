import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqData = [
  {
    question: "What exactly is the Curaçao Digital Immigration Card?",
    answer: "The Curaçao Digital Immigration Card is an electronic travel document required for all travelers entering or leaving Curaçao. It collects customs, immigration, and health information digitally."
  },
  {
    question: "How much does the Digital Immigration Card cost?",
    answer: "The fee varies depending on your nationality and the processing option. Service fees may also apply if you use an online application service for guidance and support."
  },
  {
    question: "When should I apply for the Curaçao Digital Immigration Card?",
    answer: "You should complete your Digital Immigration Card application before traveling. Having your documents ready in advance will help avoid delays upon arrival in Curaçao."
  },
  {
    question: "Are children required to have a Digital Immigration Card too?",
    answer: "Yes. Every traveler, including children and infants, must hold their own valid visa. Parents or guardians can apply on behalf of minors."
  },
  {
    question: "How will I receive my Digital Immigration Card?",
    answer: "The visa is issued at the immigration counter upon arrival. You may need to provide supporting documents and pay the applicable fee directly."
  },
  {
    question: "What if I make a mistake in my application?",
    answer: "If errors are found, immigration officers may request corrections or additional documents at the border. Using a guided online service can help minimize mistakes before travel."
  },
  {
    question: "Do I still need a visa if I’m from a visa-exempt country?",
    answer: "The Curaçao Digital Immigration Card is required for all travelers regardless of nationality. It is not a visa but a mandatory digital form for entry and exit procedures."
  },
  {
    question: "Why should I apply using this website?",
    answer: "We provide step-by-step guidance, document checking, and 24/7 support to make your Digital Immigration Card process smoother and stress-free."
  }
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-16 px-4 bg-muted/50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqData.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-2 pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
