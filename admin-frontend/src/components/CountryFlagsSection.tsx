import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Country {
  country: string;
  iso_code: string;
  flag_url: string;
}

const CountryFlagsSection = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const INITIAL_DISPLAY_COUNT = 20; // Show 4 rows of 5 countries initially

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await fetch('/data/country_flag_mapping.csv');
        const csvText = await response.text();
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const parsedCountries: Country[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            // Handle CSV parsing with potential commas in quoted strings
            const csvRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
            const values = line.split(csvRegex);
            if (values.length >= 3) {
              parsedCountries.push({
                country: values[0].replace(/"/g, ''),
                iso_code: values[1].replace(/"/g, ''),
                flag_url: values[2].replace(/"/g, '')
              });
            }
          }
        }
        setCountries(parsedCountries);
        setLoading(false);
      } catch (error) {
        console.error('Error loading countries:', error);
        setLoading(false);
      }
    };
    loadCountries();
  }, []);

  const handleCountryClick = (country: Country) => {
    // Placeholder for URL navigation - user will provide URLs later
    console.log('Clicked country:', country.country, country.iso_code);
    // TODO: Navigate to URL when provided
  };

  const displayedCountries = showAll ? countries : countries.slice(0, INITIAL_DISPLAY_COUNT);

  if (loading) {
    return <section className="py-16 bg-background font-quicksand">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-8">
              Countries that Need an <span className="text-primary-light">Dominican Republic E-Ticket</span>
            </h2>
            <p className="text-lg text-muted-foreground">Loading countries...</p>
          </div>
        </div>
      </section>;
  }

  return <section className="py-16 bg-background font-quicksand">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
            Countries Requiring an <span className="text-primary-light">Dominican Republic E-Ticket</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Travelers from these countries must complete an online application before entering the Dominican Republic.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-4 max-w-5xl mx-auto">
          {displayedCountries.map((country, index) => (
            <Card 
              key={index} 
              className="p-3 hover:shadow-soft transition-all duration-300 cursor-pointer hover:scale-105 border-primary/10 bg-white" 
              onClick={() => handleCountryClick(country)}
            >
              <div className="flex items-center gap-3">
                <img 
                  src={country.flag_url} 
                  alt={`${country.country} flag`} 
                  className="w-8 h-6 object-cover flex-shrink-0" 
                  style={{ borderRadius: '3px' }} 
                  loading="lazy" 
                />
                <span className="text-sm font-medium text-foreground leading-tight truncate">
                  {country.country}
                </span>
              </div>
            </Card>
          ))}
        </div>

        {!showAll && countries.length > INITIAL_DISPLAY_COUNT && (
          <div className="text-center mt-8">
            <Button 
              onClick={() => setShowAll(true)} 
              variant="outline" 
              size="lg" 
              className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold px-8 py-3 rounded-lg transition-all duration-200"
            >
              Show More Countries ({countries.length - INITIAL_DISPLAY_COUNT} more)
            </Button>
          </div>
        )}
        
        {showAll && (
          <div className="text-center mt-8">
            <Button 
              onClick={() => setShowAll(false)} 
              variant="outline" 
              size="lg" 
              className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold px-8 py-3 rounded-lg transition-all duration-200"
            >
              Show Less
            </Button>
          </div>
        )}
      </div>
    </section>;
};

export default CountryFlagsSection;
