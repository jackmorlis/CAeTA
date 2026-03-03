// API Client for FastAPI Backend — Canada eTA

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ApplicationCreate {
  // Step 0 — Representative
  applying_on_behalf: string;
  representative_surname?: string;
  representative_given_names?: string;

  // Step 1 — Travel Document
  travel_document_type: string;
  passport_country_code: string;

  // Step 2 — Passport Details
  nationality: string;
  passport_number: string;
  surname: string;
  given_names: string;
  middle_name?: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  country_of_birth: string;
  city_of_birth: string;
  passport_issue_date: string;
  passport_expiry_date: string;
  additional_nationalities?: string[];

  // Step 3 — Personal Details
  previous_canada_visa: string;
  uci_number?: string;
  language_preference: string;

  // Step 4 — Contact Information
  email: string;

  // Step 5 — Residential Address
  apartment_unit?: string;
  street_address: string;
  city: string;
  country_residence: string;
  district_region?: string;
  postal_code?: string;

  // Employment Information
  occupation: string;
  job_title?: string;
  employer_name?: string;
  employer_country?: string;
  employer_city?: string;
  employment_since_year?: string;

  // Step 6 — Travel Information
  travel_date_known: string;
  travel_date?: string;
  travel_hour?: string;
  travel_minute?: string;
  travel_timezone?: string;

  // Background Questions
  bg_refused_visa: string;
  bg_refused_visa_details?: string;
  bg_criminal_offence: string;
  bg_criminal_offence_details?: string;
  bg_tuberculosis: string;
  bg_tb_health_worker?: string;
  bg_tb_diagnosed?: string;
  bg_medical_condition: string;
  bg_additional_details?: string;

  // Step 7 — Consent & Declaration
  consent_agreed: boolean;
  declaration_agreed: boolean;
  signature: string;

  // Processing & Payment
  processing_option?: string;
  payment_method?: string;
  payment_status?: string;
  payment_transaction_id?: string;
  payment_order_id?: string;
  amount_paid?: number;

  // Pre-authorization
  authorization_id?: string;
  authorization_status?: string;

  // Tracking
  redtrack_click_id?: string;
  device_fingerprint?: Record<string, any>;
}

export interface ApplicationResponse {
  id: string;
  session_id: string;
  status: string;

  applying_on_behalf?: string;
  travel_document_type?: string;
  passport_country_code?: string;
  nationality?: string;
  passport_number?: string;
  surname?: string;
  given_names?: string;
  date_of_birth?: string;
  gender?: string;
  country_of_birth?: string;
  city_of_birth?: string;
  passport_issue_date?: string;
  passport_expiry_date?: string;
  additional_nationalities?: string[];
  previous_canada_visa?: string;
  uci_number?: string;
  language_preference?: string;
  email?: string;
  apartment_unit?: string;
  street_address?: string;
  city?: string;
  country_residence?: string;
  district_region?: string;
  postal_code?: string;
  travel_date_known?: string;
  travel_date?: string;
  travel_hour?: string;
  travel_minute?: string;
  travel_timezone?: string;
  consent_agreed?: boolean;
  declaration_agreed?: boolean;
  signature?: string;

  processing_option?: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  amount_paid?: number;
  payment_method?: string;
  payment_status?: string;
  payment_transaction_id?: string;
  payment_order_id?: string;
  authorization_id?: string;
  authorization_status?: string;
  fulfillment_status?: string;
}

export interface ContactCreate {
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  message: string;
}

class ApiClient {
  private baseUrl: string;
  private tokenKey = 'admin_token';

  constructor() {
    this.baseUrl = API_URL;
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  async createApplication(data: ApplicationCreate): Promise<ApplicationResponse> {
    const response = await fetch(`${this.baseUrl}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create application');
    }
    return response.json();
  }

  async getApplication(sessionId: string): Promise<ApplicationResponse> {
    const response = await fetch(`${this.baseUrl}/api/applications/${sessionId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get application');
    }
    return response.json();
  }

  async updateApplicationStatus(sessionId: string, status: string, paidAt?: string, amountPaid?: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/applications/${sessionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, paid_at: paidAt, amount_paid: amountPaid }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update application status');
    }
  }

  async submitContact(data: ContactCreate): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to submit contact form');
    }
  }

  async adminLogin(username: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const response = await fetch(`${this.baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }
    const data = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  async adminLogout(): Promise<void> {
    this.clearToken();
  }

  isAdminAuthenticated(): boolean {
    return !!this.getToken();
  }

  async getAdminApplications(search?: string, status?: string): Promise<ApplicationResponse[]> {
    const url = new URL(`${this.baseUrl}/api/admin/applications`);
    if (search) url.searchParams.append('search', search);
    if (status) url.searchParams.append('status', status);
    const response = await fetch(url.toString(), { headers: this.getAuthHeaders() });
    if (!response.ok) {
      if (response.status === 401) { this.clearToken(); throw new Error('Session expired. Please login again.'); }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get applications');
    }
    return response.json();
  }

  async getAdminStats(): Promise<{ total_applications: number; today_applications: number; total_revenue: number; pending_applications: number }> {
    const response = await fetch(`${this.baseUrl}/api/admin/stats`, { headers: this.getAuthHeaders() });
    if (!response.ok) {
      if (response.status === 401) { this.clearToken(); throw new Error('Session expired. Please login again.'); }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get stats');
    }
    return response.json();
  }

  async exportAdminCSV(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/admin/export`, { headers: this.getAuthHeaders() });
    if (!response.ok) {
      if (response.status === 401) { this.clearToken(); throw new Error('Session expired. Please login again.'); }
      throw new Error('Failed to export CSV');
    }
    return response.blob();
  }

  async getPayPalClientId(): Promise<{ client_id: string; mode: string }> {
    const response = await fetch(`${this.baseUrl}/api/paypal/client-id`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get PayPal client ID');
    }
    return response.json();
  }

  async createPayPalOrder(amount: string, currency: string = 'USD', description: string = 'Canada eTA - Service Fee'): Promise<{ order_id: string; approval_url?: string; status: string }> {
    const response = await fetch(`${this.baseUrl}/api/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, description }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create PayPal order');
    }
    return response.json();
  }

  async capturePayPalOrder(orderId: string): Promise<{ order_id: string; status: string; payer_email?: string; transaction_id?: string; amount?: string }> {
    const response = await fetch(`${this.baseUrl}/api/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to capture PayPal payment');
    }
    return response.json();
  }

  async authorizePayPalOrder(orderId: string): Promise<{ order_id: string; authorization_id: string; status: string; amount?: string; payer_email?: string }> {
    const response = await fetch(`${this.baseUrl}/api/paypal/authorize-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to authorize PayPal payment');
    }
    return response.json();
  }
}

export const apiClient = new ApiClient();
