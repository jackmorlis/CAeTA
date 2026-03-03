import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plane, CreditCard, User, CheckCircle, Globe, Mail, MapPin, Plus, Trash2, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';
import type { ApplicationCreate } from '@/lib/api';
import { SITE_CONFIG } from '@/config/site';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';
import { DateSelectInput } from '@/components/ui/date-select-input';
import { PaymentStep } from '@/components/PaymentStep';
import { loadPayPalSDK } from '@/lib/paypal-loader';
import {
  passportCountryCodes,
  ETA_ELIGIBLE_CODES,
  BLOCKED_CODES,
  nationalities,
  countriesOfBirth,
  genders,
  languagePreferences,
  timezones,
} from '@/data/formOptions';
import { occupations, jobTitlesByOccupation } from '@/data/employmentOptions';

// ─── Helpers ────────────────────────────────────────────────────────
const getTodayInToronto = (): string => {
  const now = new Date();
  const torontoTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
  const year = torontoTime.getFullYear();
  const month = String(torontoTime.getMonth() + 1).padStart(2, '0');
  const day = String(torontoTime.getDate()).padStart(2, '0');
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

// ─── Regex constants ────────────────────────────────────────────────
const PASSPORT_REGEX = /^[a-zA-Z0-9]+(\s[a-zA-Z0-9]+)?$/;
const NAME_REGEX = /^[a-zA-ZéàâêîôûëïüùçæœÉÀÂÊÎÔÛËÏÜÙÇÆŒ][a-zA-ZéàâêîôûëïüùçæœÉÀÂÊÎÔÛËÏÜÙÇÆŒ\s\-']*$/;
const UCI_FORMAT_REGEX = /^$|^\d{8}(\d{2})?$/;

// ─── Schema ─────────────────────────────────────────────────────────
const formSchema = z.object({
  // Step 0 — Travel Document
  passportCountryCode: z.string().optional().default(""),
  usPermanentResident: z.string().optional().default(""),

  // Step 1 — Passport Details
  passportNumber: z.string().optional().default(""),
  passportNumberConfirm: z.string().optional().default(""),
  surname: z.string().optional().default(""),
  givenNames: z.string().optional().default(""),
  middleName: z.string().optional().default(""),
  dateOfBirth: z.string().optional().default(""),
  gender: z.string().optional().default(""),
  maritalStatus: z.string().optional().default(""),
  representativeSurname: z.string().optional().default(""),
  representativeGivenNames: z.string().optional().default(""),
  countryOfBirth: z.string().optional().default(""),
  cityOfBirth: z.string().optional().default(""),
  passportIssueDate: z.string().optional().default(""),
  passportExpiryDate: z.string().optional().default(""),
  hasAdditionalNationalities: z.string().optional().default(""),
  additionalNationalities: z.array(z.string()).optional().default([]),

  // Step 2 — Personal Details
  previousCanadaVisa: z.string().optional().default(""),
  uciNumber: z.string().optional().default(""),
  languagePreference: z.string().optional().default(""),

  // Step 3 — Contact Information
  email: z.string().optional().default(""),
  emailConfirm: z.string().optional().default(""),

  // Step 4 — Residential Address
  apartmentUnit: z.string().optional().default(""),
  streetAddress: z.string().optional().default(""),
  city: z.string().optional().default(""),
  countryResidence: z.string().optional().default(""),
  districtRegion: z.string().optional().default(""),
  postalCode: z.string().optional().default(""),

  // Step — Employment Information
  occupation: z.string().optional().default(""),
  jobTitle: z.string().optional().default(""),
  employerName: z.string().optional().default(""),
  employerCountry: z.string().optional().default(""),
  employerCity: z.string().optional().default(""),
  employmentSinceYear: z.string().optional().default(""),

  // Step 5 — Travel Information
  travelDateKnown: z.string().optional().default(""),
  travelDate: z.string().optional().default(""),
  travelHour: z.string().optional().default(""),
  travelMinute: z.string().optional().default(""),
  travelTimezone: z.string().optional().default(""),

  // Background Questions
  bgRefusedVisa: z.string().optional().default(""),
  bgRefusedVisaDetails: z.string().optional().default(""),
  bgCriminalOffence: z.string().optional().default(""),
  bgCriminalOffenceDetails: z.string().optional().default(""),
  bgTuberculosis: z.string().optional().default(""),
  bgTbHealthWorker: z.string().optional().default(""),
  bgTbDiagnosed: z.string().optional().default(""),
  bgMedicalCondition: z.string().optional().default(""),
  bgAdditionalDetails: z.string().optional().default(""),

  // Step 6 — Consent & Declaration
  processingOption: z.string().optional().default("standard"),
  consentAgreed: z.boolean().optional().default(false),
  declarationAgreed: z.boolean().optional().default(false),
  signature: z.string().optional().default(""),
});

type FormData = z.infer<typeof formSchema>;

// ─── Searchable Select (for passport country codes) ─────────────────
const SearchableSelect: React.FC<{
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  className?: string;
}> = ({ value, onValueChange, placeholder, options, className }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const lower = search.toLowerCase();
    return options.filter(o =>
      o.label.toLowerCase().includes(lower) || o.value.toLowerCase().includes(lower)
    );
  }, [search, options]);

  const selectedLabel = options.find(o => o.value === value)?.label || '';

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-12 w-full rounded-md border-2 border-gray-200 bg-background px-3 py-2 text-sm text-left hover:border-primary focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {selectedLabel || <span className="text-muted-foreground">{placeholder}</span>}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-hidden">
          <div className="p-2 border-b">
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No results found</div>
            )}
            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors",
                  o.value === value && "bg-primary/5 font-medium"
                )}
                onClick={() => {
                  onValueChange(o.value);
                  setOpen(false);
                  setSearch('');
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />
      )}
    </div>
  );
};

// ─── Component ──────────────────────────────────────────────────────
const Apply = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [declarationModalOpen, setDeclarationModalOpen] = useState(false);
  const [additionalNats, setAdditionalNats] = useState<string[]>([]);
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
      passportCountryCode: "",
      usPermanentResident: "",
      passportNumber: "",
      passportNumberConfirm: "",
      surname: "",
      givenNames: "",
      middleName: "",
      dateOfBirth: "",
      gender: "",
      maritalStatus: "",
      representativeSurname: "",
      representativeGivenNames: "",
      countryOfBirth: "",
      cityOfBirth: "",
      passportIssueDate: "",
      passportExpiryDate: "",
      hasAdditionalNationalities: "",
      additionalNationalities: [],
      previousCanadaVisa: "",
      uciNumber: "",
      languagePreference: "",
      email: "",
      emailConfirm: "",
      apartmentUnit: "",
      streetAddress: "",
      city: "",
      countryResidence: "",
      districtRegion: "",
      postalCode: "",
      occupation: "",
      jobTitle: "",
      employerName: "",
      employerCountry: "",
      employerCity: "",
      employmentSinceYear: "",
      travelDateKnown: "",
      travelDate: "",
      travelHour: "",
      travelMinute: "",
      travelTimezone: "",
      bgRefusedVisa: "",
      bgRefusedVisaDetails: "",
      bgCriminalOffence: "",
      bgCriminalOffenceDetails: "",
      bgTuberculosis: "",
      bgTbHealthWorker: "",
      bgTbDiagnosed: "",
      bgMedicalCondition: "",
      bgAdditionalDetails: "",
      processingOption: "standard",
      consentAgreed: false,
      declarationAgreed: false,
      signature: "",
    },
  });

  // ─── Eligibility logic ──────────────────────────────────────────────
  const watchCountryCode = form.watch('passportCountryCode');
  const watchUSResident = form.watch('usPermanentResident');

  const eligibility = useMemo(() => {
    if (!watchCountryCode) return { status: 'none' as const };
    if (BLOCKED_CODES.has(watchCountryCode)) return { status: 'blocked' as const };
    if (ETA_ELIGIBLE_CODES.has(watchCountryCode)) return { status: 'eligible' as const };
    // Conditional: check US permanent resident
    if (watchUSResident === 'Yes') return { status: 'exempt' as const };
    if (watchUSResident === 'No') return { status: 'blocked_non_resident' as const };
    return { status: 'conditional' as const };
  }, [watchCountryCode, watchUSResident]);

  // ─── Minor detection (under 18) ────────────────────────────────────
  const watchDob = form.watch('dateOfBirth');
  const isMinor = useMemo(() => {
    if (!watchDob || !/^\d{4}-\d{2}-\d{2}$/.test(watchDob)) return false;
    const today = new Date(getTodayInToronto());
    const dob = new Date(watchDob);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
    return age < 18;
  }, [watchDob]);

  // ─── Price calculation ──────────────────────────────────────────────
  const watchProcessingOption = form.watch('processingOption');
  const totalPrice = useMemo(() => {
    if (watchProcessingOption === 'fast') return 109.99;
    if (watchProcessingOption === 'ultra') return 139.99;
    return 89.99;
  }, [watchProcessingOption]);

  // ─── Payment success ──────────────────────────────────────────────
  const handlePaymentSuccess = async (paymentData: {
    orderId: string; transactionId: string; authorizationId?: string;
    amount: string; paymentMethod: 'paypal' | 'card'; status: string;
  }) => {
    setIsSubmitting(true);
    try {
      const data = form.getValues();
      const isAuth = paymentData.status === 'CREATED' || !!paymentData.authorizationId;
      const payload: ApplicationCreate = {
        applying_on_behalf: isMinor ? "Yes" : "No",
        representative_surname: isMinor ? data.representativeSurname : undefined,
        representative_given_names: isMinor ? data.representativeGivenNames : undefined,
        travel_document_type: "Passport - ordinary/regular",
        passport_country_code: data.passportCountryCode,
        nationality: passportCountryCodes.find(p => p.code === data.passportCountryCode)?.nationality || "",
        passport_number: data.passportNumber,
        surname: data.surname,
        given_names: data.givenNames,
        middle_name: data.middleName || undefined,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        marital_status: data.maritalStatus,
        country_of_birth: data.countryOfBirth,
        city_of_birth: data.cityOfBirth,
        passport_issue_date: data.passportIssueDate,
        passport_expiry_date: data.passportExpiryDate,
        additional_nationalities: additionalNats.length > 0 ? additionalNats : undefined,
        previous_canada_visa: data.previousCanadaVisa,
        uci_number: data.uciNumber || undefined,
        language_preference: data.languagePreference,
        email: data.email,
        apartment_unit: data.apartmentUnit || undefined,
        street_address: data.streetAddress,
        city: data.city,
        country_residence: data.countryResidence,
        district_region: data.districtRegion || undefined,
        postal_code: data.postalCode || undefined,
        occupation: data.occupation,
        job_title: data.jobTitle || undefined,
        employer_name: data.employerName || undefined,
        employer_country: data.employerCountry || undefined,
        employer_city: data.employerCity || undefined,
        employment_since_year: data.employmentSinceYear || undefined,
        travel_date_known: data.travelDateKnown,
        travel_date: data.travelDateKnown === 'Yes' ? data.travelDate : undefined,
        travel_hour: data.travelDateKnown === 'Yes' ? data.travelHour : undefined,
        travel_minute: data.travelDateKnown === 'Yes' ? data.travelMinute : undefined,
        travel_timezone: data.travelDateKnown === 'Yes' ? data.travelTimezone : undefined,
        bg_refused_visa: data.bgRefusedVisa,
        bg_refused_visa_details: data.bgRefusedVisa === 'Yes' ? data.bgRefusedVisaDetails : undefined,
        bg_criminal_offence: data.bgCriminalOffence,
        bg_criminal_offence_details: data.bgCriminalOffence === 'Yes' ? data.bgCriminalOffenceDetails : undefined,
        bg_tuberculosis: data.bgTuberculosis,
        bg_tb_health_worker: data.bgTuberculosis === 'Yes' ? data.bgTbHealthWorker : undefined,
        bg_tb_diagnosed: data.bgTuberculosis === 'Yes' && data.bgTbHealthWorker === 'Yes' ? data.bgTbDiagnosed : undefined,
        bg_medical_condition: data.bgMedicalCondition,
        bg_additional_details: data.bgAdditionalDetails || undefined,
        consent_agreed: data.consentAgreed,
        declaration_agreed: data.declarationAgreed,
        signature: data.signature,
        processing_option: data.processingOption || 'standard',
        payment_method: paymentData.paymentMethod,
        payment_status: isAuth ? 'authorized' : (paymentData.status === 'COMPLETED' ? 'completed' : 'pending'),
        payment_transaction_id: paymentData.transactionId,
        payment_order_id: paymentData.orderId,
        amount_paid: parseFloat(paymentData.amount),
        redtrack_click_id: getRedTrackClickId() || undefined,
        device_fingerprint: getDeviceFingerprint(),
        authorization_id: paymentData.authorizationId || undefined,
        authorization_status: paymentData.authorizationId ? paymentData.status : undefined,
      };

      const response = await apiClient.createApplication(payload);
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

  // ─── Passport country code options for searchable select ──────────
  const passportCountryOptions = useMemo(() =>
    passportCountryCodes.map(p => ({
      value: p.code,
      label: `${p.country} (${p.displayCode || p.code})`,
    }))
  , []);

  // ─── Step definitions ─────────────────────────────────────────────
  const steps = [
    { number: 0, title: "About You", icon: User },
    { number: 1, title: "Passport Details", icon: Globe },
    { number: 2, title: "Contact & Address", icon: Mail },
    { number: 3, title: "Employment", icon: Briefcase },
    { number: 4, title: "Travel & Background", icon: Plane },
    { number: 5, title: "Pricing & Payment", icon: CreditCard },
  ];

  const TOTAL_STEPS = steps.length;

  // ─── Validation helpers ───────────────────────────────────────────
  const validateStep0 = (): boolean => {
    let valid = true;
    const d = form.getValues();

    // Passport country code + eligibility
    if (!d.passportCountryCode) { form.setError('passportCountryCode', { type: 'manual', message: 'Passport country code is required' }); valid = false; }
    if (valid && (eligibility.status === 'blocked' || eligibility.status === 'blocked_non_resident' || eligibility.status === 'exempt')) {
      valid = false;
    }
    if (valid && eligibility.status === 'conditional') {
      form.setError('usPermanentResident', { type: 'manual', message: 'Please answer this question' });
      valid = false;
    }

    // Name fields
    if (!d.surname?.trim()) { form.setError('surname', { type: 'manual', message: 'Surname is required' }); valid = false; }
    else if (!NAME_REGEX.test(d.surname)) { form.setError('surname', { type: 'manual', message: 'Invalid surname format' }); valid = false; }

    if (!d.givenNames?.trim()) { form.setError('givenNames', { type: 'manual', message: 'Given name(s) are required' }); valid = false; }
    else if (!NAME_REGEX.test(d.givenNames)) { form.setError('givenNames', { type: 'manual', message: 'Invalid given name(s) format' }); valid = false; }

    if (!d.dateOfBirth) { form.setError('dateOfBirth', { type: 'manual', message: 'Date of birth is required' }); valid = false; }
    if (!d.gender) { form.setError('gender', { type: 'manual', message: 'Gender is required' }); valid = false; }
    if (!d.maritalStatus) { form.setError('maritalStatus', { type: 'manual', message: 'Marital status is required' }); valid = false; }

    // Representative fields required if applicant is under 18
    if (isMinor) {
      if (!d.representativeSurname?.trim()) { form.setError('representativeSurname', { type: 'manual', message: 'Representative surname is required' }); valid = false; }
      else if (!NAME_REGEX.test(d.representativeSurname)) { form.setError('representativeSurname', { type: 'manual', message: 'Invalid surname format' }); valid = false; }
      if (!d.representativeGivenNames?.trim()) { form.setError('representativeGivenNames', { type: 'manual', message: 'Representative given name(s) are required' }); valid = false; }
      else if (!NAME_REGEX.test(d.representativeGivenNames)) { form.setError('representativeGivenNames', { type: 'manual', message: 'Invalid given name(s) format' }); valid = false; }
    }

    return valid;
  };

  const validateStep1 = (): boolean => {
    let valid = true;
    const d = form.getValues();

    if (!d.passportNumber?.trim()) { form.setError('passportNumber', { type: 'manual', message: 'Passport number is required' }); valid = false; }
    else if (!PASSPORT_REGEX.test(d.passportNumber)) { form.setError('passportNumber', { type: 'manual', message: 'Invalid passport number format' }); valid = false; }

    if (!d.passportNumberConfirm?.trim()) { form.setError('passportNumberConfirm', { type: 'manual', message: 'Please re-enter your passport number' }); valid = false; }
    else if (d.passportNumber !== d.passportNumberConfirm) { form.setError('passportNumberConfirm', { type: 'manual', message: 'Passport numbers do not match' }); valid = false; }

    if (!d.countryOfBirth) { form.setError('countryOfBirth', { type: 'manual', message: 'Country of birth is required' }); valid = false; }
    if (!d.cityOfBirth?.trim()) { form.setError('cityOfBirth', { type: 'manual', message: 'City of birth is required' }); valid = false; }

    if (!d.passportIssueDate) { form.setError('passportIssueDate', { type: 'manual', message: 'Passport issue date is required' }); valid = false; }
    else if (d.passportIssueDate >= getTodayInToronto()) { form.setError('passportIssueDate', { type: 'manual', message: 'Issue date must be in the past' }); valid = false; }

    if (!d.passportExpiryDate) { form.setError('passportExpiryDate', { type: 'manual', message: 'Passport expiry date is required' }); valid = false; }
    else if (d.passportExpiryDate <= getTodayInToronto()) { form.setError('passportExpiryDate', { type: 'manual', message: 'Expiry date must be in the future' }); valid = false; }

    return valid;
  };

  const validateStep2 = (): boolean => {
    let valid = true;
    const d = form.getValues();

    if (!d.email?.trim()) { form.setError('email', { type: 'manual', message: 'Email is required' }); valid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { form.setError('email', { type: 'manual', message: 'Invalid email address' }); valid = false; }
    if (!d.emailConfirm?.trim()) { form.setError('emailConfirm', { type: 'manual', message: 'Please re-enter your email' }); valid = false; }
    else if (d.email !== d.emailConfirm) { form.setError('emailConfirm', { type: 'manual', message: 'Email addresses do not match' }); valid = false; }

    if (!d.streetAddress?.trim()) { form.setError('streetAddress', { type: 'manual', message: 'Street address is required' }); valid = false; }
    if (!d.city?.trim()) { form.setError('city', { type: 'manual', message: 'City/town is required' }); valid = false; }
    if (!d.countryResidence) { form.setError('countryResidence', { type: 'manual', message: 'Country is required' }); valid = false; }

    return valid;
  };

  const validateStep3 = (): boolean => {
    let valid = true;
    const d = form.getValues();

    if (!d.occupation) { form.setError('occupation', { type: 'manual', message: 'Occupation is required' }); valid = false; }

    const occ = occupations.find(o => o.value === d.occupation);
    if (occ) {
      if (occ.showJobTitle && !d.jobTitle) { form.setError('jobTitle', { type: 'manual', message: 'Job title is required' }); valid = false; }
      if (occ.showOtherFields) {
        if (!d.employerName?.trim()) { form.setError('employerName', { type: 'manual', message: 'Employer/school name is required' }); valid = false; }
        if (!d.employerCountry) { form.setError('employerCountry', { type: 'manual', message: 'Country is required' }); valid = false; }
        if (!d.employerCity?.trim()) { form.setError('employerCity', { type: 'manual', message: 'City/town is required' }); valid = false; }
        if (!d.employmentSinceYear) { form.setError('employmentSinceYear', { type: 'manual', message: 'Year is required' }); valid = false; }
      }
    }

    return valid;
  };

  const validateStep4 = (): boolean => {
    let valid = true;
    const d = form.getValues();

    if (!d.previousCanadaVisa) { form.setError('previousCanadaVisa', { type: 'manual', message: 'Please select an option' }); valid = false; }
    if (d.previousCanadaVisa === 'Yes' && d.uciNumber && !UCI_FORMAT_REGEX.test(d.uciNumber)) {
      form.setError('uciNumber', { type: 'manual', message: 'UCI must be 8 or 10 digits' }); valid = false;
    }
    if (!d.languagePreference) { form.setError('languagePreference', { type: 'manual', message: 'Language preference is required' }); valid = false; }

    if (!d.travelDateKnown) { form.setError('travelDateKnown', { type: 'manual', message: 'Please select an option' }); valid = false; }
    if (d.travelDateKnown === 'Yes') {
      if (!d.travelDate) { form.setError('travelDate', { type: 'manual', message: 'Travel date is required' }); valid = false; }
    }

    // Background questions
    if (!d.bgRefusedVisa) { form.setError('bgRefusedVisa', { type: 'manual', message: 'Please select an option' }); valid = false; }
    if (d.bgRefusedVisa === 'Yes' && !d.bgRefusedVisaDetails?.trim()) { form.setError('bgRefusedVisaDetails', { type: 'manual', message: 'Please provide details' }); valid = false; }

    if (!d.bgCriminalOffence) { form.setError('bgCriminalOffence', { type: 'manual', message: 'Please select an option' }); valid = false; }
    if (d.bgCriminalOffence === 'Yes' && !d.bgCriminalOffenceDetails?.trim()) { form.setError('bgCriminalOffenceDetails', { type: 'manual', message: 'Please provide details' }); valid = false; }

    if (!d.bgTuberculosis) { form.setError('bgTuberculosis', { type: 'manual', message: 'Please select an option' }); valid = false; }
    if (d.bgTuberculosis === 'Yes') {
      if (!d.bgTbHealthWorker) { form.setError('bgTbHealthWorker', { type: 'manual', message: 'Please select an option' }); valid = false; }
      if (d.bgTbHealthWorker === 'Yes' && !d.bgTbDiagnosed) { form.setError('bgTbDiagnosed', { type: 'manual', message: 'Please select an option' }); valid = false; }
    }

    if (!d.bgMedicalCondition) { form.setError('bgMedicalCondition', { type: 'manual', message: 'Please select an option' }); valid = false; }

    // Declaration
    if (!d.consentAgreed) { form.setError('consentAgreed', { type: 'manual', message: 'You must agree to proceed' }); valid = false; }
    if (!d.declarationAgreed) { form.setError('declarationAgreed', { type: 'manual', message: 'You must agree to proceed' }); valid = false; }
    if (!d.signature?.trim()) { form.setError('signature', { type: 'manual', message: 'Signature is required' }); valid = false; }

    return valid;
  };

  const validateStep5 = (): boolean => {
    let valid = true;
    const d = form.getValues();
    if (!d.processingOption) { form.setError('processingOption', { type: 'manual', message: 'Please select a processing option' }); valid = false; }
    return valid;
  };

  const handleNext = () => {
    form.clearErrors();
    let valid = false;
    switch (currentStep) {
      case 0: valid = validateStep0(); break;
      case 1: valid = validateStep1(); break;
      case 2: valid = validateStep2(); break;
      case 3: valid = validateStep3(); break;
      case 4: valid = validateStep4(); break;
      case 5: valid = validateStep5(); break;
      default: valid = true;
    }
    if (valid) {
      changeStep(currentStep + 1);
    } else {
      toast({ title: "Please complete all required fields", description: "Check the highlighted fields and try again.", variant: "destructive" });
    }
  };

  // ─── Additional nationalities helpers ──────────────────────────────
  const addAdditionalNationality = () => {
    if (additionalNats.length < 5) {
      setAdditionalNats([...additionalNats, '']);
    }
  };
  const removeAdditionalNationality = (idx: number) => {
    setAdditionalNats(additionalNats.filter((_, i) => i !== idx));
  };
  const updateAdditionalNationality = (idx: number, val: string) => {
    const copy = [...additionalNats];
    copy[idx] = val;
    setAdditionalNats(copy);
  };

  // ─── Hours/Minutes arrays ──────────────────────────────────────────
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header disableLinks />

      <main className="py-8 font-quicksand">
        <div className="container mx-auto px-3 sm:px-4 max-w-6xl w-full">

          {/* Mobile Title */}
          <div className="lg:hidden mb-6">
            <h1 className="text-2xl font-bold text-slate-800">
              {steps[Math.min(currentStep, TOTAL_STEPS - 1)]?.title || "Application"}
            </h1>
          </div>

          <div className="grid lg:grid-cols-5 gap-6 w-full overflow-x-hidden">

            {/* ─── Desktop Stepper ─── */}
            {currentStep <= TOTAL_STEPS && (
              <div className="hidden lg:block lg:col-span-1 min-w-0">
                <div className="sticky top-8 space-y-4 bg-white p-5 rounded-lg shadow-sm">
                  <h2 className="text-xl font-bold text-slate-800 mb-6">Canada eTA</h2>
                  <div className="relative">
                    {steps.map((step, index) => {
                      const isActive = step.number === currentStep || (step.number === 5 && currentStep === 6);
                      const isComplete = currentStep > step.number && !(step.number === 5 && currentStep === 6);
                      return (
                        <div key={step.number} className="relative flex items-center mb-5 last:mb-0">
                          {index < steps.length - 1 && <div className="absolute left-5 top-10 w-0.5 h-10 bg-gray-200" />}
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold z-10 mr-3 flex-shrink-0",
                            isActive ? "bg-primary text-white"
                              : isComplete ? "bg-green-500 text-white"
                              : "bg-gray-200 text-gray-600"
                          )}>
                            {isComplete ? "\u2713" : step.number + 1}
                          </div>
                          <span className={cn(
                            "text-sm font-medium",
                            isActive ? "text-primary"
                              : isComplete ? "text-green-700"
                              : "text-gray-600"
                          )}>
                            {step.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tablet Stepper ─── */}
            {currentStep <= TOTAL_STEPS && (
              <div className="hidden md:block lg:hidden col-span-full mb-6 sticky top-0 z-10 bg-background">
                <div className="flex justify-between items-center bg-white rounded-lg shadow-sm p-4 overflow-x-auto gap-2">
                  {steps.map((step, index) => {
                    const isActive = step.number === currentStep || (step.number === 5 && currentStep === 6);
                    const isComplete = currentStep > step.number && !(step.number === 5 && currentStep === 6);
                    return (
                      <div key={step.number} className="flex items-center flex-shrink-0">
                        <div className="flex items-center">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                            isActive ? "bg-primary text-white"
                              : isComplete ? "bg-green-500 text-white"
                              : "bg-gray-200 text-gray-600"
                          )}>
                            {isComplete ? "\u2713" : step.number + 1}
                          </div>
                          <span className={cn("ml-2 text-xs font-medium hidden xl:inline", isActive ? "text-primary" : isComplete ? "text-green-700" : "text-gray-600")}>
                            {step.title}
                          </span>
                        </div>
                        {index < steps.length - 1 && <div className={cn("w-6 h-0.5 mx-2", isComplete ? "bg-green-500" : "bg-gray-300")} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── Mobile Progress Bar ─── */}
            <div className="md:hidden col-span-full mb-2">
              <div className="flex gap-1">
                {steps.map(step => (
                  <div key={step.number} className={cn(
                    "h-1.5 rounded-full flex-1 transition-colors",
                    currentStep >= step.number ? "bg-primary" : "bg-gray-200"
                  )} />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Step {Math.min(currentStep + 1, TOTAL_STEPS)} of {TOTAL_STEPS}</p>
            </div>

            {/* ─── Main Form Content ─── */}
            <div className={cn(currentStep <= TOTAL_STEPS ? "lg:col-span-4" : "lg:col-span-5", "min-w-0 w-full")}>
              <div className="bg-white rounded-lg shadow-soft p-6 md:p-8 overflow-x-hidden">

                {/* ════════════════════════════════════════════════ */}
                {/* STEP 0 — About You                              */}
                {/* ════════════════════════════════════════════════ */}
                {currentStep === 0 && (
                  <Form {...form}>
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                          <User className="h-6 w-6" />
                          About You
                        </h2>
                        <p className="text-slate-600 mb-8">Tell us a bit about yourself to get started.</p>
                      </div>

                      {/* Passport Country Code */}
                      <FormField control={form.control} name="passportCountryCode" render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Nationality <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Search and select passport country code"
                              options={passportCountryOptions}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Eligibility messages */}
                      {eligibility.status === 'blocked' && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800 font-semibold">
                            Based on the passport country code you selected, you are not eligible to apply for a Canada eTA. U.S. citizens do not need an eTA. Canadian citizens should use a Canadian passport to travel to Canada.
                          </p>
                        </div>
                      )}

                      {eligibility.status === 'conditional' && (
                        <FormField control={form.control} name="usPermanentResident" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Are you a lawful permanent resident of the United States with a valid Green Card? <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary max-w-md">
                                  <SelectValue placeholder="Select an option" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}

                      {eligibility.status === 'exempt' && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm text-amber-800 font-semibold">
                            As a lawful permanent resident of the United States, you do not need an eTA. You may travel to Canada with your valid Green Card and passport.
                          </p>
                        </div>
                      )}

                      {eligibility.status === 'blocked_non_resident' && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800 font-semibold">
                            Based on your passport country code, you are not eligible to apply for a Canada eTA online. You may need to apply for a visa instead. Please visit the Immigration, Refugees and Citizenship Canada (IRCC) website for more information.
                          </p>
                        </div>
                      )}

                      {/* Surname / Given Names */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="surname" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Last name(s) / Surname(s) <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="As on passport" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="givenNames" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              First name(s) / Given name(s) <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="As on passport" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {/* Middle Name */}
                      <FormField control={form.control} name="middleName" render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Middle name(s)
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="As on passport (optional)" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                          </FormControl>
                          <p className="text-sm text-slate-500">Enter the middle name exactly as shown on passport. If you have no middle name, you can leave it blank.</p>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Date of Birth / Gender */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Date of birth <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <DateSelectInput
                                date={field.value}
                                onDateChange={(v) => field.onChange(v || '')}
                                maxDate={getTodayInToronto()}
                                minDate="1900-01-01"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="gender" render={({ field }) => (
                          <FormItem className="space-y-3 flex flex-col justify-end">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Gender <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 h-12 items-center">
                                {genders.map(g => (
                                  <label key={g.value} className="flex items-center gap-2 cursor-pointer">
                                    <RadioGroupItem value={g.value} id={`gender-${g.value}`} />
                                    <span className="text-sm font-medium text-slate-700">{g.label}</span>
                                  </label>
                                ))}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                      )} />
                      </div>

                      {/* Marital Status */}
                      <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Marital status <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary">
                                <SelectValue placeholder="Select marital status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Single">Single</SelectItem>
                              <SelectItem value="Married">Married</SelectItem>
                              <SelectItem value="Common-law">Common-law</SelectItem>
                              <SelectItem value="Divorced">Divorced</SelectItem>
                              <SelectItem value="Separated">Separated</SelectItem>
                              <SelectItem value="Widowed">Widowed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Representative fields — shown if applicant is under 18 */}
                      {isMinor && (
                        <>
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-800">
                              If you are applying on behalf of a minor, please indicate your personal information as representative.
                            </p>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="representativeSurname" render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                                  Representative Surname <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="Surname of representative" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />

                            <FormField control={form.control} name="representativeGivenNames" render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                                  Representative Given Names <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="Given name(s) of representative" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </>
                      )}

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={handleNext}
                          className="px-8 py-3 text-base"
                          disabled={eligibility.status === 'blocked' || eligibility.status === 'exempt' || eligibility.status === 'blocked_non_resident'}
                        >
                          Continue &rarr;
                        </Button>
                      </div>
                    </div>
                  </Form>
                )}


                {/* ════════════════════════════════════════════════ */}
                {/* STEP 1 — Passport Details                       */}
                {/* ════════════════════════════════════════════════ */}
                {currentStep === 1 && (
                  <Form {...form}>
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                          <Globe className="h-6 w-6" />
                          Passport Details
                        </h2>
                        <p className="text-slate-600 mb-8">Have your passport ready. Enter details exactly as they appear.</p>
                      </div>

                      {/* Passport Number / Confirm */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="passportNumber" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Passport number <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Enter passport number" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="passportNumberConfirm" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Re-enter passport number <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Re-enter passport number" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {/* Country of Birth / City of Birth */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="countryOfBirth" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Country/territory of birth <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary">
                                  <SelectValue placeholder="Select country of birth" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-64">
                                {countriesOfBirth.map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="cityOfBirth" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              City/town of birth <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Enter city/town of birth" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {/* Issue Date / Expiry Date */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="passportIssueDate" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Passport issue date <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <DateSelectInput
                                date={field.value}
                                onDateChange={(v) => field.onChange(v || '')}
                                maxDate={getTodayInToronto()}
                                minDate="1900-01-01"
                              />
                            </FormControl>
                            <p className="text-sm text-slate-500">Must be in the past</p>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="passportExpiryDate" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Passport expiry date <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <DateSelectInput
                                date={field.value}
                                onDateChange={(v) => field.onChange(v || '')}
                                minDate={getTodayInToronto()}
                              />
                            </FormControl>
                            <p className="text-sm text-slate-500">Must be in the future</p>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {/* Additional Nationalities */}
                      <FormField control={form.control} name="hasAdditionalNationalities" render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Are you a citizen of any other countries? <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(v) => {
                                field.onChange(v);
                                if (v === "No") { setAdditionalNats([]); }
                              }}
                              value={field.value}
                              className="flex gap-4 pt-1"
                            >
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="Yes" id="additionalNat-yes" />
                                <span className="text-sm font-medium text-slate-700">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="No" id="additionalNat-no" />
                                <span className="text-sm font-medium text-slate-700">No</span>
                              </label>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {form.watch('hasAdditionalNationalities') === 'Yes' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-base font-medium text-slate-700">
                              Additional nationalities
                            </Label>
                            {additionalNats.length < 5 && (
                              <Button type="button" variant="outline" size="sm" onClick={addAdditionalNationality} className="flex items-center gap-1">
                                <Plus className="h-4 w-4" />
                                Add
                              </Button>
                            )}
                          </div>
                          {additionalNats.length === 0 && (
                            <p className="text-sm text-slate-500">Click "Add" to add a nationality.</p>
                          )}
                          {additionalNats.map((nat, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Select onValueChange={(v) => updateAdditionalNationality(idx, v)} value={nat}>
                                <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary flex-1">
                                  <SelectValue placeholder="Select nationality" />
                                </SelectTrigger>
                                <SelectContent className="max-h-64">
                                  {nationalities.map(n => (
                                    <SelectItem key={n} value={n}>{n}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button type="button" variant="outline" size="sm" onClick={() => removeAdditionalNationality(idx)} className="text-red-600 hover:text-red-700 flex-shrink-0">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {additionalNats.length > 0 && (
                            <p className="text-sm text-slate-500">{additionalNats.length}/5 additional nationalities</p>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={() => changeStep(0)}>&larr; Back</Button>
                        <Button type="button" onClick={handleNext} className="px-8 py-3 text-base">
                          Continue &rarr;
                        </Button>
                      </div>
                    </div>
                  </Form>
                )}


                {/* ════════════════════════════════════════════════ */}
                {/* STEP 2 — Contact & Address                      */}
                {/* ════════════════════════════════════════════════ */}
                {currentStep === 2 && (
                  <Form {...form}>
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                          <Mail className="h-6 w-6" />
                          Contact & Address
                        </h2>
                        <p className="text-slate-600 mb-8">Enter your email and residential address. Your eTA confirmation will be sent to your email.</p>
                      </div>

                      {/* Email / Confirm Email */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Email address <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="your@email.com" type="email" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <p className="text-sm text-slate-500">Your eTA approval will be sent to this email</p>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="emailConfirm" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Re-enter email address <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Re-enter your email"
                                type="email"
                                {...field}
                                className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary"
                                onBlur={() => {
                                  const email = form.getValues('email');
                                  if (field.value !== email) form.setError('emailConfirm', { type: 'manual', message: "Email addresses do not match" });
                                  else form.clearErrors('emailConfirm');
                                  field.onBlur();
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {/* Street / Apartment */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="streetAddress" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Street name <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 123 Main Street" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="apartmentUnit" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Street number
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Apt 4B (optional)" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {/* City / Country */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="city" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              City/town <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Enter city/town" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="countryResidence" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Country/territory <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary">
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-64">
                                {countriesOfBirth.map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {/* District / Postal Code */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="districtRegion" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              District/region
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Optional" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="postalCode" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Zip/postal code
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Optional" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={() => changeStep(1)}>&larr; Back</Button>
                        <Button type="button" onClick={handleNext} className="px-8 py-3 text-base">
                          Continue &rarr;
                        </Button>
                      </div>
                    </div>
                  </Form>
                )}


                {/* ════════════════════════════════════════════════ */}
                {/* STEP 3 — Employment Information                 */}
                {/* ════════════════════════════════════════════════ */}
                {currentStep === 3 && (
                  <Form {...form}>
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
                          <Briefcase className="w-6 h-6 text-primary" />
                          Employment Information
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Tell us about your current employment situation.</p>
                      </div>

                      {/* Occupation */}
                      <FormField control={form.control} name="occupation" render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Occupation <span className="text-red-500">*</span>
                          </FormLabel>
                          <p className="text-sm text-slate-500">Select the option that best describes your current employment situation.</p>
                          <Select onValueChange={(val) => {
                            field.onChange(val);
                            // Clear dependent fields when occupation changes
                            form.setValue('jobTitle', '');
                            form.setValue('employerName', '');
                            form.setValue('employerCountry', '');
                            form.setValue('employerCity', '');
                            form.setValue('employmentSinceYear', '');
                          }} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary">
                                <SelectValue placeholder="Select occupation" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {occupations.map(occ => (
                                <SelectItem key={occ.value} value={occ.value}>{occ.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Job Title — conditional */}
                      {(() => {
                        const occ = occupations.find(o => o.value === form.watch('occupation'));
                        if (!occ || !occ.showJobTitle) return null;
                        const titles = jobTitlesByOccupation[occ.value] || [];
                        return (
                          <FormField control={form.control} name="jobTitle" render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                                Job title <span className="text-red-500">*</span>
                              </FormLabel>
                              <p className="text-sm text-slate-500">Select the option that best describes your job.</p>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary">
                                    <SelectValue placeholder="Select job title" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {titles.map(title => (
                                    <SelectItem key={title} value={title}>{title}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        );
                      })()}

                      {/* Other fields — conditional */}
                      {(() => {
                        const occ = occupations.find(o => o.value === form.watch('occupation'));
                        if (!occ || !occ.showOtherFields) return null;
                        return (
                          <>
                            {/* Employer / School Name */}
                            <FormField control={form.control} name="employerName" render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                                  Name of employer or school, as appropriate <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter employer or school name" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />

                            {/* Country / City */}
                            <div className="grid md:grid-cols-2 gap-4">
                              <FormField control={form.control} name="employerCountry" render={({ field }) => (
                                <FormItem className="space-y-3">
                                  <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                                    Country/territory <span className="text-red-500">*</span>
                                  </FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary">
                                        <SelectValue placeholder="Select country" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {countriesOfBirth.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )} />

                              <FormField control={form.control} name="employerCity" render={({ field }) => (
                                <FormItem className="space-y-3">
                                  <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                                    City/town <span className="text-red-500">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter city/town" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            </div>

                            {/* Since what year? */}
                            <FormField control={form.control} name="employmentSinceYear" render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                                  Since what year? <span className="text-red-500">*</span>
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary w-48">
                                      <SelectValue placeholder="Select year" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Array.from({ length: 127 }, (_, i) => 2026 - i).map(year => (
                                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </>
                        );
                      })()}

                      {/* Navigation */}
                      <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={() => changeStep(2)}>&larr; Back</Button>
                        <Button type="button" onClick={handleNext} className="px-8 py-3 text-base">
                          Continue &rarr;
                        </Button>
                      </div>
                    </div>
                  </Form>
                )}

                {/* ════════════════════════════════════════════════ */}
                {/* STEP 4 — Travel & Background                    */}
                {/* ════════════════════════════════════════════════ */}
                {currentStep === 4 && (
                  <Form {...form}>
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                          <Plane className="h-6 w-6" />
                          Travel & Background
                        </h2>
                        <p className="text-slate-600 mb-8">Tell us about your travel plans and history with Canada.</p>
                      </div>

                      <FormField control={form.control} name="previousCanadaVisa" render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Have you ever applied for or obtained a visa, an eTA or a permit to visit, live, work or study in Canada? <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary max-w-md">
                                <SelectValue placeholder="Select an option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {form.watch('previousCanadaVisa') === 'Yes' && (
                        <FormField control={form.control} name="uciNumber" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Unique client identifier (UCI) / Previous Canadian visa, eTA or permit number
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="8 or 10 digit number (optional)" {...field} className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary max-w-md" />
                            </FormControl>
                            <p className="text-sm text-slate-500">Enter your UCI number if you have one. Format: 8 or 10 digits.</p>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}

                      <FormField control={form.control} name="languagePreference" render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Language you would prefer to be contacted in <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary max-w-md">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {languagePreferences.map(l => (
                                <SelectItem key={l} value={l}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="travelDateKnown" render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Do you know when you will travel to Canada? <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary max-w-md">
                                <SelectValue placeholder="Select an option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {form.watch('travelDateKnown') === 'Yes' && (
                        <div className="space-y-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <FormField control={form.control} name="travelDate" render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                                Travel date <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormControl>
                                <DateSelectInput
                                  date={field.value}
                                  onDateChange={(v) => field.onChange(v || '')}
                                  minDate={getTodayInToronto()}
                                  maxDate="2030-12-31"
                                  defaultYear={new Date().getFullYear()}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />

                        </div>
                      )}

                      {/* ── Background Questions ── */}
                      <div className="pt-4 border-t border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Background Questions</h3>
                      </div>

                      {/* Q1 — Refused visa */}
                      <FormField control={form.control} name="bgRefusedVisa" render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Have you ever been refused a visa or permit, denied entry to, or ordered to leave Canada or any other country/territory? <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={(val) => { field.onChange(val); if (val === 'No') form.setValue('bgRefusedVisaDetails', ''); }} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary max-w-md">
                                <SelectValue placeholder="Select an option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      {form.watch('bgRefusedVisa') === 'Yes' && (
                        <FormField control={form.control} name="bgRefusedVisaDetails" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              For each refusal, please indicate the country that refused you a visa or permit, or denied you entry, as well as the reasons provided to you by the country. <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <textarea {...field} className="w-full min-h-[100px] p-3 border-2 border-gray-200 rounded-lg hover:border-primary focus:border-primary focus:outline-none resize-y" placeholder="Provide details..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}

                      {/* Q2 — Criminal offence */}
                      <FormField control={form.control} name="bgCriminalOffence" render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Have you ever committed, been arrested for, been charged with or convicted of any criminal offence in any country/territory? <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={(val) => { field.onChange(val); if (val === 'No') form.setValue('bgCriminalOffenceDetails', ''); }} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary max-w-md">
                                <SelectValue placeholder="Select an option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      {form.watch('bgCriminalOffence') === 'Yes' && (
                        <FormField control={form.control} name="bgCriminalOffenceDetails" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              For each arrest, charge, or conviction, please indicate where (city, country), when (month/year), the nature of the offence, and the sentence. <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <textarea {...field} className="w-full min-h-[100px] p-3 border-2 border-gray-200 rounded-lg hover:border-primary focus:border-primary focus:outline-none resize-y" placeholder="Provide details..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}

                      {/* Q3 — Tuberculosis */}
                      <FormField control={form.control} name="bgTuberculosis" render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            In the past two years, were you diagnosed with tuberculosis or have you been in close contact with a person with tuberculosis? <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={(val) => { field.onChange(val); if (val === 'No') { form.setValue('bgTbHealthWorker', ''); form.setValue('bgTbDiagnosed', ''); } }} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary max-w-md">
                                <SelectValue placeholder="Select an option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      {form.watch('bgTuberculosis') === 'Yes' && (
                        <>
                          <FormField control={form.control} name="bgTbHealthWorker" render={({ field }) => (
                            <FormItem className="space-y-3 ml-4 pl-4 border-l-2 border-primary/20">
                              <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                                Is your contact with tuberculosis the result of being a health care worker? <span className="text-red-500">*</span>
                              </FormLabel>
                              <Select onValueChange={(val) => { field.onChange(val); if (val === 'No') form.setValue('bgTbDiagnosed', ''); }} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary max-w-md">
                                    <SelectValue placeholder="Select an option" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Yes">Yes</SelectItem>
                                  <SelectItem value="No">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          {form.watch('bgTbHealthWorker') === 'Yes' && (
                            <FormField control={form.control} name="bgTbDiagnosed" render={({ field }) => (
                              <FormItem className="space-y-3 ml-8 pl-4 border-l-2 border-primary/20">
                                <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                                  Have you ever been diagnosed with tuberculosis? <span className="text-red-500">*</span>
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary max-w-md">
                                      <SelectValue placeholder="Select an option" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Yes">Yes</SelectItem>
                                    <SelectItem value="No">No</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                          )}
                        </>
                      )}

                      {/* Q4 — Medical conditions */}
                      <FormField control={form.control} name="bgMedicalCondition" render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Do you have one of these conditions? <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary max-w-md">
                                <SelectValue placeholder="Select an option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Untreated syphilis">Untreated syphilis</SelectItem>
                              <SelectItem value="Untreated drug or alcohol addiction">Untreated drug or alcohol addiction</SelectItem>
                              <SelectItem value="Untreated mental health condition with psychosis">Untreated mental health condition with psychosis</SelectItem>
                              <SelectItem value="None of the above">None of the above</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Q5 — Additional details */}
                      <FormField control={form.control} name="bgAdditionalDetails" render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                            Additional details
                          </FormLabel>
                          <p className="text-sm text-slate-500">Please briefly indicate if there are additional details pertinent to your application. For example, an urgent need to travel to Canada.</p>
                          <FormControl>
                            <textarea {...field} className="w-full min-h-[100px] p-3 border-2 border-gray-200 rounded-lg hover:border-primary focus:border-primary focus:outline-none resize-y" placeholder="Provide relevant details to avoid delays in the processing of your application (optional)." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Declaration */}
                      <div className="border-t pt-6 space-y-4">
                        <h3 className="text-lg font-semibold text-slate-800">Declaration</h3>

                        <FormField control={form.control} name="consentAgreed" render={({ field }) => (
                          <FormItem
                            className="flex flex-row items-start space-x-4 space-y-0 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('button')) return;
                              field.onChange(!field.value);
                            }}
                          >
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-5 w-5 mt-0.5" />
                            </FormControl>
                            <div className="space-y-1 leading-normal">
                              <FormLabel className="text-base font-bold cursor-pointer">
                                I have read and agree to the{' '}
                                <button type="button" onClick={() => setTermsModalOpen(true)} className="text-primary underline hover:text-primary/80">
                                  Terms and Conditions
                                </button>
                                . I certify that the information I have provided is true, complete and correct. I understand that misrepresentation is a serious offence under Canadian immigration law and could result in a finding of inadmissibility or removal from Canada. <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="declarationAgreed" render={({ field }) => (
                          <FormItem
                            className="flex flex-row items-start space-x-4 space-y-0 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('button')) return;
                              field.onChange(!field.value);
                            }}
                          >
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-5 w-5 mt-0.5" />
                            </FormControl>
                            <div className="space-y-1 leading-normal">
                              <FormLabel className="text-base font-bold cursor-pointer">
                                I have read and understood the consent and{' '}
                                <button type="button" onClick={() => setDeclarationModalOpen(true)} className="text-primary underline hover:text-primary/80">
                                  declaration of the information provided
                                </button>
                                . <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )} />

                        {/* Signature */}
                        <FormField control={form.control} name="signature" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base md:text-lg font-bold text-slate-800">
                              Signature (type your full name) <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Type your full legal name"
                                {...field}
                                className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary max-w-md"
                              />
                            </FormControl>
                            <p className="text-sm text-slate-500">This serves as your electronic signature</p>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={() => changeStep(3)}>&larr; Back</Button>
                        <Button type="button" onClick={handleNext} className="px-8 py-3 text-base">
                          Continue &rarr;
                        </Button>
                      </div>
                    </div>
                  </Form>
                )}


                {/* ════════════════════════════════════════════════ */}
                {/* STEP 5 — Pricing & Payment                      */}
                {/* ════════════════════════════════════════════════ */}
                {currentStep === 5 && (
                  <Form {...form}>
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                          <CreditCard className="h-6 w-6" />
                          Pricing & Payment
                        </h2>
                        <p className="text-slate-600 mb-8">Review your options and complete your payment.</p>
                      </div>

                      {/* Pricing */}
                      <div className="space-y-5">
                        {/* Base cost */}
                        <div className="text-center text-lg text-slate-700">
                          This document has a cost of <span className="font-bold text-slate-900">$89.99</span> by traveler – Estimated delivery time – <span className="font-bold text-slate-900">less than 24 hours</span>
                        </div>

                        <hr className="border-slate-200" />

                        {/* Add-on options */}
                        <FormField control={form.control} name="processingOption" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormControl>
                              <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
                                {/* Standard is the default — no visible radio, auto-selected */}
                                <input type="hidden" value="standard" />

                                <div className={cn(
                                  "border-2 rounded-xl p-5 cursor-pointer hover:border-primary transition-colors",
                                  field.value === 'fast' ? "border-primary bg-primary/5" : "border-gray-200"
                                )} onClick={() => field.onChange(field.value === 'fast' ? 'standard' : 'fast')}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <RadioGroupItem value="fast" id="fast" />
                                      <div>
                                        <Label htmlFor="fast" className="font-bold cursor-pointer text-base">Fast</Label>
                                        <p className="text-sm text-slate-500">Processed in less than 4 hours</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-lg text-primary">+ $20.00</div>
                                      <p className="text-xs text-slate-500">additional fee</p>
                                    </div>
                                  </div>
                                </div>

                                <div className={cn(
                                  "border-2 rounded-xl p-5 cursor-pointer hover:border-primary transition-colors",
                                  field.value === 'ultra' ? "border-primary bg-primary/5" : "border-gray-200"
                                )} onClick={() => field.onChange(field.value === 'ultra' ? 'standard' : 'ultra')}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <RadioGroupItem value="ultra" id="ultra" />
                                      <div>
                                        <Label htmlFor="ultra" className="font-bold cursor-pointer text-base">Ultra Premium</Label>
                                        <p className="text-sm text-slate-500">Processed in less than one hour</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-lg text-primary">+ $50.00</div>
                                      <p className="text-xs text-slate-500">additional fee</p>
                                    </div>
                                  </div>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>


                      {/* Navigation */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <Button type="button" variant="outline" onClick={() => changeStep(4)}>&larr; Back</Button>
                        <Button type="button" onClick={handleNext} className="px-12 py-6 text-lg font-semibold w-full md:w-auto">
                          Proceed to Payment
                        </Button>
                      </div>
                    </div>
                  </Form>
                )}


                {/* ════════════════════════════════════════════════ */}
                {/* STEP 6 — Payment (PaymentStep component)        */}
                {/* Shown after step 5 validation passes            */}
                {/* ════════════════════════════════════════════════ */}
                {currentStep === 6 && (
                  <div>
                    <PaymentStep
                      amount={totalPrice.toFixed(2)}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />

                    <div className="flex justify-start mt-8">
                      <Button type="button" variant="outline" onClick={() => changeStep(5)}>&larr; Back</Button>
                    </div>

                    <div className="mt-12 pt-6 border-t text-sm text-slate-600 space-y-2">
                      <div>Processing: {form.getValues('processingOption') === 'ultra' ? 'Ultra Premium' : form.getValues('processingOption') === 'fast' ? 'Fast' : 'Standard'}</div>
                      <div>Email: {form.getValues('email') || 'Not provided'}</div>
                      <div>Total: ${totalPrice.toFixed(2)}</div>
                    </div>
                  </div>
                )}

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
                <p>{SITE_CONFIG.domain} is an independent entity not affiliated with any government. We provide digital immigration assistance services.</p>
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
                <h3 className="text-base font-semibold mt-6 mb-3">08-09. Third Parties & Termination</h3>
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
                <h3 className="text-base font-semibold mt-6 mb-3">12-15. Additional Provisions</h3>
                <p>You agree to indemnify {SITE_CONFIG.domain}. This constitutes the entire agreement. Governed by Delaware law.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">16. Arbitration & Class Action Waiver</h3>
                <p>Disputes resolved by binding arbitration in Newark, Delaware. <strong>YOU WAIVE YOUR RIGHT TO A JURY TRIAL OR CLASS ACTION.</strong></p>
              </div>

              <div>
                <h3 className="text-base font-semibold mt-6 mb-3">17-20. Final Terms</h3>
                <p>Claims must be filed within one year. Purchases are one-time. Refer to Refund Policy for cancellation details.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Declaration Modal */}
      <Dialog open={declarationModalOpen} onOpenChange={setDeclarationModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Declaration of the Information Provided</DialogTitle>
            <DialogDescription className="text-sm">Please read carefully before proceeding.</DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm sm:prose-base max-w-none mt-4">
            <div className="space-y-5 text-sm sm:text-base leading-relaxed">
              <p>The information you provide is collected by the Government of Canada to process your eTA application and determine your admissibility to the country.</p>

              <p>By submitting this application, you agree that your information may be:</p>

              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Shared</strong> with other Canadian government agencies (e.g., border services, police, intelligence) and, in some cases, with foreign governments.</li>
                <li><strong>Used</strong> to verify your identity and help enforce Canadian laws.</li>
                <li><strong>Stored</strong> in government databases as part of your immigration record.</li>
              </ul>

              <p>If you provide biometrics (fingerprints), this data will be stored and may be shared with the Royal Canadian Mounted Police (RCMP) and other law enforcement agencies for identity verification and law enforcement purposes.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Apply;
