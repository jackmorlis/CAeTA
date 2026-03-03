import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqData = [
  {
    question: "What is a Canada eTA?",
    answer: "A Canada eTA (Electronic Travel Authorization) is an entry requirement for visa-exempt foreign nationals who are travelling to Canada by air. It is electronically linked to your passport and is valid for up to five years or until your passport expires, whichever comes first."
  },
  {
    question: "Who needs a Canada eTA?",
    answer: "Citizens of visa-exempt countries (excluding the United States) who are flying to or transiting through a Canadian airport need an eTA. U.S. citizens do not need an eTA — they are exempt. Canadian citizens cannot apply for an eTA."
  },
  {
    question: "When should I apply for my eTA?",
    answer: "You should apply for your Canada eTA before booking your flight, ideally at least 72 hours before your travel date. Most eTAs are approved within minutes, but some applications may take several days if additional documentation is required."
  },
  {
    question: "What information do I need to apply?",
    answer: "You will need your valid passport, personal details (name, date of birth, gender), contact information (email address), residential address, and travel details. The passport you use to apply must be the same one you use to travel."
  },
  {
    question: "How long is a Canada eTA valid?",
    answer: "An approved Canada eTA is valid for up to five years or until your passport expires, whichever comes first. During that time, you can travel to Canada multiple times for short stays of up to six months at a time."
  },
  {
    question: "What if I make a mistake on my application?",
    answer: "If you notice an error in your application, contact our support team as soon as possible for corrections. Using our guided service helps minimize errors and ensures accurate completion of all required fields."
  },
  {
    question: "Do I need an eTA if I'm driving to Canada?",
    answer: "No. An eTA is only required for air travel to Canada. If you are arriving by land or sea, you do not need an eTA, though you may need other travel documents depending on your nationality."
  },
  {
    question: "How will I receive my eTA confirmation?",
    answer: "Once your eTA application is approved, you will receive a confirmation via email. The eTA is electronically linked to your passport — there is no physical document or stamp. Simply travel with the same passport you used to apply."
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
