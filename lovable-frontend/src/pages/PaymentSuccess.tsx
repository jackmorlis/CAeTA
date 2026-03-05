import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Mail, FileText, Plane, Users } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Payment Successful!
            </h1>
            <p className="text-gray-500 text-base">
              Your Canada eTA application has been submitted successfully
            </p>
          </div>

          {/* Apply for Another Traveler */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <p className="text-blue-800 text-sm sm:text-base">
                <span className="font-semibold">Traveling with others?</span>{' '}
                Each traveler needs their own eTA, including children.
              </p>
            </div>
            <Button
              onClick={() => navigate('/apply')}
              className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap flex-shrink-0"
            >
              Apply for Another Traveler
            </Button>
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
                    <span className="font-medium">eTA Application</span>
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
                  <strong className="block mb-1">eTA Delivery</strong>
                  <span className="text-sm">
                    Your Canada eTA will be electronically linked to your passport. You will receive a confirmation email with your eTA details.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Plane className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="block mb-1">At Immigration</strong>
                  <span className="text-sm">
                    Your eTA is electronically linked to your passport. Make sure to travel with the same passport you used to apply. Present your passport at Canadian immigration upon arrival.
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
