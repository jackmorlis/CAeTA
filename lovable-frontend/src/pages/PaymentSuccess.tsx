import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Mail, FileText, Plane } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiClient, type ApplicationResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { SITE_CONFIG } from "@/config/site";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applicationData, setApplicationData] = useState<ApplicationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplicationData = async () => {
      try {
        const sessionId = sessionStorage.getItem('application_session_id');

        if (!sessionId) {
          toast({
            title: "Error",
            description: "No application reference found. Please contact support.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        const data = await apiClient.getApplication(sessionId);
        setApplicationData(data);

        // Fire Google Ads conversion event - DISABLED
        // if (typeof window !== 'undefined' && (window as any).gtag) {
        //   (window as any).gtag('event', 'conversion', {
        //     'send_to': 'AW-17607605598/67DnCJvxsK0bEN76-stB',
        //     'value': data.payment_amount || 1.0,
        //     'currency': 'USD',
        //     'transaction_id': sessionId
        //   });
        // }
      } catch (error: any) {
        console.error('Failed to load application:', error);
        toast({
          title: "Error",
          description: "Failed to load application details. Please contact support with your reference number.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchApplicationData();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-gray-600">Loading your application details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Calculate delivery info based on arrival date
  const getDeliveryInfo = () => {
    if (!applicationData?.arrival_date) {
      return null;
    }

    const earliestArrivalDate = new Date(applicationData.arrival_date + 'T00:00:00');

    const now = new Date();
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'America/Curacao' }));
    today.setHours(0, 0, 0, 0);
    const daysUntilArrival = Math.ceil((earliestArrivalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilArrival > 7) {
      const deliveryDate = new Date(earliestArrivalDate);
      deliveryDate.setDate(deliveryDate.getDate() - 7);

      return {
        deliveryDateFormatted: deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
        deliveryDay: deliveryDate.getDate(),
        deliveryMonth: deliveryDate.toLocaleDateString('en-US', { month: 'short' }),
      };
    }

    return null;
  };

  const deliveryInfo = getDeliveryInfo();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <Header minimal={!!deliveryInfo} />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Delivery Tracker - Only show if arrival >2 days away */}
          {deliveryInfo && (
            <Card className="mb-6 overflow-hidden">
              <CardContent className="p-0">
                {/* Header with progress bar and delivery date */}
                <div className="flex items-center justify-between p-4 border-b bg-white">
                  <div className="flex-1 mr-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-blue-500 rounded-full"></div>
                    </div>
                  </div>
                  <img src="https://flagcdn.com/w40/cw.png" alt="CW" className="w-8 h-5 rounded mr-3" />
                  <div className="border-2 border-gray-800 rounded-lg px-3 py-2 text-center min-w-[90px]">
                    <p className="text-[10px] text-gray-500 uppercase">Est. delivery</p>
                    <p className="text-xl font-bold text-gray-900 leading-tight">{deliveryInfo.deliveryMonth} {deliveryInfo.deliveryDay}</p>
                    <p className="text-[10px] text-gray-500">07:00 AM</p>
                  </div>
                </div>

                {/* Progress steps */}
                <div className="px-4 py-3 bg-gray-50">
                  <div className="flex items-center justify-center mb-2">
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                      Waiting
                    </span>
                  </div>
                  <div className="flex items-center justify-between max-w-md mx-auto">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm">✓</div>
                      <span className="text-xs text-gray-600 mt-1">Application</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-gray-900 mx-2"></div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">2</div>
                      <span className="text-xs text-gray-600 mt-1">Waiting</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-sm">3</div>
                      <span className="text-xs text-gray-400 mt-1">Delivered</span>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="p-4 text-left text-sm text-gray-700">
                  <p>
                    We've received your <strong>Curaçao Digital Immigration Card</strong> application and are currently reviewing it. Your document will be delivered on <strong>{deliveryInfo.deliveryDateFormatted}</strong>.
                  </p>
                  <p className="mt-2 text-gray-500 text-xs">
                    The estimated delivery date ensures that your Curaçao Digital Immigration Card will be valid on the date of your trip.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Icon */}
          <div className="mb-8">
            <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600 text-lg">
              Your Curaçao Digital Immigration Card (Immigration Card) application has been submitted successfully
            </p>
          </div>

          {/* Confirmation Details */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="font-semibold text-green-800 mb-2">
                    Application Reference Number
                  </p>
                  <p className="text-2xl font-mono text-green-700 break-all">
                    {applicationData?.session_id || 'N/A'}
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    Please save this reference number for your records
                  </p>
                </div>

                <div className="text-left space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Application Type:</span>
                    <span className="font-medium">Immigration Card Application</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Processing Time:</span>
                    <span className="font-medium">0-8 hours</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-medium">
                      ${applicationData?.amount_paid?.toFixed(2) || '50.00'} USD
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium">
                      {applicationData?.payment_method === 'paypal' ? 'PayPal' : 'Credit Card'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-medium font-mono text-sm break-all">
                      {applicationData?.payment_transaction_id || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Support */}
          <div className="bg-slate-50 p-6 rounded-lg mb-8">
            <h3 className="font-semibold text-slate-800 mb-2 text-lg">Need Help?</h3>
            <p className="text-slate-600">
              Customer Support:{' '}
              <a
                href={`mailto:${SITE_CONFIG.supportEmail}`}
                className="text-blue-600 hover:underline font-medium"
              >
                {SITE_CONFIG.supportEmail}
              </a>
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Please include your application reference number when contacting support
            </p>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 p-6 rounded-lg mb-8 text-left">
            <h3 className="font-semibold text-blue-900 mb-4 text-lg">What happens next?</h3>
            <ul className="space-y-4 text-blue-800">
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="block mb-1">Email Confirmation</strong>
                  <span className="text-sm">
                    You will receive a confirmation email shortly. If you don't receive it within
                    15 minutes, please check your spam folder.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <FileText className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="block mb-1">Immigration Card Delivery</strong>
                  <span className="text-sm">
                    You will receive your Curaçao Digital Immigration Card via email as a PDF with a QR code. Present this QR code to immigration upon arrival, either printed or on your mobile device.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Plane className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="block mb-1">At Immigration</strong>
                  <span className="text-sm">
                    Please present the Immigration Card email at Curaçao immigration upon arrival.
                    <strong> Free WiFi is available at the airport</strong> if you need to access
                    your email to retrieve the document.
                  </span>
                </div>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center">
            <Button
              onClick={() => navigate("/")}
              className="bg-red-600 hover:bg-red-700 text-white px-8"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PaymentSuccess;
