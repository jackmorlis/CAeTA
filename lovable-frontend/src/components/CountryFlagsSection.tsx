import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface EtaCountry {
  country: string;
  iso2: string;
}

// Only countries/territories whose citizens are fully visa-exempt and
// eligible for a standard Canada eTA (as of 2025-11).  UK sub-type
// passports (GBD, GBN, GBO, GBS) are covered under "United Kingdom".
const ETA_ELIGIBLE_COUNTRIES: EtaCountry[] = [
  { country: "Andorra", iso2: "AD" },
  { country: "Anguilla", iso2: "AI" },
  { country: "Australia", iso2: "AU" },
  { country: "Austria", iso2: "AT" },
  { country: "Bahamas", iso2: "BS" },
  { country: "Barbados", iso2: "BB" },
  { country: "Belgium", iso2: "BE" },
  { country: "Bermuda", iso2: "BM" },
  { country: "British Virgin Islands", iso2: "VG" },
  { country: "Brunei", iso2: "BN" },
  { country: "Bulgaria", iso2: "BG" },
  { country: "Cayman Islands", iso2: "KY" },
  { country: "Chile", iso2: "CL" },
  { country: "Croatia", iso2: "HR" },
  { country: "Cyprus", iso2: "CY" },
  { country: "Czech Republic", iso2: "CZ" },
  { country: "Denmark", iso2: "DK" },
  { country: "Estonia", iso2: "EE" },
  { country: "Finland", iso2: "FI" },
  { country: "France", iso2: "FR" },
  { country: "Germany", iso2: "DE" },
  { country: "Greece", iso2: "GR" },
  { country: "Hong Kong", iso2: "HK" },
  { country: "Hungary", iso2: "HU" },
  { country: "Iceland", iso2: "IS" },
  { country: "Ireland", iso2: "IE" },
  { country: "Israel", iso2: "IL" },
  { country: "Italy", iso2: "IT" },
  { country: "Japan", iso2: "JP" },
  { country: "Latvia", iso2: "LV" },
  { country: "Liechtenstein", iso2: "LI" },
  { country: "Lithuania", iso2: "LT" },
  { country: "Luxembourg", iso2: "LU" },
  { country: "Malta", iso2: "MT" },
  { country: "Monaco", iso2: "MC" },
  { country: "Montserrat", iso2: "MS" },
  { country: "Netherlands", iso2: "NL" },
  { country: "New Zealand", iso2: "NZ" },
  { country: "Norway", iso2: "NO" },
  { country: "Papua New Guinea", iso2: "PG" },
  { country: "Poland", iso2: "PL" },
  { country: "Portugal", iso2: "PT" },
  { country: "Qatar", iso2: "QA" },
  { country: "Romania", iso2: "RO" },
  { country: "Samoa", iso2: "WS" },
  { country: "San Marino", iso2: "SM" },
  { country: "Singapore", iso2: "SG" },
  { country: "Slovakia", iso2: "SK" },
  { country: "Slovenia", iso2: "SI" },
  { country: "Solomon Islands", iso2: "SB" },
  { country: "South Korea", iso2: "KR" },
  { country: "Spain", iso2: "ES" },
  { country: "St. Helena", iso2: "SH" },
  { country: "Sweden", iso2: "SE" },
  { country: "Switzerland", iso2: "CH" },
  { country: "Taiwan", iso2: "TW" },
  { country: "Turks & Caicos Islands", iso2: "TC" },
  { country: "United Arab Emirates", iso2: "AE" },
  { country: "United Kingdom", iso2: "GB" },
  { country: "Vatican City", iso2: "VA" },
];

const CountryFlagsSection = () => {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const INITIAL_DISPLAY_COUNT = 20;

  const isSearching = search.trim().length > 0;
  const filtered = isSearching
    ? ETA_ELIGIBLE_COUNTRIES.filter((c) =>
        c.country.toLowerCase().includes(search.trim().toLowerCase())
      )
    : ETA_ELIGIBLE_COUNTRIES;

  const displayedCountries = isSearching || showAll
    ? filtered
    : filtered.slice(0, INITIAL_DISPLAY_COUNT);

  return (
    <section className="py-16 bg-background font-quicksand">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
            Countries Eligible for a Canada eTA
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6">
            Citizens of these {ETA_ELIGIBLE_COUNTRIES.length} visa-exempt countries and territories need an eTA to fly to or transit through Canada.
          </p>

          {/* Search input */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for your country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-lg border-2 border-gray-200 bg-white text-sm hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
        </div>

        {displayedCountries.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {displayedCountries.map((country) => (
              <Card
                key={country.iso2}
                className="p-3 hover:shadow-soft transition-all duration-300 cursor-pointer hover:scale-105 border-primary/10 bg-white"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`https://flagcdn.com/w40/${country.iso2.toLowerCase()}.png`}
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
        ) : (
          <div className="text-center py-8 max-w-5xl mx-auto">
            <p className="text-muted-foreground">
              No eligible country found for "{search}". This country may require a visa instead of an eTA.
            </p>
          </div>
        )}

        {!isSearching && !showAll && ETA_ELIGIBLE_COUNTRIES.length > INITIAL_DISPLAY_COUNT && (
          <div className="text-center mt-8">
            <Button
              onClick={() => setShowAll(true)}
              variant="outline"
              size="lg"
              className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold px-8 py-3 rounded-lg transition-all duration-200"
            >
              Show All {ETA_ELIGIBLE_COUNTRIES.length} Countries
            </Button>
          </div>
        )}

        {!isSearching && showAll && (
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
    </section>
  );
};

export default CountryFlagsSection;
