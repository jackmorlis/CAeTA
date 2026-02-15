// API Client for FastAPI Backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Traveler {
  // Personal information
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  place_of_birth?: string;
  nationality: string;
  civil_status?: string;
  occupation?: string;

  // Passport
  passport_number: string;

  // Contact (only required for primary traveler)
  email?: string;
  phone_code?: string;
  phone?: string;

  // Address
  residential_address?: string;
  country_of_residence?: string;
  city?: string;
}

export interface ApplicationCreate {
  // General Information
  permanent_address?: string;
  country_of_residence?: string;
  city_of_residence?: string;
  direction?: string;  // 'arrival' or 'departure'
  stops_other_countries?: string;  // 'yes' or 'no'

  // Travel / Flight
  departure_country?: string;
  embarkation_port?: string;
  disembarkation_port?: string;
  airline_name?: string;
  flight_number?: string;
  flight_date?: string;

  // Trip details
  travel_purpose?: string;
  arrival_date?: string;
  departure_date?: string;

  // Return / Departure flight information
  return_departure_airport?: string;
  return_destination_airport?: string;
  return_airline_name?: string;
  return_flight_date?: string;
  return_flight_number?: string;

  // Accommodation
  accommodation_type?: string;
  accommodation_details?: string;

  // Customs — Currency
  exceeds_money_limit?: string;
  currency_amount?: number;
  currency_type?: string;
  currency_origin?: string;
  is_values_owner?: string;
  sender_name?: string;
  sender_last_name?: string;
  receiver_name?: string;
  receiver_last_name?: string;
  relationship_sender?: string;
  money_use_destiny?: string;

  // Customs — Animals/Food
  has_animals_or_food?: string;

  // Customs — Taxable Goods
  has_taxable_goods?: string;
  taxable_value?: number;
  taxable_currency?: string;
  taxable_description?: string;
  taxable_value_usd?: string;

  processing_option?: string;  // 'standard', 'fast', 'ultra'
  travelers: Traveler[];

  // Payment fields (optional - filled after payment)
  payment_method?: string;
  payment_status?: string;
  payment_transaction_id?: string;
  payment_order_id?: string;
  amount_paid?: number;

  // Pre-authorization fields
  authorization_id?: string;
  authorization_status?: string;

  // RedTrack tracking
  redtrack_click_id?: string;
  // Device fingerprint
  device_fingerprint?: Record<string, any>;
}

export interface ApplicationResponse {
  id: string;
  session_id: string;
  status: string;

  // General Information
  permanent_address?: string;
  country_of_residence?: string;
  city_of_residence?: string;
  direction?: string;
  stops_other_countries?: string;

  // Travel / Flight
  departure_country?: string;
  embarkation_port?: string;
  disembarkation_port?: string;
  airline_name?: string;
  flight_number?: string;
  flight_date?: string;

  // Trip details
  travel_purpose?: string;
  arrival_date?: string;
  departure_date?: string;

  // Return / Departure flight information
  return_departure_airport?: string;
  return_destination_airport?: string;
  return_airline_name?: string;
  return_flight_date?: string;
  return_flight_number?: string;

  // Accommodation
  accommodation_type?: string;
  accommodation_details?: string;

  // Customs
  exceeds_money_limit?: string;
  has_animals_or_food?: string;
  has_taxable_goods?: string;

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
  travelers: (Traveler & { id: string; application_id: string; created_at: string })[];
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

  // Auth token management
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
      headers: {
        'Content-Type': 'application/json',
      },
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

  async updateApplicationStatus(
    sessionId: string,
    status: string,
    paidAt?: string,
    amountPaid?: number
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/applications/${sessionId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        paid_at: paidAt,
        amount_paid: amountPaid,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update application status');
    }
  }

  async submitContact(data: ContactCreate): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to submit contact form');
    }
  }

  // Admin Authentication
  async adminLogin(username: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const response = await fetch(`${this.baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    if (search) {
      url.searchParams.append('search', search);
    }
    if (status) {
      url.searchParams.append('status', status);
    }

    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('Session expired. Please login again.');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get applications');
    }

    return response.json();
  }

  async getAdminStats(): Promise<{
    total_applications: number;
    today_applications: number;
    total_revenue: number;
    pending_applications: number;
  }> {
    const response = await fetch(`${this.baseUrl}/api/admin/stats`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('Session expired. Please login again.');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get stats');
    }

    return response.json();
  }

  async exportAdminCSV(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/admin/export`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error('Failed to export CSV');
    }

    return response.blob();
  }

  // PayPal Methods
  async getPayPalClientId(): Promise<{ client_id: string; mode: string }> {
    const response = await fetch(`${this.baseUrl}/api/paypal/client-id`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get PayPal client ID');
    }

    return response.json();
  }

  async createPayPalOrder(amount: string, currency: string = 'USD', description: string = 'DAC Assistance — Service Fee'): Promise<{
    order_id: string;
    approval_url?: string;
    status: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/paypal/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        description,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create PayPal order');
    }

    return response.json();
  }

  async capturePayPalOrder(orderId: string): Promise<{
    order_id: string;
    status: string;
    payer_email?: string;
    transaction_id?: string;
    amount?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/paypal/capture-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: orderId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to capture PayPal payment');
    }

    return response.json();
  }

  // Pre-authorization methods
  async authorizePayPalOrder(orderId: string): Promise<{
    order_id: string;
    authorization_id: string;
    status: string;
    amount?: string;
    payer_email?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/paypal/authorize-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: orderId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to authorize PayPal payment');
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
