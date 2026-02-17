import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Users, Plane, CreditCard, User, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';
import { SITE_CONFIG } from '@/config/site';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';
import { DateSelectInput } from '@/components/ui/date-select-input';
import { PaymentStep } from '@/components/PaymentStep';
import { loadPayPalSDK } from '@/lib/paypal-loader';
import { travelPurposes, nationalities, countriesOfBirth, genders } from '@/data/formOptions';

// ─── Helpers ────────────────────────────────────────────────────────
const getTodayInCuracao = (): string => {
  const now = new Date();
  const curaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Curacao' }));
  const year = curaTime.getFullYear();
  const month = String(curaTime.getMonth() + 1).padStart(2, '0');
  const day = String(curaTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRedTrackClickId = (): string | null => {
  try {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('rtkclickid-store='));
    if (!cookieValue) return null;
    const clickId = decodeURIComponent(cookieValue.split('=')[1]);
    return clickId || null;
  } catch { return null; }
};

const getDeviceFingerprint = (): Record<string, any> => {
  try {
    const fp: Record<string, any> = {
      user_agent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: navigator.languages ? [...navigator.languages] : [navigator.language],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezone_offset: new Date().getTimezoneOffset(),
      screen_resolution: `${screen.width}x${screen.height}`,
      screen_available: `${screen.availWidth}x${screen.availHeight}`,
      color_depth: screen.colorDepth,
      device_memory: (navigator as any).deviceMemory || null,
      hardware_concurrency: navigator.hardwareConcurrency || null,
      touch_support: navigator.maxTouchPoints > 0,
      cookie_enabled: navigator.cookieEnabled,
      do_not_track: navigator.doNotTrack,
    };
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl && gl instanceof WebGLRenderingContext) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          fp.webgl_vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          fp.webgl_renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch {}
    return fp;
  } catch { return { error: 'Failed to collect fingerprint' }; }
};

// ─── Nationality → Country mapping (for auto-filling Country of Birth) ──
const nationalityToCountry: Record<string, string> = {
  "AFGHAN": "AFGHANISTAN", "ALBANIAN": "ALBANIA", "ALGERIAN": "ALGERIA", "AMERICAN": "UNITED STATES",
  "ANDORRAN": "ANDORRA", "ANGOLAN": "ANGOLA", "ANGUILLAN": "ANGUILLA", "ARGENTINE": "ARGENTINA",
  "ARMENIAN": "ARMENIA", "AUSTRALIAN": "AUSTRALIA", "AUSTRIAN": "AUSTRIA", "AZERBAIJANI": "AZERBAIJAN",
  "BAHAMIAN": "BAHAMAS", "BAHRAINI": "BAHRAIN", "BANGLADESHI": "BANGLADESH", "BARBADIAN": "BARBADOS",
  "BELARUSIAN": "BELARUS", "BELGIAN": "BELGIUM", "BELIZEAN": "BELIZE", "BENINESE": "BENIN",
  "BERMUDIAN": "BERMUDA", "BHUTANESE": "BHUTAN", "BOLIVIAN": "BOLIVIA", "BOTSWANAN": "BOTSWANA",
  "BRAZILIAN": "BRAZIL", "BRITISH": "UNITED KINGDOM", "BRUNEIAN": "BRUNEI", "BULGARIAN": "BULGARIA",
  "BURKINAN": "BURKINA FASO", "BURMESE": "MYANMAR", "BURUNDIAN": "BURUNDI",
  "CAMBODIAN": "CAMBODIA", "CAMEROONIAN": "CAMEROON", "CANADIAN": "CANADA", "CAPE VERDEAN": "CAPE VERDE",
  "CAYMAN ISLANDER": "CAYMAN ISLANDS", "CENTRAL AFRICAN": "CENTRAL AFRICAN REPUBLIC", "CHADIAN": "CHAD",
  "CHILEAN": "CHILE", "CHINESE": "CHINA", "CITIZEN OF ANTIGUA AND BARBUDA": "ANTIGUA AND BARBUDA",
  "CITIZEN OF BOSNIA AND HERZEGOVINA": "BOSNIA-HERZEGOVINA", "CITIZEN OF GUINEA-BISSAU": "GUINEA-BISSAU",
  "CITIZEN OF KIRIBATI": "KIRIBATI", "CITIZEN OF SEYCHELLES": "SEYCHELLES",
  "CITIZEN OF THE DOMINICAN REPUBLIC": "DOMINICAN REPUBLIC", "CITIZEN OF VANUATU": "VANUATU",
  "COLOMBIAN": "COLOMBIA", "COMORAN": "COMOROS", "CONGOLESE": "CONGO", "COOK ISLANDER": "NEW ZEALAND",
  "COSTA RICAN": "COSTA RICA", "CROATIAN": "CROATIA", "CUBAN": "CUBA", "CYPRIOT": "CYPRUS", "CZECH": "CZECH REPUBLIC",
  "DANISH": "DENMARK", "DJIBOUTIAN": "DJIBOUTI", "DOMINICAN": "DOMINICA", "DUTCH": "NETHERLANDS",
  "EAST TIMORESE": "EAST TIMOR", "ECUADOREAN": "ECUADOR", "EGYPTIAN": "EGYPT",
  "EMIRATI": "UNITED ARAB EMIRATES", "EQUATORIAL GUINEAN": "EQUATORIAL GUINEA", "ERITREAN": "ERITREA",
  "ESTONIAN": "ESTONIA", "ETHIOPIAN": "ETHIOPIA",
  "FAROESE": "DENMARK", "FIJIAN": "FIJI", "FILIPINO": "PHILIPPINES", "FINNISH": "FINLAND", "FRENCH": "FRANCE",
  "GABONESE": "GABON", "GAMBIAN": "GAMBIA", "GEORGIAN": "GEORGIA", "GERMAN": "GERMANY", "GHANAIAN": "GHANA",
  "GIBRALTARIAN": "GREAT BRITAIN", "GREEK": "GREECE", "GREENLANDIC": "GREENLAND", "GRENADIAN": "GRENADA",
  "GUAMANIAN": "UNITED STATES", "GUATEMALAN": "GUATEMALA", "GUINEAN": "GUINEA", "GUYANESE": "GUYANA",
  "HAITIAN": "HAITI", "HONDURAN": "HONDURAS", "HONG KONGER": "HONG KONG", "HUNGARIAN": "HUNGARY",
  "ICELANDIC": "ICELAND", "INDIAN": "INDIA", "INDONESIAN": "INDONESIA", "IRANIAN": "IRAN", "IRAQI": "IRAQ",
  "IRISH": "IRELAND", "ISRAELI": "ISRAEL", "ITALIAN": "ITALY", "IVORIAN": "COTE D IVOIRE",
  "JAMAICAN": "JAMAICA", "JAPANESE": "JAPAN", "JORDANIAN": "JORDAN",
  "KAZAKH": "KAZAKHSTAN", "KENYAN": "KENYA", "KITTITIAN": "ST. KITTS", "KOSOVAR": "KOSOVO", "KUWAITI": "KUWAIT", "KYRGYZ": "KYRGYZSTAN",
  "LAO": "LAOS", "LATVIAN": "LATVIA", "LEBANESE": "LEBANON", "LIBERIAN": "LIBERIA", "LIBYAN": "LIBYA",
  "LIECHTENSTEIN CITIZEN": "LIECHTENSTEIN", "LITHUANIAN": "LITHUANIA", "LUXEMBOURGER": "LUXEMBOURG",
  "MACANESE": "MACAU", "MACEDONIAN": "MACEDONIA", "MALAGASY": "MADAGASCAR", "MALAWIAN": "MALAWI",
  "MALAYSIAN": "MALAYSIA", "MALDIVIAN": "MALDIVES", "MALIAN": "MALI", "MALTESE": "MALTA",
  "MARSHALLESE": "MARSHALL ISLANDS", "MARTINIQUAIS": "MARTINIQUE", "MAURITANIAN": "MAURITANIA",
  "MAURITIAN": "MAURITIUS", "MEXICAN": "MEXICO", "MOLDOVAN": "MOLDOVA", "MONEGASQUE": "MONACO",
  "MONGOLIAN": "MONGOLIA", "MONTENEGRIN": "SERBIA AND MONTENEGRO", "MONTSERRATIAN": "MONTSERRAT",
  "MOROCCAN": "MOROCCO", "MOSOTHO": "LESOTHO", "MOZAMBICAN": "MOZAMBIQUE",
  "NAMIBIAN": "NAMIBIA", "NAURUAN": "NAURA", "NEPALESE": "NEPAL", "NETHERLANDS": "NETHERLANDS",
  "NEW ZEALAND": "NEW ZEALAND", "NICARAGUAN": "NICARAGUA", "NIGERIAN": "NIGERIA", "NIGERIEN": "NIGER",
  "NORTH KOREAN": "NORTH KOREA", "NORWEGIAN": "NORWAY",
  "OMANI": "OMAN",
  "PAKISTANI": "PAKISTAN", "PALAUAN": "PALAU", "PALESTINIAN": "PALESTINE", "PANAMANIAN": "PANAMA",
  "PAPUA NEW GUINEAN": "PAPUA", "PARAGUAYAN": "PARAGUAY", "PERUVIAN": "PERU",
  "PITCAIRN ISLANDER": "UNITED KINGDOM", "POLISH": "POLAND", "PORTUGUESE": "PORTUGAL", "PUERTO RICAN": "PUERTO RICO",
  "QATARI": "QATAR",
  "ROMANIAN": "ROMANIA", "RUSSIAN": "RUSSIA", "RWANDAN": "RWANDA",
  "SALVADOREAN": "EL SALVADOR", "SAMMARINESE": "SAN MARINO", "SAMOAN": "SAMOA",
  "SAO TOMEAN": "SAO TOME AND PRINCIPE", "SAUDI ARABIAN": "SAUDI ARABIA", "SENEGALESE": "SENEGAL",
  "SERBIAN": "SERBIA AND MONTENEGRO", "SIERRA LEONEAN": "SIERRA LEONE", "SINGAPOREAN": "SINGAPORE",
  "SLOVAK": "SLOVAKIA", "SLOVENIAN": "SLOVENIA", "SOLOMON ISLANDER": "SOLOMON ISLANDS", "SOMALI": "SOMALIA",
  "SOUTH AFRICAN": "SOUTH AFRICA", "SOUTH KOREAN": "SOUTH KOREA", "SOUTH SUDANESE": "SUDAN",
  "SPANISH": "SPAIN", "SRI LANKAN": "SRI LANKA", "ST LUCIAN": "ST. LUCIA", "SUDANESE": "SUDAN",
  "SURINAMESE": "SURINAM", "SWAZI": "SWAZILAND", "SWEDISH": "SWEDEN", "SWISS": "SWITZERLAND", "SYRIAN": "SYRIA",
  "TAIWANESE": "TAIWAN", "TAJIK": "TAJIKISTAN", "TANZANIAN": "TANZANIA", "THAI": "THAILAND",
  "TOGOLESE": "TOGO", "TONGAN": "TONGA", "TRINIDADIAN": "TRINIDAD AND TOBAGO", "TUNISIAN": "TUNESIA",
  "TURKISH": "TURKEY", "TURKMEN": "TURKMENISTAN", "TURKS AND CAICOS ISLANDER": "TURKS AND CAICOS ISLANDS",
  "TUVALUAN": "TUVALU",
  "UGANDAN": "UGANDA", "UKRAINIAN": "UKRAINE", "UNITED STATES": "UNITED STATES", "URUGUAYAN": "URUGUAY", "UZBEK": "UZBEKISTAN",
  "VENEZUELAN": "VENEZUELA", "VIETNAMESE": "VIETNAM", "VINCENTIAN": "ST. VINCENT AND GRENADINES",
  "WALLISIAN": "FRANCE",
  "YEMENI": "YEMEN",
  "ZAMBIAN": "ZAMBIA", "ZIMBABWEAN": "ZIMBABWE",
};

// ─── Top nationalities / countries (pinned at top of dropdowns) ─────
const TOP_NATIONALITIES = ["AMERICAN", "DUTCH", "CANADIAN", "COLOMBIAN", "BRAZILIAN"];
const TOP_COUNTRIES = ["UNITED STATES", "NETHERLANDS", "CANADA", "COLOMBIA", "BRAZIL"];

const sortedNationalities = [
  ...TOP_NATIONALITIES,
  ...nationalities.filter(n => !TOP_NATIONALITIES.includes(n)),
];
const sortedCountries = [
  ...TOP_COUNTRIES,
  ...countriesOfBirth.filter(c => !TOP_COUNTRIES.includes(c)),
];

// ─── Schema ─────────────────────────────────────────────────────────
// Traveler fields validated per-step manually so earlier steps don't
// block on fields that appear in later steps.
const travelerSchema = z.object({
  // Step 2 — Traveler / Passport
  firstName: z.string().optional().default(""),
  lastName: z.string().optional().default(""),
  gender: z.string().optional().default(""),
  birthDate: z.string().optional().default(""),
  passport: z.string().optional().default(""),
  passportExpiry: z.string().optional().default(""),
  nationality: z.string().optional().default(""),
  // Step 3 — Contact & Confirm
  city: z.string().optional().default(""),
  stateProvince: z.string().optional().default(""),
  countryOfResidence: z.string().optional().default(""),
  countryOfBirth: z.string().optional().default(""),
  email: z.string().optional().default(""),
  confirmEmail: z.string().optional().default(""),
});

const formSchema = z.object({
  travelers: z.array(travelerSchema).min(1).max(5),
  // Step 1 — Trip Details
  arrivalDate: z.string().min(1, "Arrival date is required").refine((val) => {
    if (!val) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(val + "T00:00:00") >= today;
  }, { message: "Arrival date cannot be in the past" }),
  departureDate: z.string().min(1, "Departure date is required"),
  carrierName: z.string().min(1, "Carrier name is required"),
  flightNumber: z.string().min(1, "Flight number is required"),
  placeOfStay: z.string().min(1, "Place of stay is required"),
  travelPurpose: z.string().min(1, "Purpose of visit is required"),
  // Step 3 — Contact & Confirm (non-traveler fields)
  portOfEmbarkation: z.string().optional().default(""),
  marketingOptIn: z.boolean().optional(),
  certificationOfTruth: z.boolean().optional(),
  dataProcessingAuth: z.boolean().optional(),
  termsAccepted: z.boolean().optional(),
  termsSignature: z.string().optional().default(""),
  // Payment
  processingOption: z.enum(["fast", "ultra"]).optional(),
}).superRefine((data, ctx) => {
  if (data.arrivalDate && data.departureDate) {
    const arrival = new Date(data.arrivalDate + "T00:00:00");
    const departure = new Date(data.departureDate + "T00:00:00");
    if (departure < arrival) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Departure date cannot be before arrival date",
        path: ["departureDate"],
      });
    }
  }
});

type FormData = z.infer<typeof formSchema>;

// ─── Component ──────────────────────────────────────────────────────
const Apply = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { getRedTrackClickId(); }, []);
  useEffect(() => { loadPayPalSDK().catch(() => {}); }, []);

  const changeStep = (step: number) => {
    setCurrentStep(step);
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      travelers: [{
        firstName: "", lastName: "", gender: "", birthDate: "",
        passport: "", passportExpiry: "", nationality: "",
        city: "", stateProvince: "", countryOfResidence: "",
        countryOfBirth: "", email: "", confirmEmail: "",
      }],
      arrivalDate: undefined, departureDate: undefined,
      carrierName: "", flightNumber: "",
      placeOfStay: "", travelPurpose: "",
      portOfEmbarkation: "",
      marketingOptIn: true, certificationOfTruth: true,
      dataProcessingAuth: true, termsAccepted: false,
      termsSignature: "",
      processingOption: undefined,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control, name: "travelers"
  });

  // ─── Payment success ──────────────────────────────────────────────
  const handlePaymentSuccess = async (paymentData: {
    orderId: string; transactionId: string; authorizationId?: string;
    amount: string; paymentMethod: 'paypal' | 'card'; status: string;
  }) => {
    setIsSubmitting(true);
    try {
      const data = form.getValues();
      if (!data.travelers || data.travelers.length === 0) {
        throw new Error('Please fill out traveler information before payment');
      }
      const travelers = data.travelers.map((t, i) => {
        if (!t.birthDate) throw new Error(`Traveler ${i + 1}: Missing birth date`);
        return {
          first_name: t.firstName, last_name: t.lastName,
          date_of_birth: t.birthDate, gender: t.gender,
          nationality: t.nationality, passport_number: t.passport,
          passport_expiry_date: t.passportExpiry, place_of_birth: t.countryOfBirth,
          email: i === 0 ? t.email : undefined,
          country_of_residence: t.countryOfResidence,
          state_province: t.stateProvince, city: t.city,
        };
      });
      const isAuth = paymentData.status === 'CREATED' || paymentData.authorizationId;
      const internalStatus = isAuth ? 'authorized' : (paymentData.status === 'COMPLETED' ? 'completed' : 'pending');
      const response = await apiClient.createApplication({
        country_of_residence: data.travelers[0]?.countryOfResidence,
        city_of_residence: data.travelers[0]?.city,
        state_province: data.travelers[0]?.stateProvince,
        embarkation_port: data.portOfEmbarkation,
        airline_name: data.carrierName,
        flight_number: data.flightNumber,
        travel_purpose: data.travelPurpose,
        arrival_date: data.arrivalDate,
        departure_date: data.departureDate,
        accommodation_details: data.placeOfStay,
        processing_option: data.processingOption || "standard",
        travelers,
        payment_method: paymentData.paymentMethod,
        payment_status: internalStatus,
        payment_transaction_id: paymentData.transactionId,
        payment_order_id: paymentData.orderId,
        amount_paid: parseFloat(paymentData.amount),
        redtrack_click_id: getRedTrackClickId() || undefined,
        device_fingerprint: getDeviceFingerprint(),
        authorization_id: paymentData.authorizationId || undefined,
        authorization_status: paymentData.authorizationId ? paymentData.status : undefined,
      });
      sessionStorage.setItem('application_session_id', response.session_id);
      toast({ title: "Application submitted successfully!", description: `Reference: ${response.session_id}` });
      navigate('/payment-success');
    } catch (error: any) {
      console.error('Application submission error:', error);
      let msg = "Failed to submit application. Please try again.";
      if (error.message) msg = error.message;
      else if (typeof error === 'string') msg = error;
      else if (error.detail) {
        msg = Array.isArray(error.detail)
          ? error.detail.map((e: any) => `${e.loc?.join('.') || 'Field'}: ${e.msg}`).join(', ')
          : error.detail;
      }
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const handlePaymentError = (error: string) => {
    toast({ title: "Payment Error", description: error, variant: "destructive" });
  };

  const addTraveler = () => {
    if (fields.length < 5) {
      const first = form.getValues('travelers.0');
      append({
        firstName: "", lastName: "", gender: "", birthDate: "",
        passport: "", passportExpiry: "",
        nationality: first?.nationality || "",
        city: "", stateProvince: "",
        countryOfResidence: first?.countryOfResidence || "",
        countryOfBirth: first?.countryOfBirth || "", email: "", confirmEmail: "",
      });
    }
  };

  const removeTraveler = (index: number) => {
    if (fields.length > 1) remove(index);
  };

  // ─── Step definitions ─────────────────────────────────────────────
  const steps = [
    { number: 1, title: "Traveler Info", icon: Users, active: currentStep === 1 },
    { number: 2, title: "Trip Details", icon: Plane, active: currentStep === 2 },
    { number: 3, title: "Contact & Confirm", icon: CheckCircle, active: currentStep === 3 },
    { number: 4, title: "Payment", icon: CreditCard, active: currentStep === 4 || currentStep === 5 },
  ];

  // ─── Validation helpers ───────────────────────────────────────────
  const validateTripDetails = async (): Promise<boolean> => {
    const triggered = await form.trigger([
      "arrivalDate", "departureDate", "carrierName",
      "flightNumber", "placeOfStay", "travelPurpose"
    ]);
    let valid = triggered;
    if (!form.getValues('portOfEmbarkation')?.trim()) {
      form.setError('portOfEmbarkation', { type: 'manual', message: 'Departing from is required' });
      valid = false;
    }
    return valid;
  };

  const validateTravelerInfo = (): boolean => {
    const travelers = form.getValues("travelers");
    let valid = true;
    travelers.forEach((t, i) => {
      const prefix = `travelers.${i}` as const;
      if (!t.firstName?.trim()) { form.setError(`${prefix}.firstName` as any, { type: 'manual', message: 'First name is required' }); valid = false; }
      if (!t.lastName?.trim()) { form.setError(`${prefix}.lastName` as any, { type: 'manual', message: 'Last name is required' }); valid = false; }
      if (!t.gender || (t.gender !== 'male' && t.gender !== 'female')) { form.setError(`${prefix}.gender` as any, { type: 'manual', message: 'Gender is required' }); valid = false; }
      if (!t.birthDate?.trim()) { form.setError(`${prefix}.birthDate` as any, { type: 'manual', message: 'Date of birth is required' }); valid = false; }
      if (!t.passport?.trim()) { form.setError(`${prefix}.passport` as any, { type: 'manual', message: 'Passport number is required' }); valid = false; }
      if (!t.passportExpiry?.trim()) { form.setError(`${prefix}.passportExpiry` as any, { type: 'manual', message: 'Expiration date is required' }); valid = false; }
      if (!t.nationality?.trim()) { form.setError(`${prefix}.nationality` as any, { type: 'manual', message: 'Nationality is required' }); valid = false; }
      if (!t.countryOfBirth?.trim()) { form.setError(`${prefix}.countryOfBirth` as any, { type: 'manual', message: 'Country of birth is required' }); valid = false; }
    });
    return valid;
  };

  const validateContactConfirm = (): boolean => {
    const travelers = form.getValues("travelers");
    let valid = true;

    // Validate personal fields for all travelers
    travelers.forEach((t, i) => {
      const prefix = `travelers.${i}` as const;
      if (!t.countryOfResidence?.trim()) { form.setError(`${prefix}.countryOfResidence` as any, { type: 'manual', message: 'Country of residence is required' }); valid = false; }
      if (!t.city?.trim()) { form.setError(`${prefix}.city` as any, { type: 'manual', message: 'City is required' }); valid = false; }
      if (!t.stateProvince?.trim()) { form.setError(`${prefix}.stateProvince` as any, { type: 'manual', message: 'State / Province is required' }); valid = false; }
    });

    // Email only for first traveler
    const first = travelers[0];
    if (first) {
      if (!first.email?.trim()) { form.setError('travelers.0.email', { type: 'manual', message: 'Email is required' }); valid = false; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(first.email)) { form.setError('travelers.0.email', { type: 'manual', message: 'Invalid email address' }); valid = false; }
      if (first.email !== first.confirmEmail) { form.setError('travelers.0.confirmEmail', { type: 'manual', message: "Emails don't match" }); valid = false; }
    }

    // Consent
    if (!form.getValues('certificationOfTruth')) {
      form.setError('certificationOfTruth', { type: 'manual', message: 'You must certify that the information is true' });
      valid = false;
    }
    if (!form.getValues('dataProcessingAuth')) {
      form.setError('dataProcessingAuth', { type: 'manual', message: 'You must authorize data processing' });
      valid = false;
    }
    if (!form.getValues('termsAccepted')) {
      form.setError('termsAccepted', { type: 'manual', message: 'You must accept the terms and conditions' });
      valid = false;
    }
    if (form.getValues('termsAccepted') && !form.getValues('termsSignature')?.trim()) {
      form.setError('termsSignature', { type: 'manual', message: 'Please type your full name to sign' });
      valid = false;
    }

    return valid;
  };

  // ─── Render ───────────────────────────────────────────────────────
  return <div className="min-h-screen bg-background">
      <Header disableLinks />

      <main className="py-8 font-quicksand">
        <div className="container mx-auto px-3 sm:px-4 max-w-6xl w-full">

          {/* Mobile Title */}
          <div className="lg:hidden mb-6">
            <h1 className="text-2xl font-bold text-slate-800">
              {currentStep === 1 && "Traveler Information"}
              {currentStep === 2 && "Trip Details"}
              {currentStep === 3 && "Contact & Confirm"}
              {(currentStep === 4 || currentStep === 5) && "Payment"}
            </h1>
          </div>

          <div className="grid lg:grid-cols-5 gap-6 w-full overflow-x-hidden">

            {/* ─── Desktop Stepper ─── */}
            {currentStep <= 5 && <div className="hidden lg:block lg:col-span-1 min-w-0">
              <div className="sticky top-8 space-y-6 bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-2xl font-bold text-slate-800 mb-8">Application</h2>
                <div className="relative">
                  {steps.map((step, index) => <div key={step.number} className="relative flex items-center mb-8 last:mb-0">
                    {index < steps.length - 1 && <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />}
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold z-10 mr-4 flex-shrink-0",
                      step.active ? "bg-primary text-white" : currentStep > step.number ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                    )}>
                      {currentStep > step.number ? "✓" : step.number}
                    </div>
                    <span className={cn(
                      "text-lg font-medium",
                      step.active ? "text-primary" : currentStep > step.number ? "text-green-700" : "text-gray-600"
                    )}>
                      {step.title}
                    </span>
                  </div>)}
                </div>
              </div>
            </div>}

            {/* ─── Tablet Stepper ─── */}
            {currentStep <= 5 && <div className="hidden md:block lg:hidden col-span-full mb-6 sticky top-0 z-10 bg-background">
              <div className="flex justify-between items-center bg-white rounded-lg shadow-sm p-6">
                {steps.map((step, index) => <div key={step.number} className="flex items-center">
                  <div className="flex items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                      step.active ? "bg-primary text-white" : currentStep > step.number ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                    )}>
                      {currentStep > step.number ? "✓" : step.number}
                    </div>
                    <span className={cn("ml-3 font-medium", step.active ? "text-primary" : currentStep > step.number ? "text-green-700" : "text-gray-600")}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && <div className={cn("w-16 h-0.5 mx-4", currentStep > step.number ? "bg-green-500" : "bg-gray-300")} />}
                </div>)}
              </div>
            </div>}

            {/* ─── Mobile Progress Bar ─── */}
            <div className="md:hidden col-span-full mb-2">
              <div className="flex gap-1.5">
                {steps.map(step => (
                  <div key={step.number} className={cn(
                    "h-1.5 rounded-full flex-1 transition-colors",
                    currentStep >= step.number ? "bg-primary" : "bg-gray-200"
                  )} />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Step {Math.min(currentStep, 4)} of 4</p>
            </div>

            {/* ─── Main Form Content ─── */}
            <div className={cn(currentStep <= 5 ? "lg:col-span-4" : "lg:col-span-5", "min-w-0 w-full")}>
              <div className="bg-white rounded-lg shadow-soft p-6 md:p-8 overflow-x-hidden">

                {/* ════════════════════════════════════════════════ */}
                {/* STEP 2 — Trip Details                           */}
                {/* ════════════════════════════════════════════════ */}
                {currentStep === 2 && <Form {...form}>
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                        <Plane className="h-6 w-6" />
                        Trip Details
                      </h2>
                      <p className="text-slate-600 mb-8">Tell us about your upcoming trip to Curaçao</p>
                    </div>

                    {/* Arrival Date + Departing From */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="arrivalDate" render={({ field }) =>
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Arrival Date <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <DateSelectInput date={field.value} onDateChange={field.onChange} minDate={new Date().toISOString().split('T')[0]} maxDate="2027-12-31" defaultYear={new Date().getFullYear()} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />

                      <FormField control={form.control} name="portOfEmbarkation" render={({ field }) =>
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Departing From <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Amsterdam, Miami" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                          </FormControl>
                          <p className="text-sm text-slate-500">City where you board your flight to Curaçao</p>
                          <FormMessage />
                        </FormItem>} />
                    </div>

                    {/* Arrival Flight Number + Airline / Carrier */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="flightNumber" render={({ field }) =>
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Arrival Flight Number <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., KL747" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />

                      <FormField control={form.control} name="carrierName" render={({ field }) =>
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Airline / Carrier <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., KLM, American Airlines" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    </div>

                    {/* Departure Date + Purpose of Visit */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="departureDate" render={({ field }) =>
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Departure Date <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <DateSelectInput date={field.value} onDateChange={field.onChange} minDate={form.getValues("arrivalDate") || new Date().toISOString().split('T')[0]} maxDate="2027-12-31" defaultYear={new Date().getFullYear()} />
                          </FormControl>
                          <p className="text-sm text-slate-500">When you're leaving Curaçao</p>
                          <FormMessage />
                        </FormItem>} />

                      <FormField control={form.control} name="travelPurpose" render={({ field }) =>
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Purpose of Visit <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary">
                                <SelectValue placeholder="Select purpose of visit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {travelPurposes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>} />
                    </div>

                    {/* Where Are You Staying? */}
                    <FormField control={form.control} name="placeOfStay" render={({ field }) =>
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                          Where Are You Staying? <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Marriott Beach Resort, Airbnb Full Address" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                    {/* Navigation */}
                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => changeStep(1)}>← Back</Button>
                      <Button type="button" onClick={async () => {
                        if (await validateTripDetails()) { changeStep(3); }
                        else { toast({ title: "Please complete all fields", description: "Fill in all required trip details to continue.", variant: "destructive" }); }
                      }} className="px-8 py-3 text-base">
                        Continue →
                      </Button>
                    </div>
                  </div>
                </Form>}


                {/* ════════════════════════════════════════════════ */}
                {/* STEP 1 — Traveler Information                   */}
                {/* Passport details per traveler                   */}
                {/* ════════════════════════════════════════════════ */}
                {currentStep === 1 && <Form {...form}>
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                        <Users className="h-6 w-6" />
                        Traveler Information
                      </h2>
                      <p className="text-slate-600 mb-8">Enter details exactly as they appear on your passport</p>
                    </div>

                    {fields.map((field, index) => <div key={field.id} className="border border-gray-200 rounded-lg p-6 space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Traveler {index + 1}
                        </h3>
                        {fields.length > 1 && <Button type="button" variant="outline" size="sm" onClick={() => removeTraveler(index)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>}
                      </div>

                      {/* First Name / Last Name */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name={`travelers.${index}.firstName`} render={({ field }) =>
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              First Name <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="As on passport" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />

                        <FormField control={form.control} name={`travelers.${index}.lastName`} render={({ field }) =>
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Last Name <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="As on passport" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                      </div>

                      {/* Gender / Date of Birth */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name={`travelers.${index}.gender`} render={({ field }) =>
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Gender <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-6 pt-2">
                                {genders.map(g => <div key={g.value} className="flex items-center space-x-2">
                                  <RadioGroupItem value={g.value} id={`${g.value}-${index}`} />
                                  <Label htmlFor={`${g.value}-${index}`} className="font-medium">{g.label}</Label>
                                </div>)}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />

                        <FormField control={form.control} name={`travelers.${index}.birthDate`} render={({ field }) =>
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Date of Birth <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <DateSelectInput date={field.value} onDateChange={field.onChange} maxDate={getTodayInCuracao()} minDate="1900-01-01" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                      </div>

                      {/* Passport / Expiry */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name={`travelers.${index}.passport`} render={({ field }) =>
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Passport Number <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Passport number" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />

                        <FormField control={form.control} name={`travelers.${index}.passportExpiry`} render={({ field }) =>
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Expiration Date <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <DateSelectInput date={field.value} onDateChange={field.onChange} minDate={getTodayInCuracao()} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                      </div>

                      {/* Nationality / Country of Birth */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name={`travelers.${index}.nationality`} render={({ field }) =>
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Nationality <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select onValueChange={(val) => {
                              field.onChange(val);
                              const country = nationalityToCountry[val];
                              if (country) {
                                form.setValue(`travelers.${index}.countryOfBirth`, country);
                                form.setValue(`travelers.${index}.countryOfResidence`, country);
                              }
                            }} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary">
                                  <SelectValue placeholder="Select nationality" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-64">
                                {sortedNationalities.map((n, i) => (
                                  <React.Fragment key={n}>
                                    {i === TOP_NATIONALITIES.length && <SelectSeparator />}
                                    <SelectItem value={n}>{n}</SelectItem>
                                  </React.Fragment>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>} />

                        <FormField control={form.control} name={`travelers.${index}.countryOfBirth`} render={({ field }) =>
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Country of Birth <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary">
                                  <SelectValue placeholder="Select country of birth" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-64">
                                {sortedCountries.map((c, i) => (
                                  <React.Fragment key={c}>
                                    {i === TOP_COUNTRIES.length && <SelectSeparator />}
                                    <SelectItem value={c}>{c}</SelectItem>
                                  </React.Fragment>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>} />
                      </div>
                    </div>)}

                    {/* Add Traveler */}
                    {fields.length < 5 && <div className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all">
                      <Button type="button" variant="default" onClick={addTraveler} className="flex items-center gap-2 bg-primary hover:bg-primary/90" size="lg">
                        <Plus className="h-5 w-5" />
                        Add Another Traveler
                      </Button>
                      <p className="text-sm text-slate-600">Up to 5 travelers ({fields.length}/5)</p>
                    </div>}

                    {/* Next */}
                    <div className="flex justify-end">
                      <Button type="button" onClick={() => {
                        if (validateTravelerInfo()) { changeStep(2); }
                        else { toast({ title: "Please complete all fields", description: "Fill in all required traveler details to continue.", variant: "destructive" }); }
                      }} className="px-8 py-3 text-base">
                        Continue →
                      </Button>
                    </div>
                  </div>
                </Form>}


                {/* ════════════════════════════════════════════════ */}
                {/* STEP 3 — Contact & Confirm                     */}
                {/* Residence, email, extras, consent — finish line */}
                {/* ════════════════════════════════════════════════ */}
                {currentStep === 3 && <Form {...form}>
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                        <CheckCircle className="h-6 w-6" />
                        Contact & Confirm
                      </h2>
                      <p className="text-slate-600 mb-8">Almost done! Just a few more details.</p>
                    </div>

                    {/* Per-traveler: residence + birth country */}
                    {fields.map((field, index) => <div key={field.id} className="border border-gray-200 rounded-lg p-6 space-y-6">
                      <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {form.getValues(`travelers.${index}.firstName`) || 'Traveler'} {form.getValues(`travelers.${index}.lastName`) || (index + 1).toString()}
                      </h3>

                      {/* Country of Residence / City */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name={`travelers.${index}.countryOfResidence`} render={({ field }) =>
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Country of Residence <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary">
                                  <SelectValue placeholder="Select country of residence" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-64">
                                {sortedCountries.map((c, i) => (
                                  <React.Fragment key={c}>
                                    {i === TOP_COUNTRIES.length && <SelectSeparator />}
                                    <SelectItem value={c}>{c}</SelectItem>
                                  </React.Fragment>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>} />

                        <FormField control={form.control} name={`travelers.${index}.city`} render={({ field }) =>
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              City of Residence <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., New York" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                      </div>

                      {/* State/Province */}
                      <FormField control={form.control} name={`travelers.${index}.stateProvince`} render={({ field }) =>
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            State / Province <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., New York" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />

                      {/* Email (first traveler only) */}
                      {index === 0 && <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name={`travelers.${index}.email`} render={({ field }) =>
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Email Address <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="your@email.com" type="email" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <p className="text-sm text-slate-500">Your immigration card will be sent here</p>
                            <FormMessage />
                          </FormItem>} />

                        <FormField control={form.control} name={`travelers.${index}.confirmEmail`} render={({ field }) =>
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Confirm Email <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Confirm your email" type="email" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary"
                                onBlur={() => {
                                  const email = form.getValues(`travelers.${index}.email`);
                                  if (field.value !== email) form.setError(`travelers.${index}.confirmEmail`, { type: 'manual', message: "Emails don't match" });
                                  else form.clearErrors(`travelers.${index}.confirmEmail`);
                                  field.onBlur();
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                      </div>}
                    </div>)}

                    {/* ── Consent & Declarations ── */}
                    <div className="border-t pt-6 space-y-3">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Declarations</h3>

                      <FormField control={form.control} name="marketingOptIn" render={({ field }) =>
                        <FormItem
                          className="flex flex-row items-start space-x-4 space-y-0 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => field.onChange(!field.value)}
                        >
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-5 w-5 mt-0.5" />
                          </FormControl>
                          <FormLabel className="text-base cursor-pointer">
                            I would like to receive travel information about Curaçao.
                          </FormLabel>
                        </FormItem>} />

                      <FormField control={form.control} name="certificationOfTruth" render={({ field }) =>
                        <FormItem
                          className="flex flex-row items-start space-x-4 space-y-0 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => field.onChange(!field.value)}
                        >
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-5 w-5 mt-0.5" />
                          </FormControl>
                          <div className="space-y-1 leading-normal">
                            <FormLabel className="text-base font-bold cursor-pointer">
                              I certify that the information provided is true and correct. I understand that false information may result in refusal of entry or deportation from Curaçao. <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>} />

                      <FormField control={form.control} name="dataProcessingAuth" render={({ field }) =>
                        <FormItem
                          className="flex flex-row items-start space-x-4 space-y-0 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => field.onChange(!field.value)}
                        >
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-5 w-5 mt-0.5" />
                          </FormControl>
                          <div className="space-y-1 leading-normal">
                            <FormLabel className="text-base font-bold cursor-pointer">
                              I authorize the processing of my personal data in compliance with Curaçao Law, article 25 of the Ordinance for data protection. <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>} />

                      <FormField control={form.control} name="termsAccepted" render={({ field }) =>
                        <FormItem
                          className="flex flex-row items-start space-x-4 space-y-0 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={(e) => {
                            // Don't toggle when clicking the Terms link
                            if ((e.target as HTMLElement).closest('button')) return;
                            field.onChange(!field.value);
                          }}
                        >
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-5 w-5 mt-0.5" />
                          </FormControl>
                          <div className="space-y-1 leading-normal">
                            <FormLabel className="text-base font-bold cursor-pointer">
                              I accept the{' '}
                              <button type="button" onClick={() => setTermsModalOpen(true)} className="text-primary underline hover:text-primary/80">
                                Terms and Conditions
                              </button>
                              {' '}<span className="text-red-500">*</span>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>} />

                      {form.watch('termsAccepted') && (
                        <FormField control={form.control} name="termsSignature" render={({ field }) =>
                          <FormItem className="ml-6 space-y-2">
                            <FormLabel className="text-sm font-bold text-slate-800">
                              Please type your full name to sign <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Type your full name"
                                {...field}
                                className="h-10 border-2 border-gray-200 hover:border-primary focus:border-primary max-w-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                      )}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => changeStep(2)}>← Back</Button>
                      <Button type="button" onClick={() => {
                        if (validateContactConfirm()) { changeStep(4); }
                        else { toast({ title: "Almost there!", description: "Please complete all fields and accept the required declarations.", variant: "destructive" }); }
                      }} className="px-8 py-3 text-base">
                        Continue to Payment →
                      </Button>
                    </div>
                  </div>
                </Form>}


                {/* ════════════════════════════════════════════════ */}
                {/* STEP 4 — Pricing                               */}
                {/* ════════════════════════════════════════════════ */}
                {currentStep === 4 && <Form {...form}>
                  <div className="space-y-6">
                    <div className="text-center border-b pb-4">
                      <p className="text-sm text-slate-600">
                        This document has a cost of <span className="font-semibold text-slate-800">$49.99 per traveler</span> — Estimated delivery: <span className="font-semibold">less than 24 hours</span>
                      </p>
                    </div>

                    <div className="space-y-4">
                      <FormField control={form.control} name="processingOption" render={({ field }) =>
                        <FormItem className="space-y-4">
                          <div className="space-y-3">
                            <div className={cn("border rounded-lg p-4 bg-white cursor-pointer hover:border-primary transition-colors", field.value === "fast" && "border-primary bg-primary/5")}
                              onClick={() => field.onChange(field.value === "fast" ? undefined : "fast")}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <FormControl><Checkbox checked={field.value === "fast"} onCheckedChange={(c) => field.onChange(c ? "fast" : undefined)} /></FormControl>
                                  <div>
                                    <FormLabel className="font-medium cursor-pointer">Fast Processing</FormLabel>
                                    <p className="text-xs text-slate-400">Ready in less than 4 hours</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-lg text-primary">+ $20.00</div>
                                </div>
                              </div>
                            </div>

                            <div className={cn("border rounded-lg p-4 bg-white cursor-pointer hover:border-primary transition-colors", field.value === "ultra" && "border-primary bg-primary/5")}
                              onClick={() => field.onChange(field.value === "ultra" ? undefined : "ultra")}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <FormControl><Checkbox checked={field.value === "ultra"} onCheckedChange={(c) => field.onChange(c ? "ultra" : undefined)} /></FormControl>
                                  <div>
                                    <FormLabel className="font-medium cursor-pointer">Ultra Premium</FormLabel>
                                    <p className="text-xs text-slate-600">Ready in less than 1 hour</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-lg text-primary">+ $50.00</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>} />
                    </div>

                    <div className="pt-4">
                      <Button type="button" variant="outline" onClick={() => changeStep(3)} className="w-full md:w-auto">← Back</Button>
                    </div>

                    <div className="border-t pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="text-sm text-slate-600">*Price is multiplied by the number of travelers</div>
                      <Button type="button" onClick={() => changeStep(5)} className="px-12 py-6 text-lg font-semibold w-full md:w-auto">
                        Proceed to Payment
                      </Button>
                    </div>
                  </div>
                </Form>}


                {/* ════════════════════════════════════════════════ */}
                {/* STEP 5 — Payment                               */}
                {/* ════════════════════════════════════════════════ */}
                {currentStep === 5 && <div>
                  <PaymentStep
                    amount={(() => {
                      const base = fields.length * 49.99;
                      const fee = form.getValues('processingOption') === 'fast' ? 20 : form.getValues('processingOption') === 'ultra' ? 50 : 0;
                      return (base + fee).toFixed(2);
                    })()}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />

                  <div className="flex justify-start mt-8">
                    <Button type="button" variant="outline" onClick={() => changeStep(4)}>← Back</Button>
                  </div>

                  <div className="mt-12 pt-6 border-t text-sm text-slate-600 space-y-2">
                    <div>Processing: {form.getValues('processingOption') === 'ultra' ? 'Ultra Premium' : form.getValues('processingOption') === 'fast' ? 'Fast' : 'Standard'}</div>
                    <div>Email: {form.getValues('travelers')?.[0]?.email || 'Not provided'}</div>
                    <div>Total: ${(() => {
                      const base = fields.length * 49.99;
                      const fee = form.getValues('processingOption') === 'fast' ? 20 : form.getValues('processingOption') === 'ultra' ? 50 : 0;
                      return (base + fee).toFixed(2);
                    })()}</div>
                  </div>
                </div>}

              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Terms Modal */}
      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Terms and Conditions</DialogTitle>
            <DialogDescription className="text-sm">Please read carefully before using our service.</DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm sm:prose-base max-w-none mt-4">
            <div className="space-y-6 text-sm sm:text-base leading-relaxed">
              <p className="text-xs text-slate-500 mb-4"><strong>Effective Date:</strong> June 27, 2025</p>
              <p>Welcome to {SITE_CONFIG.domain}, a service provided by {SITE_CONFIG.domain}. This document explains the terms under which you may use our online services.</p>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">01. Our Contractual Agreement</h3>
                <p className="mb-3">By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, you may not use our Service.</p>
                <p className="font-semibold">Arbitration Notice: This Agreement contains a Binding Arbitration and Class Action Waiver clause.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">02. User Information and Responsibilities</h3>
                <p>You are responsible for ensuring all information you provide is accurate, complete, and up-to-date.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">03. Our Relationship with You</h3>
                <p>{SITE_CONFIG.domain} is an independent entity not affiliated with any government. We provide digital immigration card assistance services.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">04. Privacy and Data Security</h3>
                <p>By using the Service, you consent to the collection and use of your personal information as set forth in our Privacy Policy.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">05. Your Rights and Responsibilities</h3>
                <p>When you receive a travel document, verify that all information is correct. Ensure your passport is valid for at least six months.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">06. Rights of {SITE_CONFIG.domain}</h3>
                <p>You grant {SITE_CONFIG.domain} the right to process data for operating the Service. All Service IP is our exclusive property.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">07. Prohibited Uses</h3>
                <p>You are prohibited from using the Service for any unlawful, fraudulent, or malicious purpose.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">08–09. Third Parties & Termination</h3>
                <p>We are not responsible for third-party sites. We may terminate access for violations of this Agreement.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">10. Disclaimers</h3>
                <p className="uppercase font-semibold text-xs">THE SERVICE IS PROVIDED "AS IS". {SITE_CONFIG.domain.toUpperCase()} DISCLAIMS ALL WARRANTIES.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">11. Limitation of Liability</h3>
                <p className="uppercase font-semibold text-xs">TOTAL LIABILITY IS LIMITED TO U.S. $100.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">12–15. Additional Provisions</h3>
                <p>You agree to indemnify {SITE_CONFIG.domain}. This constitutes the entire agreement. Governed by Delaware law.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">16. Arbitration & Class Action Waiver</h3>
                <p>Disputes resolved by binding arbitration in Newark, Delaware. <strong>YOU WAIVE YOUR RIGHT TO A JURY TRIAL OR CLASS ACTION.</strong></p>
              </div>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">17–20. Final Terms</h3>
                <p>Claims must be filed within one year. Purchases are one-time. Refer to Refund Policy for cancellation details.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Apply;
