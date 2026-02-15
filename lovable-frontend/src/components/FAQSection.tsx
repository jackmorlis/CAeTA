import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqData = [
  {
    question: "What is the Curaçao Digital Immigration Card?",
    answer: "The Curaçao Digital Immigration Card is the electronic entry and exit form required by Curaçao Immigration for all travelers. It replaces the old paper-based customs and immigration forms and must be completed online before arrival or departure."
  },
  {
    question: "Who needs to fill out the Immigration Card?",
    answer: "All travelers entering or departing Curaçao are required to complete the Curaçao Digital Immigration Card, including tourists, residents, and minors. Parents or guardians must fill out the form on behalf of children."
  },
  {
    question: "When should I fill out the Immigration Card?",
    answer: "You should complete your Curaçao Digital Immigration Card before traveling, ideally 72 hours before your departure date. Having it ready in advance ensures a smoother experience at immigration and helps avoid delays at the airport."
  },
  {
    question: "What information do I need?",
    answer: "You will need your passport details, flight information, accommodation details in Curaçao, and customs declarations. Make sure all information matches your travel documents exactly."
  },
  {
    question: "Is the Curaçao Digital Immigration Card mandatory?",
    answer: "Yes. The Curaçao Digital Immigration Card is required for all travelers entering and leaving Curaçao. It consolidates the immigration, customs, and public health forms into a single digital document."
  },
  {
    question: "How long is the Immigration Card valid?",
    answer: "The Curaçao Digital Immigration Card is valid for one entry and must be completed for each trip. If you are visiting Curaçao multiple times, you will need to fill out a new Immigration Card for every journey."
  },
  {
    question: "What if I make a mistake?",
    answer: "If you notice an error in your application, contact our support team as soon as possible for corrections before your travel date. Using our guided service helps minimize errors and ensures accurate completion."
  },
  {
    question: "How will I receive my Immigration Card?",
    answer: "Once your application is processed, you will receive your Curaçao Digital Immigration Card via email as a PDF with a QR code. Present this QR code to immigration officers upon arrival in Curaçao, either printed or on your mobile device."
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
