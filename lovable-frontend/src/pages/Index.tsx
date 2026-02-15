import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import InfoCardsSection from "@/components/InfoCardsSection";
import SimpleCTASection from "@/components/SimpleCTASection";
import CountryFlagsSection from "@/components/CountryFlagsSection";
import WhyChooseUsSection from "@/components/WhyChooseUsSection";
import VisaGuideSection from "@/components/VisaGuideSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header fullSticky />
      <HeroSection />
      <InfoCardsSection />
      <SimpleCTASection />
      <CountryFlagsSection />
      <WhyChooseUsSection />
      <VisaGuideSection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default Index;
