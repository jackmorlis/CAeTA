import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface PaymentStepProps {
  amount: string;
  onSuccess: (paymentData: {
    orderId: string;
    transactionId: string;
    amount: string;
    paymentMethod: 'paypal' | 'card';
    status: string;
  }) => void;
  onError: (error: string) => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

export const PaymentStep = ({ amount, onSuccess, onError }: PaymentStepProps) => {
  const { toast } = useToast();
  const paypalButtonRef = useRef<HTMLDivElement>(null);
  const cardNumberRef = useRef<HTMLDivElement>(null);
  const cardExpiryRef = useRef<HTMLDivElement>(null);
  const cardCvvRef = useRef<HTMLDivElement>(null);
  const [cardholderName, setCardholderName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardFieldsReady, setCardFieldsReady] = useState(false);
  const cardFieldInstanceRef = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    console.log('PaymentStep mounted');

    // Prevent re-initialization
    if (initializedRef.current) {
      console.log('PayPal already initialized, skipping');
      return;
    }

    // Wait for PayPal SDK to load
    const initializePayPal = () => {
      console.log('Checking for PayPal SDK...', window.paypal ? 'Found' : 'Not found');
      if (!window.paypal) {
        setTimeout(initializePayPal, 100);
        return;
      }

      console.log('🔵 Starting PayPal initialization');
      console.log('PayPal SDK Info:', {
        version: window.paypal.version,
        Buttons: typeof window.paypal.Buttons,
        CardFields: typeof window.paypal.CardFields
      });
      initializedRef.current = true;

      // Initialize PayPal Button
      if (paypalButtonRef.current && !paypalButtonRef.current.hasChildNodes()) {
        console.log('🔵 Rendering PayPal button...');
        window.paypal.Buttons({
          createOrder: async () => {
            try {
              console.log('🔵 [PayPal Button] Creating order with amount:', amount);
              const response = await apiClient.createPayPalOrder(amount);
              console.log('✅ [PayPal Button] Order created:', response.order_id);
              return response.order_id;
            } catch (error: any) {
              console.error('❌ [PayPal Button] Order creation failed:', error);
              toast({
                title: 'Error',
                description: error.message || 'Failed to create payment',
                variant: 'destructive',
              });
              throw error;
            }
          },
          onApprove: async (data: any) => {
            try {
              const response = await apiClient.capturePayPalOrder(data.orderID);

              // Validate payment status - only accept COMPLETED or PENDING
              if (response.status !== 'COMPLETED' && response.status !== 'PENDING') {
                throw new Error('Your payment could not be processed. Please try again or use a different payment method.');
              }

              onSuccess({
                orderId: response.order_id,
                transactionId: response.transaction_id || '',
                amount: response.amount || amount,
                paymentMethod: 'paypal',
                status: response.status,
              });
            } catch (error: any) {
              // Show user-friendly error from backend or fallback message
              const errorMessage = error.response?.data?.detail || error.message || 'Payment could not be completed. Please try again or use a different payment method.';
              onError(errorMessage);
            }
          },
          onError: (err: any) => {
            onError('Payment could not be completed. Please try again or use a different payment method.');
            console.error('PayPal error:', err);
          },
        }).render(paypalButtonRef.current);
        console.log('PayPal button rendered');
      } else {
        console.log('PayPal button ref not ready or already has children');
      }

      // Initialize Card Fields
      console.log('Initializing card fields...');
      console.log('window.paypal.CardFields exists:', typeof window.paypal.CardFields);

      let cardField;
      try {
        cardField = window.paypal.CardFields({
          createOrder: async () => {
            try {
              console.log('🔵 Creating PayPal order with amount:', amount);
              const response = await apiClient.createPayPalOrder(amount);
              console.log('✅ Order created successfully:', {
                order_id: response.order_id,
                status: response.status,
                approval_url: response.approval_url
              });
              return response.order_id;
            } catch (error: any) {
              console.error('❌ Order creation failed:', error);
              toast({
                title: 'Error',
                description: error.message || 'Failed to create payment',
                variant: 'destructive',
              });
              throw error;
            }
          },
          onApprove: async (data: any) => {
            console.log('✅ Card payment approved by PayPal:', data);
            setIsProcessing(true);
            try {
              const response = await apiClient.capturePayPalOrder(data.orderID);
              console.log('✅ Payment captured successfully:', response);

              // Validate payment status - only accept COMPLETED or PENDING
              if (response.status !== 'COMPLETED' && response.status !== 'PENDING') {
                throw new Error('Your payment could not be processed. Please check your payment details and try again.');
              }

              onSuccess({
                orderId: response.order_id,
                transactionId: response.transaction_id || '',
                amount: response.amount || amount,
                paymentMethod: 'card',
                status: response.status,
              });
            } catch (error: any) {
              console.error('❌ Payment capture failed:', error);
              // Show user-friendly error from backend or fallback message
              const errorMessage = error.response?.data?.detail || error.message || 'Payment could not be completed. Please try again or use a different payment method.';
              onError(errorMessage);
            } finally {
              setIsProcessing(false);
            }
          },
          onError: (err: any) => {
            console.error('========== PAYPAL CARD ERROR DETAILS ==========');
            console.error('Error Type:', typeof err);
            console.error('Error Name:', err?.name);
            console.error('Error Message:', err?.message);
            console.error('Error Details:', err?.details);
            console.error('PayPal Debug ID:', err?.debug_id);
            console.error('Error Links:', err?.links);
            console.error('Full Error Object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
            console.error('Raw Error:', err);
            console.error('===============================================');
            setIsProcessing(false);
            onError('Card payment error occurred');
          },
          style: {
            'input': {
              'font-size': '16px',
              'font-family': 'system-ui, -apple-system, sans-serif',
              'color': '#1e293b',
              'padding': '12px',
              'border': 'none',
              'outline': 'none',
            },
            ':focus': {
              'color': '#1e293b',
              'border': 'none',
              'outline': 'none',
            },
            '.invalid': {
              'color': '#dc2626',
            },
            '.valid': {
              'color': '#1e293b',
            }
          },
        });
        console.log('CardFields instance created:', cardField);
      } catch (error) {
        console.error('Error creating CardFields instance:', error);
        return;
      }

      cardFieldInstanceRef.current = cardField;

      // Render card fields (wait for refs to be ready with setTimeout)
      let retryCount = 0;
      const maxRetries = 50; // Maximum 5 seconds (50 * 100ms)

      const renderCardFields = () => {
        try {
          console.log('Checking card field eligibility...');
          const isEligible = cardField.isEligible();
          console.log('Card fields isEligible:', isEligible);

          if (isEligible) {
            console.log('Card fields are eligible, attempting to render...');
            console.log('Refs ready:', {
              cardNumber: !!cardNumberRef.current,
              cardExpiry: !!cardExpiryRef.current,
              cardCvv: !!cardCvvRef.current
            });

            if (cardNumberRef.current && cardExpiryRef.current && cardCvvRef.current) {
              console.log('Rendering number field...');
              cardField.NumberField().render(cardNumberRef.current);
              console.log('Rendering expiry field...');
              cardField.ExpiryField().render(cardExpiryRef.current);
              console.log('Rendering CVV field...');
              cardField.CVVField().render(cardCvvRef.current);
              setCardFieldsReady(true);
              console.log('✅ Card fields rendered successfully');
            } else {
              retryCount++;
              if (retryCount < maxRetries) {
                console.log(`Card field refs not ready yet, retrying in 100ms... (attempt ${retryCount}/${maxRetries})`);
                setTimeout(renderCardFields, 100);
              } else {
                console.error('❌ Failed to render card fields: refs never became ready after maximum retries');
                setCardFieldsReady(false);
              }
            }
          } else {
            console.error('❌ Card fields not eligible - Advanced Card Processing may not be enabled for this PayPal account');
            console.log('Attempting to render anyway...');
            // Try to render anyway (sometimes isEligible returns false but fields still work)
            if (cardNumberRef.current && cardExpiryRef.current && cardCvvRef.current) {
              try {
                cardField.NumberField().render(cardNumberRef.current);
                cardField.ExpiryField().render(cardExpiryRef.current);
                cardField.CVVField().render(cardCvvRef.current);
                setCardFieldsReady(true);
                console.log('⚠️ Card fields rendered despite isEligible being false');
              } catch (renderError) {
                console.error('Could not render card fields:', renderError);
                setCardFieldsReady(false);
              }
            } else {
              retryCount++;
              if (retryCount < maxRetries) {
                console.log(`Card field refs not ready, retrying in 100ms... (attempt ${retryCount}/${maxRetries})`);
                setTimeout(renderCardFields, 100);
              } else {
                console.error('❌ Failed to render card fields: refs never became ready after maximum retries');
                setCardFieldsReady(false);
              }
            }
          }
        } catch (error) {
          console.error('Error in card fields rendering block:', error);
          setCardFieldsReady(false);
        }
      };

      // Start rendering process
      renderCardFields();
    };

    initializePayPal();
  }, []);

  const handleCardSubmit = async () => {
    if (!cardholderName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter cardholder name',
        variant: 'destructive',
      });
      return;
    }

    if (!cardFieldInstanceRef.current) {
      toast({
        title: 'Error',
        description: 'Payment form not ready',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      await cardFieldInstanceRef.current.submit({
        cardholderName: cardholderName,
      });
    } catch (error: any) {
      setIsProcessing(false);
      toast({
        title: 'Error',
        description: error.message || 'Card payment failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Card Payment */}
      <div className="border-2 border-slate-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#28a745" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2" fill="none"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
          Pay with Credit or Debit Card
        </h3>
        <p className="text-sm text-slate-600 mb-4">Securely processed by PayPal</p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="cardholder">Cardholder Name</Label>
            <Input
              id="cardholder"
              type="text"
              placeholder="John Doe"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              className="mt-1 h-12 border-2 border-slate-200 px-3"
            />
          </div>

          <div>
            <Label>Card Number</Label>
            <div
              ref={cardNumberRef}
              className="mt-1 border-2 border-slate-200 rounded-md overflow-hidden"
              style={{
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                position: 'relative'
              }}
            ></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Expiration Date</Label>
              <div
                ref={cardExpiryRef}
                className="mt-1 border-2 border-slate-200 rounded-md overflow-hidden"
                style={{
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative'
                }}
              ></div>
            </div>
            <div>
              <Label>CVV</Label>
              <div
                ref={cardCvvRef}
                className="mt-1 border-2 border-slate-200 rounded-md overflow-hidden"
                style={{
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative'
                }}
              ></div>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleCardSubmit}
            disabled={isProcessing || !cardFieldsReady}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
          >
            {isProcessing ? 'Processing...' : !cardFieldsReady ? 'Loading...' : 'Pay Now'}
          </Button>

          <div className="text-center text-sm text-slate-600 space-y-1">
            <p>We accept all major credit cards.</p>
            <p className="flex items-center justify-center gap-1">
              Secure payment <span className="text-lg">🔒</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
