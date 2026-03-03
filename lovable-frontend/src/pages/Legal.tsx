import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Shield } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

const Legal = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;

    const targetId = location.hash.replace("#", "");
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-12 font-quicksand">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-soft p-6 md:p-12">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl text-slate-800 mb-4">Legal Information</h1>
              <p className="text-lg text-slate-600">Terms and Conditions, Refund Policy, Privacy Policy, and Cookie Policy</p>
            </div>

            {/* Terms and Conditions Section */}
            <section id="terms" className="mb-16 scroll-mt-28">
              <h2 className="text-2xl md:text-3xl text-slate-800 mb-4 pb-4 border-b border-gray-200">
                Terms and Conditions
              </h2>
              <p className="text-sm text-slate-600 mb-8">Effective Date: June 27, 2025</p>

              <div className="space-y-6 text-slate-700 leading-relaxed">
                <p>
                  Welcome to {SITE_CONFIG.domain}, a service provided by {SITE_CONFIG.domain} ("{SITE_CONFIG.domain}", "we", or "us"). This document explains the terms under which you may use our online services, including our website and other software provided in connection with our services (collectively, the "Service").
                </p>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">01. Our Contractual Agreement</h3>
                  <p className="mb-3">
                    By accessing or using the Service, or by clicking a button or checking a box marked "Accept" (or something similar), you signify that you have read, understand, and agree to be bound by these Terms of Service (this "Agreement") and our Privacy Policy. This Agreement applies to all visitors, users, and others who access the Service ("Users"). If you do not agree to these terms, you may not access or use our Service.
                  </p>
                  <p className="mb-3">
                    The Service is not intended for individuals under the age of eighteen (18) to use without parent or guardian supervision and approval.
                  </p>
                  <p className="">
                    Arbitration Notice: This Agreement contains a Binding Arbitration and Class Action Waiver clause, which requires you to resolve disputes with us on an individual basis through arbitration and waives your right to a jury trial or to participate in a class action lawsuit.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">02. User Information and Responsibilities</h3>
                  <p>
                    To use our Service, you will be required to provide personal and travel-related information necessary to complete your electronic travel authorization application. You are solely responsible for ensuring that all information you provide to us is accurate, complete, and up-to-date. We will not be liable for any errors, delays, or denials resulting from inaccurate, incomplete, or false information provided by you.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">03. Our Relationship with You</h3>
                  <p>
                    You acknowledge that {SITE_CONFIG.domain} is an independent entity and is not owned, operated, or affiliated with any government or governmental agency. The information and services we provide are for assistance purposes only and do not constitute legal advice. You are establishing a direct customer relationship with us for the purchase of our electronic travel authorization assistance service.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">04. Privacy and Data Security</h3>
                  <p>
                    By using the Service, you consent to the collection and use of your personal information as set forth in our Privacy Policy. While we implement security measures to protect your information, we cannot guarantee that unauthorized third parties will never be able to defeat our security. You acknowledge that you provide your personal information at your own risk. It is your responsibility to secure your own devices and internet connection used to access the Service.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">05. Your Rights and Responsibilities</h3>
                  <p className="mb-3">
                    We grant you a limited, non-exclusive license to use the Service subject to this Agreement. You retain all rights to the personal information you submit to us, subject to the licenses granted herein that allow us to process your application and operate the Service.
                  </p>
                  <p>
                    When you receive a travel document from us, it is your responsibility to immediately verify that all information is correct and complete. You must also ensure your passport is valid for at least six months from the start of your trip.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">06. Rights of {SITE_CONFIG.domain}</h3>
                  <p>
                    By using the Service, you grant {SITE_CONFIG.domain} the right to process, modify, and distribute the data you provide for the sole purpose of operating the Service and fulfilling your requests. All rights, title, and interest in the Service, including our software, branding, and content, are the exclusive property of {SITE_CONFIG.domain} and its licensors. You agree not to copy, modify, or reverse engineer any part of our Service. We also reserve the right to modify, limit, or discontinue the Service at any time.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">07. Prohibited Uses of the Service</h3>
                  <p className="mb-3">You are prohibited from using the Service for any unlawful, fraudulent, or malicious purpose. This includes, but is not limited to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Interfering with the Service's operation or security.</li>
                    <li>Gaining unauthorized access to any system or data.</li>
                    <li>Uploading malicious software or unlawful content.</li>
                    <li>Impersonating any person or entity.</li>
                    <li>Using the Service for any commercial purpose without our consent.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">08. Third-Party Links and Services</h3>
                  <p>
                    The Service may contain links to third-party websites or resources. We are not responsible or liable for the availability, accuracy, or content of such external sites.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">09. Suspension and Termination of Service</h3>
                  <p>
                    You may request to cancel your application in accordance with our Refund Policy. We may suspend or terminate your access to the Service at any time, for any reason, including for violations of this Agreement. Upon termination of your access by us, your right to use the Service will cease. Provisions of this Agreement that by their nature should survive termination shall survive, including disclaimers, liability limitations, and arbitration clauses.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">10. Disclaimers</h3>
                  <p className="uppercase ">
                    THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. TO THE FULLEST EXTENT PERMITTED BY LAW, EXAMPLE.COM DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR RELIABILITY OF THE SERVICE OR THAT IT WILL BE UNINTERRUPTED OR ERROR-FREE.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">11. Limitation of Liability</h3>
                  <p className="uppercase ">
                    TO THE FULLEST EXTENT PERMITTED BY LAW, EXAMPLE.COM SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY TO YOU FOR ANY AND ALL CLAIMS ARISING FROM THE SERVICE IS LIMITED TO U.S. $100.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">12. Indemnification</h3>
                  <p>
                    You agree to defend, indemnify, and hold harmless {SITE_CONFIG.domain} from and against any claims, damages, liabilities, and expenses (including attorneys' fees) arising from your use of the Service or your violation of this Agreement.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">13. Legal Notices and Communication</h3>
                  <p>
                    You consent to receive communications from us electronically (e.g., via email). You agree that all agreements, notices, and other communications we provide to you electronically satisfy any legal requirement that such communications be in writing.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">14. Copyright Policy</h3>
                  <p className="mb-3">
                    We respect intellectual property rights. If you believe your copyright has been infringed upon by our Service, please provide our designated Copyright Agent with a written notice containing all legally required information. Notices should be sent to:
                  </p>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="">Copyright Agent c/o {SITE_CONFIG.domain}</p>
                    <p>Attention: Legal Notice (Copyright Agent)</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">15. Entire Agreement</h3>
                  <p>
                    This Agreement constitutes the entire agreement between you and {SITE_CONFIG.domain} regarding the Service and supersedes all prior agreements.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">16. Binding Arbitration and Class Action Waiver</h3>
                  <p className="mb-3">
                    Any dispute or claim arising out of this Agreement or the Service shall be resolved by binding arbitration on an individual basis, rather than in court. The arbitration will be conducted by the American Arbitration Association ("AAA") under its applicable rules. YOU ARE WAIVING YOUR RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN A CLASS ACTION LAWSUIT. The arbitration shall take place in Newark, Delaware.
                  </p>
                  <p>
                    You may opt-out of this arbitration provision by sending a written notice within 30 days of accepting these terms to: {SITE_CONFIG.domain}, ATTN: Arbitration Opt-Out.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">17. Time Limitation on Claims</h3>
                  <p>
                    You agree that any claim arising out of the Service must be filed within one (1) year after such claim arose; otherwise, the claim is permanently barred.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">18. Governing Law and Severability</h3>
                  <p>
                    This Agreement shall be governed by the laws of the State of Delaware, without regard to its conflict of law provisions. If any provision of this Agreement is found to be unenforceable, the remaining provisions will remain in full force and effect.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">19. General Provisions</h3>
                  <p>
                    This Agreement does not create any agency, partnership, or employment relationship. You may not assign your rights under this Agreement, but we may assign ours without restriction.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">20. Commercial Terms</h3>
                  <div className="space-y-3">
                    <p>
                      Purchases: You may purchase our electronic travel authorization assistance service on a one-time basis. Prices are subject to change but will not affect orders already placed.
                    </p>
                    <p>
                      Payment: We accept various credit/debit cards and other electronic payment methods ("Accepted Payment Method"). You authorize us to charge your Accepted Payment Method for the total amount of your order.
                    </p>
                    <p>
                      Refunds: Please refer to our Refund Policy for details on cancellations and refunds.
                    </p>
                    <p>
                      No Resale: Our services are for your personal use only and may not be resold or distributed for commercial purposes.
                    </p>
                    <p>
                      Taxes: You are responsible for any applicable taxes or governmental fees associated with your purchase.
                    </p>
                    <p>
                      Errors: We reserve the right to correct any errors in pricing or service descriptions and revise your order accordingly or cancel it and provide a refund.
                    </p>
                  </div>
                </div>

              </div>
            </section>

            {/* Cancellation and Refund Policy Section */}
            <section id="refund" className="mb-16 scroll-mt-28">
              <h2 className="text-2xl md:text-3xl  text-slate-800 mb-4 pb-4 border-b border-gray-200">
                Cancellation and Refund Policy
              </h2>
              <p className="text-sm text-slate-600 mb-8">Effective Date: June 27, 2025</p>

              <div className="space-y-6 text-slate-700 leading-relaxed">
                <p>
                  At {SITE_CONFIG.domain}, we are committed to providing a reliable and efficient electronic travel authorization assistance service. We understand that plans can change, and this policy outlines the circumstances under which a refund may be issued for our service fee.
                </p>
                <p>
                  Our refund policy is based on the processing stage of your application at the time of your cancellation request. Refund requests must be made within 30 days of receiving our email confirming successful payment.
                </p>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">1. When You Qualify for a Refund</h3>
                  <p className="mb-3">You are eligible for a refund under the following conditions:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Cancellation Before Delivery:</strong> If you request to cancel your application before your Canada eTA has been delivered, you are eligible for a refund less a cancellation/administration fee of $19.99 USD.
                    </li>
                    <li>
                      <strong>Error by {SITE_CONFIG.domain}:</strong> If your application is rejected due to a direct error made by our team during the data entry or submission process, and we are unable to correct it in a timely manner, you are eligible for a full refund.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">2. When a Refund Cannot Be Issued</h3>
                  <p className="mb-3">We are unable to issue a refund under the following circumstances:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>After Delivery:</strong> Once your Canada eTA has been delivered to you, our service is considered fully rendered and complete. We cannot issue a refund at this stage.
                    </li>
                    <li>
                      <strong>Application Issues due to User Error:</strong> If your application encounters issues due to incorrect, incomplete, or false information provided by you. It is your responsibility to ensure all data submitted is accurate.
                    </li>
                    <li>
                      <strong>Change of Travel Plans:</strong> If you decide to cancel your trip after your Canada eTA has been delivered.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">3. How to Request a Refund</h3>
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
                  <h3 className="text-xl  text-slate-800 mb-3">4. Refund Processing Time</h3>
                  <p>
                    If your refund is approved, it will be issued within 72 hours via the same payment method used for your original purchase. A confirmation email will be sent to you as soon as the refund has been processed.
                  </p>
                  <p className="mt-3">
                    Please allow up to 10 business days for the refunded amount to appear on your bank or credit card statement, as processing times vary depending on your financial institution.
                  </p>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 font-medium">
                    If you have any questions about our Cancellation and Refund Policy, please do not hesitate to contact us.
                  </p>
                </div>

              </div>
            </section>

            {/* Privacy Policy Section */}
            <section id="privacy" className="mb-16 scroll-mt-28">
              <h2 className="text-2xl md:text-3xl  text-slate-800 mb-8 pb-4 border-b border-gray-200">
                Privacy Policy
              </h2>

              <div className="space-y-6 text-slate-700 leading-relaxed">
                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">1. General Information</h3>
                  <p>This Privacy Policy explains how {SITE_CONFIG.domain} ("we", "our", "us") collects, uses, and shares personal data from users ("you") of {SITE_CONFIG.domain} (the "Service"). By using the Service, you agree to the practices described here.</p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">2. Information We Collect</h3>
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
                  <h3 className="text-xl  text-slate-800 mb-3">3. Use of Information</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>To operate and maintain the Service</li>
                    <li>To personalize your experience on the Site</li>
                    <li>To process payments and send related updates</li>
                    <li>To send promotional or marketing messages</li>
                    <li>To analyze activity and improve services</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">4. Sharing of Information</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>With trusted third-party service providers</li>
                    <li>As required by law or regulation</li>
                    <li>To process transactions</li>
                    <li>During business transfers such as mergers or sales</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">5. Cookies & Similar Technologies</h3>
                  <p>We use cookies to improve your browsing experience. You may disable them in your browser, though this may affect functionality.</p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">6. Security</h3>
                  <p>We take reasonable measures to protect your information, but no system is completely secure when transmitting data online.</p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">7. Your Rights</h3>
                  <p>You may request access, updates, or deletion of your personal data by contacting us via the web form.</p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">8. Policy Updates</h3>
                  <p>This Privacy Policy may change from time to time. Updates will be posted here. Please contact us if you have any questions.</p>
                </div>
              </div>
            </section>

            {/* Cookie Policy Section */}
            <section id="cookies" className="mb-8">
              <h2 className="text-2xl md:text-3xl  text-slate-800 mb-8 pb-4 border-b border-gray-200">
                Cookie Policy
              </h2>

              <div className="space-y-6 text-slate-700 leading-relaxed">
                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">1. Use of Cookies</h3>
                  <p>At {SITE_CONFIG.domain}, we use cookies to make your browsing experience smoother and more personalized. By using our Site, you agree to our use of cookies.</p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">2. What are Cookies?</h3>
                  <p>Cookies are small text files stored on your device. They help us recognize your browser and track how you interact with our Site.</p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">3. Types of Cookies We Use</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Essential: Required for the Site to function properly.</li>
                    <li>Performance: Help us measure site usage and improve performance.</li>
                    <li>Functionality: Store your preferences and settings.</li>
                    <li>Advertising: Used by partners to provide relevant ads.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">4. Managing Cookies</h3>
                  <p>You can control or disable cookies in your browser settings. Some features may not work if cookies are disabled.</p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">5. Third-Party Links</h3>
                  <p>We are not responsible for how external websites use cookies. Please check their policies separately.</p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">6. Policy Updates</h3>
                  <p>We may update this Cookie Policy at any time. Changes become effective once published on this page.</p>
                </div>

                <div>
                  <h3 className="text-xl  text-slate-800 mb-3">7. Contact</h3>
                  <p>If you have questions about our Cookie Policy, please reach out through our contact form.</p>
                </div>

                <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium text-center">
                    Your personal data is encrypted and protected with SSL security.
                  </p>
                  <div className="text-center mt-2">
                    <span className="inline-block px-3 py-1 bg-green-600 text-white text-sm  rounded">
                      SSL
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Legal;
