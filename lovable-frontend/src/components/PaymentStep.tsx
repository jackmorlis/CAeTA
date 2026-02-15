import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';
import { loadPayPalSDK } from '@/lib/paypal-loader';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SITE_CONFIG } from '@/config/site';

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
  const cardNameRef = useRef<HTMLDivElement>(null);
  const cardNumberRef = useRef<HTMLDivElement>(null);
  const cardExpiryRef = useRef<HTMLDivElement>(null);
  const cardCvvRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardFieldsReady, setCardFieldsReady] = useState(false);
  const [modalType, setModalType] = useState<'terms' | 'privacy' | 'refund' | null>(null);
  const cardFieldInstanceRef = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    console.log('PaymentStep mounted');

    // Prevent re-initialization
    if (initializedRef.current) {
      console.log('PayPal already initialized, skipping');
      return;
    }

    // Load PayPal SDK dynamically
    const initializePayPal = async () => {
      try {
        console.log('Loading PayPal SDK dynamically...');
        await loadPayPalSDK();

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
              // Authorize payment (hold funds) instead of capturing immediately
              const response = await apiClient.authorizePayPalOrder(data.orderID);

              // Validate authorization status - only accept CREATED or PENDING
              if (response.status !== 'CREATED' && response.status !== 'PENDING') {
                throw new Error('Your payment could not be processed. Please try again or use a different payment method.');
              }

              onSuccess({
                orderId: response.order_id,
                transactionId: response.authorization_id,  // Use authorization_id as transaction reference
                authorizationId: response.authorization_id,
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
              // Authorize payment (hold funds) instead of capturing immediately
              const response = await apiClient.authorizePayPalOrder(data.orderID);
              console.log('✅ Payment authorized successfully:', response);

              // Validate authorization status - only accept CREATED or PENDING
              if (response.status !== 'CREATED' && response.status !== 'PENDING') {
                throw new Error('Your payment could not be processed. Please check your payment details and try again.');
              }

              onSuccess({
                orderId: response.order_id,
                transactionId: response.authorization_id,  // Use authorization_id as transaction reference
                authorizationId: response.authorization_id,
                amount: response.amount || amount,
                paymentMethod: 'card',
                status: response.status,
              });
            } catch (error: any) {
              console.error('❌ Payment authorization failed:', error);
              // Show user-friendly error from backend or fallback message
              const errorMessage = error.response?.data?.detail || error.message || 'Payment could not be completed. Please try again or use a different payment method.';
              setIsProcessing(false);
              onError(errorMessage);
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
              cardName: !!cardNameRef.current,
              cardNumber: !!cardNumberRef.current,
              cardExpiry: !!cardExpiryRef.current,
              cardCvv: !!cardCvvRef.current
            });

            if (cardNameRef.current && cardNumberRef.current && cardExpiryRef.current && cardCvvRef.current) {
              console.log('Rendering name field...');
              cardField.NameField().render(cardNameRef.current);
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
            if (cardNameRef.current && cardNumberRef.current && cardExpiryRef.current && cardCvvRef.current) {
              try {
                cardField.NameField().render(cardNameRef.current);
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
      } catch (error) {
        console.error('❌ Failed to initialize PayPal:', error);
        toast({
          title: 'Payment System Error',
          description: 'Failed to load payment system. Please refresh the page and try again.',
          variant: 'destructive',
        });
      }
    };

    initializePayPal();
  }, [toast]);

  const handleCardSubmit = async () => {
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
      // Submit without cardholderName parameter - it comes from NameField
      await cardFieldInstanceRef.current.submit();
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
    <>
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

        <div className="space-y-4">
          <div>
            <Label>Cardholder Name</Label>
            <div
              ref={cardNameRef}
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

          {/* Payment acknowledgment */}
          <div className="text-center text-sm text-slate-600 mt-4">
            <p>
              By submitting payment I acknowledge that I have<br />
              read and accept the{' '}
              <button
                type="button"
                onClick={() => setModalType('terms')}
                className="text-primary underline hover:text-primary/80"
              >
                Terms of Service
              </button>
              ,{' '}
              <button
                type="button"
                onClick={() => setModalType('privacy')}
                className="text-primary underline hover:text-primary/80"
              >
                Privacy Policy
              </button>
              , and{' '}
              <button
                type="button"
                onClick={() => setModalType('refund')}
                className="text-primary underline hover:text-primary/80"
              >
                Refund Policy
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* Terms Modal */}
    <Dialog open={modalType === 'terms'} onOpenChange={() => setModalType(null)}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Terms of Service</DialogTitle>
          <DialogDescription className="text-sm">
            Please read these terms and conditions carefully before using our service.
          </DialogDescription>
        </DialogHeader>
        <div className="prose prose-sm sm:prose-base max-w-none mt-4">
          <div className="space-y-6 text-sm sm:text-base leading-relaxed">
            <p className="text-xs text-slate-500 mb-4">
              <strong>Effective Date:</strong> June 27, 2025
            </p>
            <p>
              Welcome to {SITE_CONFIG.domain}, a service provided by {SITE_CONFIG.domain} ("{SITE_CONFIG.domain}", "we", or "us"). This document explains the terms under which you may use our online services, including our website and other software provided in connection with our services (collectively, the "Service").
            </p>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">01. Our Contractual Agreement</h3>
              <p className="mb-3">
                By accessing or using the Service, or by clicking a button or checking a box marked "Accept" (or something similar), you signify that you have read, understand, and agree to be bound by these Terms of Service (this "Agreement") and our Privacy Policy. This Agreement applies to all visitors, users, and others who access the Service ("Users"). If you do not agree to these terms, you may not access or use our Service.
              </p>
              <p className="mb-3">
                The Service is not intended for individuals under the age of eighteen (18) to use without parent or guardian supervision and approval.
              </p>
              <p className="font-semibold">
                Arbitration Notice: This Agreement contains a Binding Arbitration and Class Action Waiver clause, which requires you to resolve disputes with us on an individual basis through arbitration and waives your right to a jury trial or to participate in a class action lawsuit.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">02. User Information and Responsibilities</h3>
              <p>
                To use our Service, you will be required to provide personal and travel-related information necessary to complete your digital arrival card application. You are solely responsible for ensuring that all information you provide to us is accurate, complete, and up-to-date. We will not be liable for any errors, delays, or denials resulting from inaccurate, incomplete, or false information provided by you.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">03. Our Relationship with You</h3>
              <p>
                You acknowledge that {SITE_CONFIG.domain} is an independent entity and is not owned, operated, or affiliated with any government or governmental agency. The information and services we provide are for assistance purposes only and do not constitute legal advice. You are establishing a direct customer relationship with us for the purchase of our digital arrival card assistance service.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">04. Privacy and Data Security</h3>
              <p>
                By using the Service, you consent to the collection and use of your personal information as set forth in our Privacy Policy. While we implement security measures to protect your information, we cannot guarantee that unauthorized third parties will never be able to defeat our security. You acknowledge that you provide your personal information at your own risk. It is your responsibility to secure your own devices and internet connection used to access the Service.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">05. Your Rights and Responsibilities</h3>
              <p className="mb-3">
                We grant you a limited, non-exclusive license to use the Service subject to this Agreement. You retain all rights to the personal information you submit to us, subject to the licenses granted herein that allow us to process your application and operate the Service.
              </p>
              <p>
                When you receive a travel document from us, it is your responsibility to immediately verify that all information is correct and complete. You must also ensure your passport is valid for at least six months from the start of your trip.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">06. Rights of {SITE_CONFIG.domain}</h3>
              <p>
                By using the Service, you grant {SITE_CONFIG.domain} the right to process, modify, and distribute the data you provide for the sole purpose of operating the Service and fulfilling your requests. All rights, title, and interest in the Service, including our software, branding, and content, are the exclusive property of {SITE_CONFIG.domain} and its licensors. You agree not to copy, modify, or reverse engineer any part of our Service. We also reserve the right to modify, limit, or discontinue the Service at any time.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">07. Prohibited Uses of the Service</h3>
              <p className="mb-3">You are prohibited from using the Service for any unlawful, fraudulent, or malicious purpose. This includes, but is not limited to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Interfering with the Service's operation or security.</li>
                <li>Gaining unauthorized access to any system or data.</li>
                <li>Uploading malicious software or unlawful content.</li>
                <li>Impersonating any person or entity.</li>
                <li>Using the Service for any commercial purpose without our consent.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">08. Third-Party Links and Services</h3>
              <p>
                The Service may contain links to third-party websites or resources. We are not responsible or liable for the availability, accuracy, or content of such external sites.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">09. Suspension and Termination of Service</h3>
              <p>
                You may request to cancel your application in accordance with our Refund Policy. We may suspend or terminate your access to the Service at any time, for any reason, including for violations of this Agreement. Upon termination of your access by us, your right to use the Service will cease. Provisions of this Agreement that by their nature should survive termination shall survive, including disclaimers, liability limitations, and arbitration clauses.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">10. Disclaimers</h3>
              <p className="uppercase font-semibold text-xs">
                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. TO THE FULLEST EXTENT PERMITTED BY LAW, {SITE_CONFIG.domain.toUpperCase()} DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR RELIABILITY OF THE SERVICE OR THAT IT WILL BE UNINTERRUPTED OR ERROR-FREE.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">11. Limitation of Liability</h3>
              <p className="uppercase font-semibold text-xs">
                TO THE FULLEST EXTENT PERMITTED BY LAW, {SITE_CONFIG.domain.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY TO YOU FOR ANY AND ALL CLAIMS ARISING FROM THE SERVICE IS LIMITED TO U.S. $100.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">12. Indemnification</h3>
              <p>
                You agree to defend, indemnify, and hold harmless {SITE_CONFIG.domain} from and against any claims, damages, liabilities, and expenses (including attorneys' fees) arising from your use of the Service or your violation of this Agreement.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">13. Legal Notices and Communication</h3>
              <p>
                You consent to receive communications from us electronically (e.g., via email). You agree that all agreements, notices, and other communications we provide to you electronically satisfy any legal requirement that such communications be in writing.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">14. Copyright Policy</h3>
              <p className="mb-3">
                We respect intellectual property rights. If you believe your copyright has been infringed upon by our Service, please provide our designated Copyright Agent with a written notice containing all legally required information. Notices should be sent to:
              </p>
              <p className="mt-2">
                Copyright Agent c/o {SITE_CONFIG.domain}<br />
                Attention: Legal Notice (Copyright Agent)
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">15. Entire Agreement</h3>
              <p>
                This Agreement constitutes the entire agreement between you and {SITE_CONFIG.domain} regarding the Service and supersedes all prior agreements.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">16. Binding Arbitration and Class Action Waiver</h3>
              <p className="mb-3">
                Any dispute or claim arising out of this Agreement or the Service shall be resolved by binding arbitration on an individual basis, rather than in court. The arbitration will be conducted by the American Arbitration Association ("AAA") under its applicable rules. <strong>YOU ARE WAIVING YOUR RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN A CLASS ACTION LAWSUIT.</strong> The arbitration shall take place in Newark, Delaware.
              </p>
              <p className="mt-2">
                You may opt-out of this arbitration provision by sending a written notice within 30 days of accepting these terms to: {SITE_CONFIG.domain}, ATTN: Arbitration Opt-Out.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">17. Time Limitation on Claims</h3>
              <p>
                You agree that any claim arising out of the Service must be filed within one (1) year after such claim arose; otherwise, the claim is permanently barred.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">18. Governing Law and Severability</h3>
              <p>
                This Agreement shall be governed by the laws of the State of Delaware, without regard to its conflict of law provisions. If any provision of this Agreement is found to be unenforceable, the remaining provisions will remain in full force and effect.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">19. General Provisions</h3>
              <p>
                This Agreement does not create any agency, partnership, or employment relationship. You may not assign your rights under this Agreement, but we may assign ours without restriction.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">20. Commercial Terms</h3>
              <p><strong>Purchases:</strong> You may purchase our digital arrival card assistance service on a one-time basis. Prices are subject to change but will not affect orders already placed.</p>
              <p><strong>Payment:</strong> We accept various credit/debit cards and other electronic payment methods ("Accepted Payment Method"). You authorize us to charge your Accepted Payment Method for the total amount of your order.</p>
              <p><strong>Refunds:</strong> Please refer to our Refund Policy for details on cancellations and refunds.</p>
              <p><strong>No Resale:</strong> Our services are for your personal use only and may not be resold or distributed for commercial purposes.</p>
              <p><strong>Taxes:</strong> You are responsible for any applicable taxes or governmental fees associated with your purchase.</p>
              <p><strong>Errors:</strong> We reserve the right to correct any errors in pricing or service descriptions and revise your order accordingly or cancel it and provide a refund.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Privacy Policy Modal */}
    <Dialog open={modalType === 'privacy'} onOpenChange={() => setModalType(null)}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Privacy Policy</DialogTitle>
          <DialogDescription className="text-sm">
            How we collect, use, and protect your information.
          </DialogDescription>
        </DialogHeader>
        <div className="prose prose-sm sm:prose-base max-w-none mt-4">
          <div className="space-y-6 text-sm sm:text-base leading-relaxed">
            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">1. General Information</h3>
              <p>This Privacy Policy explains how {SITE_CONFIG.domain} ("we", "our", "us") collects, uses, and shares personal data from users ("you") of {SITE_CONFIG.domain} (the "Service"). By using the Service, you agree to the practices described here.</p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">2. Information We Collect</h3>
              <p className="mb-4">We may collect information you provide directly. This may include:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Contact details: name, email address, phone number</li>
                <li>Account details: username and password</li>
                <li>Billing information: payment method and related data</li>
                <li>Demographics: age, gender, location</li>
                <li>Usage information: browsing activity on our Site</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">3. Use of Information</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>To operate and maintain the Service</li>
                <li>To personalize your experience on the Site</li>
                <li>To process payments and send related updates</li>
                <li>To send promotional or marketing messages</li>
                <li>To analyze activity and improve services</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">4. Sharing of Information</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>With trusted third-party service providers</li>
                <li>As required by law or regulation</li>
                <li>To process transactions</li>
                <li>During business transfers such as mergers or sales</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">5. Cookies & Similar Technologies</h3>
              <p>We use cookies to improve your browsing experience. You may disable them in your browser, though this may affect functionality.</p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">6. Security</h3>
              <p>We take reasonable measures to protect your information, but no system is completely secure when transmitting data online.</p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">7. Your Rights</h3>
              <p>You may request access, updates, or deletion of your personal data by contacting us via the web form.</p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">8. Policy Updates</h3>
              <p>This Privacy Policy may change from time to time. Updates will be posted here. Please contact us if you have any questions.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Refund Policy Modal */}
    <Dialog open={modalType === 'refund'} onOpenChange={() => setModalType(null)}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Cancellation and Refund Policy</DialogTitle>
          <DialogDescription className="text-sm">
            Our cancellation and refund policy.
          </DialogDescription>
        </DialogHeader>
        <div className="prose prose-sm sm:prose-base max-w-none mt-4">
          <div className="space-y-6 text-sm sm:text-base leading-relaxed">
            <p className="text-xs text-slate-500 mb-4">
              <strong>Effective Date:</strong> June 27, 2025
            </p>
            <p>
              At {SITE_CONFIG.domain}, we are committed to providing a reliable and efficient digital arrival card assistance service. We understand that plans can change, and this policy outlines the circumstances under which a refund may be issued for our service fee.
            </p>
            <p className="mt-3">
              Our refund policy is based on the processing stage of your application at the time of your cancellation request. Refund requests must be made within 30 days of receiving our email confirming successful payment.
            </p>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">1. When You Qualify for a Refund</h3>
              <p className="mb-3">You are eligible for a refund under the following conditions:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Cancellation Before Delivery:</strong> If you request to cancel your application before your Curaçao Digital Immigration Card has been delivered, you are eligible for a refund less a cancellation/administration fee of $19.99 USD.
                </li>
                <li>
                  <strong>Error by {SITE_CONFIG.domain}:</strong> If your application is rejected due to a direct error made by our team during the data entry or submission process, and we are unable to correct it in a timely manner, you are eligible for a full refund.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">2. When a Refund Cannot Be Issued</h3>
              <p className="mb-3">We are unable to issue a refund under the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>After Delivery:</strong> Once your Curaçao Digital Immigration Card has been delivered to you, our service is considered fully rendered and complete. We cannot issue a refund at this stage.
                </li>
                <li>
                  <strong>Application Issues due to User Error:</strong> If your application encounters issues due to incorrect, incomplete, or false information provided by you. It is your responsibility to ensure all data submitted is accurate.
                </li>
                <li>
                  <strong>Change of Travel Plans:</strong> If you decide to cancel your trip after your Curaçao Digital Immigration Card has been delivered.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">3. How to Request a Refund</h3>
              <p className="mb-3">To request a refund, please follow these steps:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Contact Us Immediately:</strong> Send an email to our support team at {SITE_CONFIG.supportEmail}.
                </li>
                <li>
                  <strong>Provide Your Details:</strong> In your email, please include your full name, the email address used for the application, and your order reference number.
                </li>
                <li>
                  <strong>State the Reason:</strong> Clearly explain the reason for your refund request.
                </li>
              </ul>
              <p className="mt-3">
                Our team will review your request within 3-5 business days and notify you of the outcome.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mt-6 mb-3">4. Refund Processing Time</h3>
              <p>
                If your refund is approved, it will be issued within 72 hours via the same payment method used for your original purchase. A confirmation email will be sent to you as soon as the refund has been processed.
              </p>
              <p className="mt-3">
                Please allow up to 10 business days for the refunded amount to appear on your bank or credit card statement, as processing times vary depending on your financial institution.
              </p>
            </div>

            <div className="mt-6">
              <p>
                If you have any questions about our Cancellation and Refund Policy, please do not hesitate to contact us.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
