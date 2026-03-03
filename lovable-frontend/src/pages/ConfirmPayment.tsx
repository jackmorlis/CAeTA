import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, CreditCard, Lock } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
const ConfirmPayment = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const handlePayment = async () => {
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Navigate to success page
    navigate("/payment-success");
  };
  return <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Confirm Payment
            </h1>
            <p className="text-gray-600">
              Complete your Canada eTA application payment
            </p>
          </div>

          {/* Payment Form */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Canada eTA Application</span>
                    <span>$50.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing Fee</span>
                    <span>$5.00</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>$55.00</span>
                  </div>
                </div>
              </div>

              {/* Card Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input id="card-number" placeholder="1234 5678 9012 3456" maxLength={19} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input id="expiry" placeholder="MM/YY" maxLength={5} />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input id="cvv" placeholder="123" maxLength={4} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cardholder">Cardholder Name</Label>
                  <Input id="cardholder" placeholder="John Doe" />
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-green-800 mb-1">
                      Your payment is secure
                    </p>
                    <p className="text-green-700">
                      We use industry-standard encryption to protect your payment information.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => navigate("/apply")} className="flex-1">
                  Back to Application
                </Button>
                <Button onClick={handlePayment} disabled={isProcessing} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                  <Lock className="h-4 w-4 mr-2" />
                  {isProcessing ? "Processing..." : "Confirm Payment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>;
};
export default ConfirmPayment;