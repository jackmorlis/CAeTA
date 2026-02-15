import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import siteLogo from "@/assets/curacao_digital_entry.webp";

interface HeaderProps {
  fullSticky?: boolean;
  disableLinks?: boolean;
  minimal?: boolean;
}

const Header = ({ fullSticky = false, disableLinks = false, minimal = false }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isApplicationFlow = location.pathname.startsWith("/apply")
    || location.pathname.startsWith("/confirm-payment")
    || location.pathname.startsWith("/payment-success");
  const disclaimerText = isApplicationFlow
    ? "Disclaimer: Curaçao Digital Immigration Card is mandatory for all travelers."
    : "Disclaimer: Curaçao Digital Immigration Card is mandatory for all travelers — curacao.earrivalform.com is an independent assistance portal, not a government site.";

  const handleApplyClick = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    navigate('/apply');
  };

  // Minimal header - only shows the notice banner (for thank you page, etc.)
  if (minimal) {
    return (
      <div className="w-full bg-accent sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-6 py-2">
          <p className="text-center text-xs sm:text-sm font-semibold text-accent-foreground">
            {disclaimerText}
          </p>
        </div>
      </div>
    );
  }

  // If fullSticky is true (main page), wrap both notice bar and logo bar in a sticky container
  if (fullSticky) {
    return (
      <div className="sticky top-0 z-50">
        {/* Notice banner */}
        <div className="w-full bg-accent">
          <div className="container mx-auto px-3 sm:px-6 py-2">
            <p className="text-center text-xs sm:text-sm font-semibold text-accent-foreground">
              {disclaimerText}
            </p>
          </div>
        </div>

        {/* Main header with logo */}
        <header className="w-full font-quicksand bg-white shadow-sm">
          <div className="container mx-auto px-4 py-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Logo / Flag + Title */}
              <div className="flex items-center gap-3 max-w-full overflow-hidden">
                {disableLinks ? (
                  <img src={siteLogo} alt="Curaçao Digital Immigration Card Logo" className="h-20 sm:h-24 lg:h-28 w-auto object-contain" />
                ) : (
                  <Link to="/" className="max-w-full">
                    <img src={siteLogo} alt="Curaçao Digital Immigration Card Logo" className="h-20 sm:h-24 lg:h-28 w-auto object-contain" />
                  </Link>
                )}
              </div>

              {/* Apply button */}
              {disableLinks ? (
                <div className="w-full sm:w-auto bg-primary text-primary-foreground font-bold px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg shadow-md text-sm sm:text-base whitespace-nowrap flex items-center justify-center h-11">
                  <span className="hidden sm:inline">Apply For Curaçao DI Card</span>
                  <span className="sm:hidden">Apply Now</span>
                </div>
              ) : (
                <Button size="lg" onClick={handleApplyClick} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg text-sm sm:text-base whitespace-nowrap">
                  <span className="hidden sm:inline">Apply For Curaçao DI Card</span>
                  <span className="sm:hidden">Apply Now</span>
                </Button>
              )}
            </div>
          </div>
        </header>
      </div>
    );
  }

  // Otherwise (other pages), notice bar is sticky, logo bar scrolls away
  return (
    <>
      {/* Notice banner - Sticky */}
      <div className="w-full bg-accent sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-6 py-2">
          <p className="text-center text-xs sm:text-sm font-semibold text-accent-foreground">
            {disclaimerText}
          </p>
        </div>
      </div>

      {/* Main header - NOT sticky, scrolls away */}
      <header className="w-full font-quicksand bg-white shadow-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo / Flag + Title */}
            <div className="flex items-center gap-3 max-w-full overflow-hidden">
              {disableLinks ? (
                <img src={siteLogo} alt="Curaçao Digital Immigration Card Logo" className="h-20 sm:h-24 lg:h-28 w-auto object-contain" />
              ) : (
                <Link to="/" className="max-w-full">
                  <img src={siteLogo} alt="Curaçao Digital Immigration Card Logo" className="h-20 sm:h-24 lg:h-28 w-auto object-contain" />
                </Link>
              )}
            </div>

            {/* Apply button */}
            {disableLinks ? (
              <div className="w-full sm:w-auto bg-primary text-primary-foreground font-bold px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg shadow-md text-sm sm:text-base whitespace-nowrap flex items-center justify-center h-11">
                <span className="hidden sm:inline">Apply For Curaçao DI Card</span>
                <span className="sm:hidden">Apply Now</span>
              </div>
            ) : (
              <Button size="lg" onClick={handleApplyClick} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg text-sm sm:text-base whitespace-nowrap">
                <span className="hidden sm:inline">Apply For Curaçao DI Card</span>
                <span className="sm:hidden">Apply Now</span>
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
export default Header;
