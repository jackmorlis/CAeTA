// API Client for FastAPI Backend

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('VITE_API_URL environment variable is required');
}

export interface Traveler {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  place_of_birth?: string;
  nationality: string;
  civil_status?: string;
  occupation?: string;
  passport_number: string;
  passport_expiry_date?: string;
  email?: string;
  phone_code?: string;
  phone?: string;
  residential_address?: string;
  country_of_residence?: string;
  city?: string;
}

export interface ApplicationCreate {
  permanent_address?: string;
  country_of_residence?: string;
  city_of_residence?: string;
  departure_country?: string;
  embarkation_port?: string;
  disembarkation_port?: string;
  airline_name?: string;
  flight_number?: string;
  arrival_date?: string;
  departure_date?: string;
  travel_purpose?: string;
  // Return / Departure flight
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
  currency_amount?: number;
  currency_type?: string;
  currency_origin?: string;
  is_values_owner?: string;
  has_animals_or_food?: string;
  has_taxable_goods?: string;
  taxable_value?: number;
  taxable_currency?: string;
  taxable_description?: string;
  taxable_value_usd?: string;
  processing_option?: string;
  travelers: Traveler[];
  // Payment fields (optional - filled after payment)
  payment_method?: string;
  payment_status?: string;
  payment_transaction_id?: string;
  payment_order_id?: string;
  amount_paid?: number;
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
  arrival_date?: string;
  departure_date?: string;
  // Trip details
  travel_purpose?: string;
  sports_during_stay?: string;
  // Return / Departure flight
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
  currency_amount?: number;
  currency_type?: string;
  currency_origin?: string;
  is_values_owner?: string;
  has_animals_or_food?: string;
  has_taxable_goods?: string;
  taxable_value?: number;
  taxable_currency?: string;
  taxable_description?: string;
  taxable_value_usd?: string;
  processing_option?: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  amount_paid?: number;
  payment_method?: string;
  payment_status?: string;
  payment_transaction_id?: string;
  payment_order_id?: string;
  // Pre-authorization fields
  authorization_id?: string;
  authorization_status?: string;
  authorized_at?: string;
  captured_at?: string;
  capture_id?: string;
  fulfillment_status: string;
  fulfillment_delivered_at?: string;
  delivery_email_sent_at?: string;
  device_fingerprint?: Record<string, any>;
  travelers: (Traveler & { id: string; application_id: string; created_at: string })[];
}

export interface ContactCreate {
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  message: string;
}

export interface PaginatedApplicationsResponse {
  items: ApplicationResponse[];
  total: number;
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

  async getAdminApplications(
    search?: string,
    status?: string,
    fulfillmentStatus?: string,
    page: number = 1,
    perPage: number = 50
  ): Promise<PaginatedApplicationsResponse> {
    const url = new URL(`${this.baseUrl}/api/admin/applications`);
    if (search) {
      url.searchParams.append('search', search);
    }
    if (status) {
      url.searchParams.append('status', status);
    }
    if (fulfillmentStatus) {
      url.searchParams.append('fulfillment_status', fulfillmentStatus);
    }
    // Pagination params
    const skip = (page - 1) * perPage;
    url.searchParams.append('skip', skip.toString());
    url.searchParams.append('limit', perPage.toString());

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
    authorized_revenue: number;
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

  async exportPaymentLogsCSV(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/admin/export-payment-logs`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error('Failed to export payment logs CSV');
    }

    return response.blob();
  }

  async exportAnalyticsCSV(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/admin/export-analytics`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error('Failed to export analytics CSV');
    }

    return response.blob();
  }

  async markApplicationAsDelivered(applicationId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/admin/applications/${applicationId}/mark-delivered`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('Session expired. Please login again.');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to mark application as delivered');
    }

    return response.json();
  }

  async markApplicationAsPending(applicationId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/admin/applications/${applicationId}/mark-pending`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('Session expired. Please login again.');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to mark application as pending');
    }

    return response.json();
  }

  async sendDeliveryEmail(applicationId: string, pdfFile: File): Promise<{ success: boolean; message: string; delivery_email_sent_at: string }> {
    const formData = new FormData();
    formData.append('file', pdfFile);

    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}/api/admin/applications/${applicationId}/send-delivery-email`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('Session expired. Please login again.');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send delivery email');
    }

    return response.json();
  }

  // PayPal Methods
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

  // Financial Stats Methods
  async getFinancialStats(): Promise<{
    // Today
    today_captured: number;
    today_authorized: number;
    today_voided: number;
    today_failed: number;
    // Yesterday
    yesterday_captured: number;
    yesterday_authorized: number;
    yesterday_voided: number;
    yesterday_failed: number;
    // 7-Day
    revenue_7_days_captured: number;
    revenue_7_days_authorized: number;
    revenue_7_days_voided: number;
    revenue_7_days_failed: number;
    // 30-Day
    revenue_30_days_captured: number;
    revenue_30_days_authorized: number;
    revenue_30_days_voided: number;
    revenue_30_days_failed: number;
    // Existing
    avg_order_value: number;
    total_successful_payments: number;
    total_failed_payments: number;
  }> {
    const response = await fetch(`${this.baseUrl}/api/admin/financial-stats`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('Session expired. Please login again.');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get financial stats');
    }

    return response.json();
  }

  async getPaymentLogs(params?: {
    limit?: number;
    offset?: number;
    order_id?: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<PaymentLog[]> {
    const url = new URL(`${this.baseUrl}/api/admin/payment-logs`);

    if (params?.limit) url.searchParams.append('limit', params.limit.toString());
    if (params?.offset) url.searchParams.append('offset', params.offset.toString());
    if (params?.order_id) url.searchParams.append('order_id', params.order_id);
    if (params?.event_type) url.searchParams.append('event_type', params.event_type);
    if (params?.start_date) url.searchParams.append('start_date', params.start_date);
    if (params?.end_date) url.searchParams.append('end_date', params.end_date);

    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('Session expired. Please login again.');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get payment logs');
    }

    return response.json();
  }

  // Pre-authorization capture/void methods (admin only)
  async captureAuthorization(applicationId: string, authorizationId: string): Promise<{
    capture_id: string;
    authorization_id: string;
    status: string;
    amount: string;
  }> {
    // First capture with PayPal
    const captureResponse = await fetch(`${this.baseUrl}/api/paypal/capture-authorization`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authorization_id: authorizationId }),
    });

    if (!captureResponse.ok) {
      const error = await captureResponse.json();
      throw new Error(error.detail || 'Failed to capture authorization');
    }

    const captureResult = await captureResponse.json();

    // Then update the application record
    await fetch(`${this.baseUrl}/api/admin/applications/${applicationId}/update-capture`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        capture_id: captureResult.capture_id,
        authorization_status: 'CAPTURED',
      }),
    });

    return captureResult;
  }

  async voidAuthorization(applicationId: string, authorizationId: string): Promise<{
    authorization_id: string;
    status: string;
  }> {
    // First void with PayPal
    const voidResponse = await fetch(`${this.baseUrl}/api/paypal/void-authorization`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authorization_id: authorizationId }),
    });

    if (!voidResponse.ok) {
      const error = await voidResponse.json();
      throw new Error(error.detail || 'Failed to void authorization');
    }

    const voidResult = await voidResponse.json();

    // Then update the application record
    await fetch(`${this.baseUrl}/api/admin/applications/${applicationId}/update-capture`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorization_status: 'VOIDED',
      }),
    });

    return voidResult;
  }

  // Authorization stats for Financial Dashboard
  async getAuthorizationStats(statusFilter?: 'pending' | 'failed' | 'voided' | 'ready'): Promise<AuthorizationStatsResponse> {
    const url = new URL(`${this.baseUrl}/api/admin/authorization-stats`);
    if (statusFilter) {
      url.searchParams.append('status_filter', statusFilter);
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
      throw new Error(error.detail || 'Failed to get authorization stats');
    }

    return response.json();
  }

  // Lookup application for partial capture
  async lookupApplicationForCapture(
    searchType: 'session_id' | 'email' | 'authorization_id',
    searchValue: string
  ): Promise<ApplicationLookupResponse> {
    const url = new URL(`${this.baseUrl}/api/admin/applications/lookup`);
    url.searchParams.append('search_type', searchType);
    url.searchParams.append('search_value', searchValue);

    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('Session expired. Please login again.');
      }
      if (response.status === 404) {
        throw new Error('Application not found');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to lookup application');
    }

    return response.json();
  }

  // Partial capture authorization
  async partialCaptureAuthorization(
    applicationId: string,
    authorizationId: string,
    amount: string
  ): Promise<{
    capture_id: string;
    authorization_id: string;
    status: string;
    amount: string;
  }> {
    // Capture with PayPal (with partial amount)
    const captureResponse = await fetch(`${this.baseUrl}/api/paypal/capture-authorization`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorization_id: authorizationId,
        amount: amount,
      }),
    });

    if (!captureResponse.ok) {
      const error = await captureResponse.json();
      throw new Error(error.detail || 'Failed to capture authorization');
    }

    const captureResult = await captureResponse.json();

    // Update the application record
    await fetch(`${this.baseUrl}/api/admin/applications/${applicationId}/update-capture`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        capture_id: captureResult.capture_id,
        authorization_status: 'CAPTURED',
      }),
    });

    return captureResult;
  }
}

export interface AuthorizationSummary {
  id: string;
  session_id: string;
  authorization_id?: string;
  authorization_status?: string;
  authorized_at?: string;
  captured_at?: string;
  capture_id?: string;
  amount_paid?: number;
  fulfillment_status: string;
  fulfillment_delivered_at?: string;
  created_at: string;
  first_traveler_email?: string;
}

export interface AuthorizationStatsResponse {
  pending_authorizations: number;
  failed_captures: number;
  voided_authorizations: number;
  ready_for_capture: number;
  total_authorized_amount: number;
  total_captured_amount: number;
  applications: AuthorizationSummary[];
}

export interface ApplicationLookupResponse {
  id: string;
  session_id: string;
  customer_email: string | null;
  customer_name: string | null;
  traveler_count: number;
  amount_paid: number;
  authorization_id: string | null;
  authorization_status: string | null;
  authorized_at: string | null;
  capture_id: string | null;
  captured_at: string | null;
  payment_status: string | null;
  processing_option: string | null;
  created_at: string;
  can_capture: boolean;
}

export interface PaymentLog {
  id: string;
  created_at: string;
  event_type: string;
  order_id?: string;
  transaction_id?: string;
  amount?: number;
  currency?: string;
  order_status?: string;
  capture_status?: string;
  payer_email?: string;
  ip_address?: string;
  error_message?: string;
  error_type?: string;
  paypal_debug_id?: string;
  paypal_error_name?: string;
  paypal_error_code?: string;
  request_payload?: any;
  response_payload?: any;
  application_id?: string;
}

export const apiClient = new ApiClient();
