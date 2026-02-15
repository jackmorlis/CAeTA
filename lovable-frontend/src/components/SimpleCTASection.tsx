import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const SimpleCTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-primary">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Apply?
        </h2>
        <p className="text-white/90 mb-8 max-w-2xl mx-auto text-lg">
          Complete your Curaçao Digital Immigration Card application in minutes.
          Fast, secure, and hassle-free.
        </p>
        <Button
          size="lg"
          onClick={() => navigate('/apply')}
          className="bg-white hover:bg-white/90 text-primary font-bold px-12 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Start Your Application
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </section>
  );
};

export default SimpleCTASection;
