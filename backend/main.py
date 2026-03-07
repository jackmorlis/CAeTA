from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel, EmailStr, Field, validator, ValidationError
from sqlalchemy import create_engine, Column, String, DateTime, Date, Boolean, Numeric, ForeignKey, Text, JSON, func, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime, date
from contextlib import asynccontextmanager
from typing import List, Optional
import os
import uuid
import json
import random
import string
import io
import csv
import requests
from dotenv import load_dotenv

# PayPal SDK imports
from paypalcheckoutsdk.core import PayPalHttpClient, SandboxEnvironment, LiveEnvironment
from paypalcheckoutsdk.orders import OrdersCreateRequest, OrdersCaptureRequest, OrdersGetRequest, OrdersAuthorizeRequest
from paypalcheckoutsdk.payments import AuthorizationsCaptureRequest, AuthorizationsVoidRequest

# Import email service
from email_service import send_payment_confirmation_email, send_internal_order_notification, send_contact_form_notification, send_contact_form_confirmation, send_refund_confirmation_email

load_dotenv()

# ===== Utility helpers =====


def _parse_allowed_origins(raw_origins: str) -> List[str]:
    """
    Return a list of allowed origins.
    Accepts a comma-separated list (with optional whitespace).
    Defaults to ["*"] when empty.
    """
    if not raw_origins:
        return ["*"]

    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["*"]


# Database setup — use SQLite for local dev if no DATABASE_URL with postgres
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dret_local.db")
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    # Enable foreign key support for SQLite
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# CORS configuration
ALLOWED_ORIGINS = _parse_allowed_origins(os.getenv("ALLOWED_ORIGINS", ""))
ALLOW_CREDENTIALS = "*" not in ALLOWED_ORIGINS

# PayPal Configuration
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox")  # sandbox or live

# Initialize PayPal client
paypal_client = None
if PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET:
    if PAYPAL_MODE == "live":
        environment = LiveEnvironment(client_id=PAYPAL_CLIENT_ID, client_secret=PAYPAL_CLIENT_SECRET)
    else:
        environment = SandboxEnvironment(client_id=PAYPAL_CLIENT_ID, client_secret=PAYPAL_CLIENT_SECRET)
    paypal_client = PayPalHttpClient(environment)

# ===== Database Models =====

class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, unique=True, nullable=False, index=True)
    status = Column(String, nullable=False, default="pending")  # pending, paid, submitted, completed

    # Canada eTA applicant fields
    applying_on_behalf = Column(String, nullable=True)
    travel_document_type = Column(String, nullable=True)
    passport_country_code = Column(String, nullable=True)
    nationality = Column(String, nullable=True)
    passport_number = Column(String, nullable=True)
    surname = Column(String, nullable=True)
    given_names = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    country_of_birth = Column(String, nullable=True)
    city_of_birth = Column(String, nullable=True)
    passport_issue_date = Column(String, nullable=True)
    passport_expiry_date = Column(String, nullable=True)
    additional_nationalities = Column(JSON, nullable=True)  # array of strings, max 5
    previous_canada_visa = Column(String, nullable=True)
    uci_number = Column(String, nullable=True)
    language_preference = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone_country_code = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    apartment_unit = Column(String, nullable=True)
    street_address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    country_residence = Column(String, nullable=True)
    district_region = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    travel_date_known = Column(String, nullable=True)
    travel_date = Column(String, nullable=True)
    travel_hour = Column(String, nullable=True)
    travel_minute = Column(String, nullable=True)
    travel_timezone = Column(String, nullable=True)
    consent_agreed = Column(Boolean, nullable=True)
    signature = Column(String, nullable=True)

    # Representative info (for minors)
    representative_surname = Column(String, nullable=True)
    representative_given_names = Column(String, nullable=True)

    # Additional personal details
    middle_name = Column(String, nullable=True)
    marital_status = Column(String, nullable=True)

    # Employment information
    occupation = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    employer_name = Column(String, nullable=True)
    employer_country = Column(String, nullable=True)
    employer_city = Column(String, nullable=True)
    employment_since_year = Column(String, nullable=True)

    # Background questions
    bg_refused_visa = Column(String, nullable=True)
    bg_refused_visa_details = Column(String, nullable=True)
    bg_criminal_offence = Column(String, nullable=True)
    bg_criminal_offence_details = Column(String, nullable=True)
    bg_tuberculosis = Column(String, nullable=True)
    bg_tb_health_worker = Column(String, nullable=True)
    bg_tb_diagnosed = Column(String, nullable=True)
    bg_medical_condition = Column(String, nullable=True)
    bg_additional_details = Column(String, nullable=True)

    # Declaration
    declaration_agreed = Column(Boolean, nullable=True)

    processing_option = Column(String(50), nullable=True, default="standard")  # 'standard', 'fast', 'ultra'
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)
    amount_paid = Column(Numeric(10, 2), nullable=True)

    # Payment fields
    payment_method = Column(String, nullable=True)  # 'paypal' or 'card'
    payment_status = Column(String, nullable=True, default="pending")  # 'pending', 'completed', 'failed'
    payment_transaction_id = Column(String, nullable=True)  # PayPal transaction ID
    payment_order_id = Column(String, nullable=True)  # PayPal order ID

    # Pre-authorization fields (for delayed capture)
    authorization_id = Column(String, nullable=True)  # PayPal authorization ID
    authorization_status = Column(String, nullable=True)  # CREATED, PENDING, CAPTURED, VOIDED, EXPIRED
    authorized_at = Column(DateTime(timezone=True), nullable=True)  # When authorization was created
    captured_at = Column(DateTime(timezone=True), nullable=True)  # When funds were captured
    capture_id = Column(String, nullable=True)  # PayPal capture ID (after capture)

    # Fulfillment fields (VA workflow)
    fulfillment_status = Column(String, nullable=False, default="pending")  # 'pending', 'delivered'
    fulfillment_delivered_at = Column(DateTime, nullable=True)  # When VA marked as delivered
    delivery_email_sent_at = Column(DateTime, nullable=True)  # When delivery email with PDF was sent to customer

    # RedTrack tracking
    redtrack_click_id = Column(String, nullable=True)  # RedTrack click ID from cookie

    # Device fingerprint
    device_fingerprint = Column(JSON, nullable=True)  # Browser/device fingerprint data


class ContactSubmission(Base):
    __tablename__ = "contact_submissions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class PaymentLog(Base):
    __tablename__ = "payment_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Event type: 'create_request', 'create_success', 'create_error',
    #            'capture_request', 'capture_success', 'capture_rejected', 'capture_error',
    #            'get_order_request', 'get_order_success', 'get_order_error'
    event_type = Column(String(50), nullable=False, index=True)

    # Payment identifiers
    order_id = Column(String(255), index=True)
    transaction_id = Column(String(255))

    # Financial data
    amount = Column(Numeric(10, 2))
    currency = Column(String(10))

    # Status tracking
    order_status = Column(String(50))
    capture_status = Column(String(50))

    # Customer info
    payer_email = Column(String(255))
    ip_address = Column(String(45))

    # Error tracking
    error_message = Column(Text)
    error_type = Column(String(255))

    # PayPal-specific error details
    paypal_debug_id = Column(String(255))      # PayPal debug ID for support
    paypal_error_name = Column(String(255))    # Error name (e.g., INSTRUMENT_DECLINED)
    paypal_error_code = Column(String(100))    # Specific error code

    # Full PayPal API correspondence (JSONB for efficient storage/querying)
    request_payload = Column(JSON)     # What we sent to PayPal
    response_payload = Column(JSON)    # What PayPal returned

    # Link to application (nullable - order might not be linked yet)
    application_id = Column(String, ForeignKey("applications.id", ondelete="SET NULL"))


# ===== Pydantic Schemas =====

class ApplicationCreate(BaseModel):
    # Canada eTA applicant fields
    applying_on_behalf: Optional[str] = None
    travel_document_type: Optional[str] = None
    passport_country_code: Optional[str] = None
    nationality: Optional[str] = None
    passport_number: Optional[str] = None
    surname: Optional[str] = None
    given_names: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    country_of_birth: Optional[str] = None
    city_of_birth: Optional[str] = None
    passport_issue_date: Optional[str] = None
    passport_expiry_date: Optional[str] = None
    additional_nationalities: Optional[List[str]] = None  # array of strings, max 5
    previous_canada_visa: Optional[str] = None
    uci_number: Optional[str] = None
    language_preference: Optional[str] = None
    email: Optional[str] = None
    phone_country_code: Optional[str] = None
    phone_number: Optional[str] = None
    apartment_unit: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    country_residence: Optional[str] = None
    district_region: Optional[str] = None
    postal_code: Optional[str] = None
    travel_date_known: Optional[str] = None
    travel_date: Optional[str] = None
    travel_hour: Optional[str] = None
    travel_minute: Optional[str] = None
    travel_timezone: Optional[str] = None
    consent_agreed: Optional[bool] = None
    signature: Optional[str] = None

    # Representative info (for minors)
    representative_surname: Optional[str] = None
    representative_given_names: Optional[str] = None

    # Additional personal details
    middle_name: Optional[str] = None
    marital_status: Optional[str] = None

    # Employment information
    occupation: Optional[str] = None
    job_title: Optional[str] = None
    employer_name: Optional[str] = None
    employer_country: Optional[str] = None
    employer_city: Optional[str] = None
    employment_since_year: Optional[str] = None

    # Background questions
    bg_refused_visa: Optional[str] = None
    bg_refused_visa_details: Optional[str] = None
    bg_criminal_offence: Optional[str] = None
    bg_criminal_offence_details: Optional[str] = None
    bg_tuberculosis: Optional[str] = None
    bg_tb_health_worker: Optional[str] = None
    bg_tb_diagnosed: Optional[str] = None
    bg_medical_condition: Optional[str] = None
    bg_additional_details: Optional[str] = None

    # Declaration
    declaration_agreed: Optional[bool] = None

    processing_option: Optional[str] = "standard"  # 'standard', 'fast', 'ultra'

    # Payment fields (optional - filled after payment)
    payment_method: Optional[str] = None
    payment_status: Optional[str] = None
    payment_transaction_id: Optional[str] = None
    payment_order_id: Optional[str] = None
    amount_paid: Optional[float] = None

    # Pre-authorization fields
    authorization_id: Optional[str] = None
    authorization_status: Optional[str] = None

    # RedTrack field
    redtrack_click_id: Optional[str] = None

    # Device fingerprint
    device_fingerprint: Optional[dict] = None

    @validator('additional_nationalities')
    def validate_additional_nationalities(cls, v):
        if v is not None and len(v) > 5:
            raise ValueError('Maximum 5 additional nationalities allowed')
        return v


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    session_id: str
    status: str

    # Canada eTA applicant fields
    applying_on_behalf: Optional[str]
    travel_document_type: Optional[str]
    passport_country_code: Optional[str]
    nationality: Optional[str]
    passport_number: Optional[str]
    surname: Optional[str]
    given_names: Optional[str]
    date_of_birth: Optional[str]
    gender: Optional[str]
    country_of_birth: Optional[str]
    city_of_birth: Optional[str]
    passport_issue_date: Optional[str]
    passport_expiry_date: Optional[str]
    additional_nationalities: Optional[List[str]]
    previous_canada_visa: Optional[str]
    uci_number: Optional[str]
    language_preference: Optional[str]
    email: Optional[str]
    phone_country_code: Optional[str]
    phone_number: Optional[str]
    apartment_unit: Optional[str]
    street_address: Optional[str]
    city: Optional[str]
    country_residence: Optional[str]
    district_region: Optional[str]
    postal_code: Optional[str]
    travel_date_known: Optional[str]
    travel_date: Optional[str]
    travel_hour: Optional[str]
    travel_minute: Optional[str]
    travel_timezone: Optional[str]
    consent_agreed: Optional[bool]
    signature: Optional[str]

    # Representative info (for minors)
    representative_surname: Optional[str]
    representative_given_names: Optional[str]

    # Additional personal details
    middle_name: Optional[str]
    marital_status: Optional[str]

    # Employment information
    occupation: Optional[str]
    job_title: Optional[str]
    employer_name: Optional[str]
    employer_country: Optional[str]
    employer_city: Optional[str]
    employment_since_year: Optional[str]

    # Background questions
    bg_refused_visa: Optional[str]
    bg_refused_visa_details: Optional[str]
    bg_criminal_offence: Optional[str]
    bg_criminal_offence_details: Optional[str]
    bg_tuberculosis: Optional[str]
    bg_tb_health_worker: Optional[str]
    bg_tb_diagnosed: Optional[str]
    bg_medical_condition: Optional[str]
    bg_additional_details: Optional[str]

    # Declaration
    declaration_agreed: Optional[bool]

    processing_option: Optional[str]
    created_at: datetime
    updated_at: datetime
    paid_at: Optional[datetime]
    amount_paid: Optional[float]
    payment_method: Optional[str]
    payment_status: Optional[str]
    payment_transaction_id: Optional[str]
    payment_order_id: Optional[str]

    # Pre-authorization fields
    authorization_id: Optional[str]
    authorization_status: Optional[str]
    authorized_at: Optional[datetime]
    captured_at: Optional[datetime]
    capture_id: Optional[str]
    fulfillment_status: str
    fulfillment_delivered_at: Optional[datetime]
    delivery_email_sent_at: Optional[datetime]
    redtrack_click_id: Optional[str]
    device_fingerprint: Optional[dict]

    class Config:
        from_attributes = True


class PaginatedApplicationsResponse(BaseModel):
    items: List[ApplicationResponse]
    total: int


class ApplicationStatusUpdate(BaseModel):
    status: str
    paid_at: Optional[datetime] = None
    amount_paid: Optional[float] = None

    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['pending', 'paid', 'submitted', 'completed']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v


class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    subject: str
    message: str


class ContactResponse(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    subject: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


# ===== PayPal Schemas =====

class CreateOrderRequest(BaseModel):
    amount: str
    currency: str = "USD"
    description: str = "Canada eTA Assistance — Service Fee"
    return_url: Optional[str] = None
    cancel_url: Optional[str] = None

class CreateOrderResponse(BaseModel):
    order_id: str
    approval_url: Optional[str] = None
    status: str

class CaptureOrderRequest(BaseModel):
    order_id: str

class CaptureOrderResponse(BaseModel):
    order_id: str
    status: str
    payer_email: Optional[str] = None
    transaction_id: Optional[str] = None
    amount: Optional[str] = None


# Pre-authorization schemas
class AuthorizeOrderRequest(BaseModel):
    order_id: str

class AuthorizeOrderResponse(BaseModel):
    order_id: str
    authorization_id: str
    status: str  # CREATED, PENDING
    amount: Optional[str] = None
    payer_email: Optional[str] = None

class CaptureAuthorizationRequest(BaseModel):
    authorization_id: str
    amount: Optional[str] = None  # For partial captures (optional)

class CaptureAuthorizationResponse(BaseModel):
    capture_id: str
    authorization_id: str
    status: str  # COMPLETED, PENDING
    amount: str

class VoidAuthorizationRequest(BaseModel):
    authorization_id: str

class VoidAuthorizationResponse(BaseModel):
    authorization_id: str
    status: str  # VOIDED


# ===== Admin Schemas =====

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class AdminStats(BaseModel):
    total_applications: int
    today_applications: int
    total_revenue: float  # Captured revenue
    authorized_revenue: float  # Authorized but not yet captured
    pending_applications: int

class PaymentLogResponse(BaseModel):
    id: str
    created_at: datetime
    event_type: str
    order_id: Optional[str] = None
    transaction_id: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    order_status: Optional[str] = None
    capture_status: Optional[str] = None
    payer_email: Optional[str] = None
    ip_address: Optional[str] = None
    error_message: Optional[str] = None
    error_type: Optional[str] = None
    paypal_debug_id: Optional[str] = None
    paypal_error_name: Optional[str] = None
    paypal_error_code: Optional[str] = None
    request_payload: Optional[dict] = None
    response_payload: Optional[dict] = None
    application_id: Optional[str] = None

    class Config:
        from_attributes = True

class FinancialStats(BaseModel):
    # Today
    today_captured: float
    today_authorized: float
    today_voided: float
    today_failed: float

    # Yesterday
    yesterday_captured: float
    yesterday_authorized: float
    yesterday_voided: float
    yesterday_failed: float

    # 7-Day
    revenue_7_days_captured: float
    revenue_7_days_authorized: float
    revenue_7_days_voided: float
    revenue_7_days_failed: float

    # 30-Day
    revenue_30_days_captured: float
    revenue_30_days_authorized: float
    revenue_30_days_voided: float
    revenue_30_days_failed: float

    # Keep existing
    avg_order_value: float
    total_successful_payments: int
    total_failed_payments: int


# ===== Helper Functions =====

import jwt
from datetime import timedelta

# Admin credentials from environment
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

def create_access_token(data: dict) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def generate_reference_number(db: Session) -> str:
    """Generate a short, unique reference number in format CETA-XXXXXX"""
    while True:
        # Generate 6 random alphanumeric characters (uppercase)
        random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        reference = f"CETA-{random_chars}"

        # Check if it already exists in database
        exists = db.query(Application).filter(Application.session_id == reference).first()
        if not exists:
            return reference


# ===== Database Dependency =====

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===== Payment Error Extraction Helper =====

def extract_paypal_error_details(error: Exception) -> dict:
    """
    Extract detailed error information from PayPal exceptions.

    Returns:
        dict with keys: debug_id, error_name, error_code, error_message
    """
    details = {
        'debug_id': None,
        'error_name': None,
        'error_code': None,
        'error_message': str(error)
    }

    # Check if it's a PayPal IOError (API error response)
    if hasattr(error, 'headers') and error.headers:
        # Extract PayPal-Debug-Id from headers
        if isinstance(error.headers, dict):
            details['debug_id'] = error.headers.get('PayPal-Debug-Id') or error.headers.get('paypal-debug-id')

    # Extract error details from the error message/response
    if hasattr(error, 'message'):
        details['error_message'] = error.message

    # Try to parse JSON error details
    error_str = str(error)
    try:
        import json
        # PayPal errors often contain JSON in the string representation
        if '{' in error_str and '}' in error_str:
            start_idx = error_str.find('{')
            end_idx = error_str.rfind('}') + 1
            json_str = error_str[start_idx:end_idx]
            error_data = json.loads(json_str)

            # Extract error name (e.g., INSTRUMENT_DECLINED, INVALID_REQUEST)
            if 'name' in error_data:
                details['error_name'] = error_data['name']

            # Extract error details array
            if 'details' in error_data and isinstance(error_data['details'], list) and len(error_data['details']) > 0:
                first_detail = error_data['details'][0]
                if 'issue' in first_detail:
                    details['error_code'] = first_detail['issue']
                if 'description' in first_detail:
                    details['error_message'] = first_detail['description']

            # Extract message field
            if 'message' in error_data and not details['error_message']:
                details['error_message'] = error_data['message']

            # Extract debug_id if present in error body
            if 'debug_id' in error_data:
                details['debug_id'] = error_data['debug_id']

    except (json.JSONDecodeError, ValueError, KeyError):
        pass  # Keep original error message if parsing fails

    return details


# ===== Payment Logging Helper =====

def log_payment_event(
    db: Session,
    event_type: str,
    order_id: str = None,
    transaction_id: str = None,
    amount: str = None,
    currency: str = None,
    order_status: str = None,
    capture_status: str = None,
    payer_email: str = None,
    ip_address: str = None,
    error_message: str = None,
    error_type: str = None,
    paypal_debug_id: str = None,
    paypal_error_name: str = None,
    paypal_error_code: str = None,
    request_payload: dict = None,
    response_payload: dict = None,
    application_id: str = None
) -> PaymentLog:
    """
    Centralized payment logging function.
    Stores payment events in database with full PayPal API correspondence.

    Args:
        db: Database session
        event_type: Type of event (create_request, create_success, capture_error, etc.)
        order_id: PayPal order ID
        transaction_id: PayPal transaction ID
        amount: Payment amount
        currency: Currency code (USD, etc.)
        order_status: PayPal order status
        capture_status: PayPal capture status
        payer_email: Payer's email
        ip_address: Client IP address
        error_message: Error message if applicable
        error_type: Error type/class name
        request_payload: Full request sent to PayPal (will be JSON serialized)
        response_payload: Full response from PayPal (will be JSON serialized)
        application_id: Link to application if available

    Returns:
        PaymentLog: Created log entry
    """
    try:
        # Convert response objects to serializable dicts
        def serialize_object(obj):
            """Recursively serialize objects to JSON-compatible format"""
            if obj is None or isinstance(obj, (str, int, float, bool)):
                return obj
            elif isinstance(obj, (list, tuple)):
                return [serialize_object(item) for item in obj]
            elif isinstance(obj, dict):
                return {k: serialize_object(v) for k, v in obj.items()}
            elif hasattr(obj, '__dict__'):
                return {k: serialize_object(v) for k, v in obj.__dict__.items() if not k.startswith('_')}
            else:
                return str(obj)

        if response_payload:
            response_payload = serialize_object(response_payload)

        # Create log entry
        log_entry = PaymentLog(
            event_type=event_type,
            order_id=order_id,
            transaction_id=transaction_id,
            amount=amount,
            currency=currency,
            order_status=order_status,
            capture_status=capture_status,
            payer_email=payer_email,
            ip_address=ip_address,
            error_message=error_message,
            error_type=error_type,
            paypal_debug_id=paypal_debug_id,
            paypal_error_name=paypal_error_name,
            paypal_error_code=paypal_error_code,
            request_payload=request_payload,
            response_payload=response_payload,
            application_id=application_id
        )

        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        # Optional: Print minimal debug line for real-time monitoring
        print(f"[PAYMENT] {event_type.upper()} - Order: {order_id or 'N/A'} - {datetime.utcnow().isoformat()}")

        return log_entry

    except Exception as e:
        print(f"WARNING: Failed to log payment event: {str(e)}")
        db.rollback()
        # Don't fail the payment flow if logging fails
        return None


# ===== Lifespan Event Handler =====

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully")
    yield
    # Shutdown: cleanup if needed
    pass


# ===== FastAPI App =====

app = FastAPI(
    title="Canada eTA Service API",
    description="API for Canada Electronic Travel Authorization (eTA) application service",
    version="1.0.0",
    lifespan=lifespan
)

# Cloudflare-aware IP detection for rate limiting
def get_real_client_ip(request: Request) -> str:
    """
    Get the real client IP address, accounting for Cloudflare and other proxies.

    Priority order:
    1. CF-Connecting-IP (Cloudflare header) - Most reliable when behind Cloudflare
    2. X-Forwarded-For (standard proxy header, first IP in chain)
    3. X-Real-IP (nginx proxy header)
    4. request.client.host (fallback, direct connection)

    This ensures each real user gets their own rate limit quota,
    instead of all users sharing Cloudflare's IP quota.
    """
    # Cloudflare header - most reliable when behind CF proxy
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()

    # Standard proxy header (get first IP in chain to avoid spoofing)
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        first_ip = x_forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip

    # Nginx proxy header
    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip:
        return x_real_ip.strip()

    # Fallback to direct connection
    return request.client.host if request.client else "unknown"

# Configure Rate Limiter with Cloudflare-aware IP detection
limiter = Limiter(key_func=get_real_client_ip)
app.state.limiter = limiter

# Custom rate limit exceeded handler with structured logging
@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom handler for rate limit violations with detailed logging
    Uses real client IP (Cloudflare-aware) for accurate logging
    """
    # Extract useful information using real IP detection
    client_ip = get_real_client_ip(request)
    user_agent = request.headers.get("user-agent", "unknown")
    endpoint = str(request.url.path)

    # Log proxy headers for debugging
    cf_ip = request.headers.get("CF-Connecting-IP", "N/A")
    x_forwarded = request.headers.get("X-Forwarded-For", "N/A")

    # Structured logging
    print("=" * 80)
    print(f"RATE LIMIT EXCEEDED - {datetime.utcnow().isoformat()}")
    print(f"Real Client IP: {client_ip}")
    print(f"CF-Connecting-IP: {cf_ip}")
    print(f"X-Forwarded-For: {x_forwarded}")
    print(f"Endpoint: {endpoint}")
    print(f"Method: {request.method}")
    print(f"User Agent: {user_agent}")
    print(f"Limit: {exc.detail}")
    print("=" * 80)

    # Return user-friendly error response
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please try again in a moment.",
            "retry_after": "60 seconds"
        },
        headers={
            "Retry-After": "60"
        }
    )

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Log detailed validation errors
    print("=" * 80)
    print("VALIDATION ERROR DETAILS:")
    print(f"Request URL: {request.url}")
    print(f"Request Method: {request.method}")
    print(f"Errors: {json.dumps(exc.errors(), indent=2)}")

    # Try to get request body for debugging
    try:
        body = await request.body()
        print(f"Request Body: {body.decode('utf-8')}")
    except:
        print("Could not read request body")

    print("=" * 80)

    # Return user-friendly error
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "message": "Validation error occurred. Please check your input data."
        }
    )


# ===== API Endpoints =====

@app.get("/")
@limiter.limit("100/minute")
async def root(request: Request):
    return {
        "message": "Canada eTA Service API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/api/health")
@limiter.limit("100/minute")
async def health_check(request: Request):
    return {"status": "healthy"}


@app.get("/api/paypal/client-id")
@limiter.limit("100/minute")
async def get_paypal_client_id(request: Request):
    """Returns the PayPal client ID for frontend initialization."""
    if not PAYPAL_CLIENT_ID:
        raise HTTPException(status_code=500, detail="PayPal client ID not configured")

    return {
        "client_id": PAYPAL_CLIENT_ID,
        "mode": PAYPAL_MODE
    }


# ===== Application Endpoints =====

@app.post("/api/applications", response_model=ApplicationResponse, status_code=201)
@limiter.limit("20/minute")
async def create_application(request: Request, application: ApplicationCreate, db: Session = Depends(get_db)):
    """Create a new Canada eTA application"""
    try:
        # Generate unique reference number (short format: CETA-XXXXXX)
        session_id = generate_reference_number(db)

        # Create application with all flat applicant fields
        db_application = Application(
            session_id=session_id,
            # Canada eTA applicant fields
            applying_on_behalf=application.applying_on_behalf,
            travel_document_type=application.travel_document_type,
            passport_country_code=application.passport_country_code,
            nationality=application.nationality,
            passport_number=application.passport_number,
            surname=application.surname,
            given_names=application.given_names,
            date_of_birth=application.date_of_birth,
            gender=application.gender,
            country_of_birth=application.country_of_birth,
            city_of_birth=application.city_of_birth,
            passport_issue_date=application.passport_issue_date,
            passport_expiry_date=application.passport_expiry_date,
            additional_nationalities=application.additional_nationalities,
            previous_canada_visa=application.previous_canada_visa,
            uci_number=application.uci_number,
            language_preference=application.language_preference,
            email=application.email,
            phone_country_code=application.phone_country_code,
            phone_number=application.phone_number,
            apartment_unit=application.apartment_unit,
            street_address=application.street_address,
            city=application.city,
            country_residence=application.country_residence,
            district_region=application.district_region,
            postal_code=application.postal_code,
            travel_date_known=application.travel_date_known,
            travel_date=application.travel_date,
            travel_hour=application.travel_hour,
            travel_minute=application.travel_minute,
            travel_timezone=application.travel_timezone,
            consent_agreed=application.consent_agreed,
            signature=application.signature,
            # Representative info (for minors)
            representative_surname=application.representative_surname,
            representative_given_names=application.representative_given_names,
            # Additional personal details
            middle_name=application.middle_name,
            marital_status=application.marital_status,
            # Employment information
            occupation=application.occupation,
            job_title=application.job_title,
            employer_name=application.employer_name,
            employer_country=application.employer_country,
            employer_city=application.employer_city,
            employment_since_year=application.employment_since_year,
            # Background questions
            bg_refused_visa=application.bg_refused_visa,
            bg_refused_visa_details=application.bg_refused_visa_details,
            bg_criminal_offence=application.bg_criminal_offence,
            bg_criminal_offence_details=application.bg_criminal_offence_details,
            bg_tuberculosis=application.bg_tuberculosis,
            bg_tb_health_worker=application.bg_tb_health_worker,
            bg_tb_diagnosed=application.bg_tb_diagnosed,
            bg_medical_condition=application.bg_medical_condition,
            bg_additional_details=application.bg_additional_details,
            # Declaration
            declaration_agreed=application.declaration_agreed,
            # Processing & Payment
            processing_option=application.processing_option or "standard",
            payment_method=application.payment_method,
            payment_status=application.payment_status or "pending",
            payment_transaction_id=application.payment_transaction_id,
            payment_order_id=application.payment_order_id,
            amount_paid=application.amount_paid,
            paid_at=datetime.utcnow() if application.payment_status == "completed" else None,
            status="paid" if application.payment_status == "completed" else "pending",
            redtrack_click_id=application.redtrack_click_id,
            device_fingerprint=application.device_fingerprint,
            # Pre-authorization fields
            authorization_id=application.authorization_id,
            authorization_status=application.authorization_status,
            authorized_at=datetime.utcnow() if application.authorization_id else None,
        )
        db.add(db_application)
        db.commit()
        db.refresh(db_application)

        # Send payment confirmation email and internal notification when payment is authorized (pre-auth)
        # Also trigger on 'pending' with authorization_id for backwards compatibility with cached frontend
        if application.payment_status in ("authorized", "pending") and application.authorization_id:
            try:
                customer_name = f"{application.given_names or ''} {application.surname or ''}".strip() or "Applicant"
                customer_email = application.email

                # Send customer confirmation email with amount and order details
                if customer_email:
                    send_payment_confirmation_email(
                        to_email=customer_email,
                        customer_name=customer_name,
                        reference_number=session_id,
                        amount_paid=application.amount_paid,
                        processing_option=application.processing_option,
                    )

                # Send internal order notification
                application_data = {
                    'passport_country_code': application.passport_country_code or 'N/A',
                    'nationality': application.nationality or 'N/A',
                    'travel_document_type': application.travel_document_type or 'N/A',
                    'travel_date': application.travel_date or 'N/A',
                    'country_residence': application.country_residence or 'N/A',
                }

                travelers_data = [
                    {
                        'first_name': application.given_names or '',
                        'last_name': application.surname or '',
                        'passport_number': application.passport_number or '',
                        'date_of_birth': application.date_of_birth or '',
                        'gender': application.gender or '',
                        'nationality': application.nationality or '',
                        'email': application.email or '',
                        'phone_code': '',
                        'phone': ''
                    }
                ]

                payment_data = {
                    'amount_paid': str(application.amount_paid) if application.amount_paid else 'N/A',
                    'payment_method': application.payment_method or 'N/A',
                    'transaction_id': application.payment_transaction_id or 'N/A',
                    'payment_status': application.payment_status or 'N/A'
                }

                send_internal_order_notification(
                    reference_number=session_id,
                    application_data=application_data,
                    payment_data=payment_data
                )

            except Exception as email_error:
                # Log but don't fail the request if email fails
                print(f"WARNING: Failed to send emails: {str(email_error)}")

        # Send RedTrack postback (after emails, before return) - fire on authorized (pre-auth)
        # Also trigger on 'pending' with authorization_id for backwards compatibility with cached frontend
        if application.payment_status in ("authorized", "pending") and application.authorization_id and application.redtrack_click_id:
            try:
                postback_url = os.getenv("REDTRACK_POSTBACK_URL", "https://your-domain.rdtk.io/postback")
                params = {
                    'clickid': application.redtrack_click_id,
                    'campaign_id': os.getenv("REDTRACK_CAMPAIGN_ID", "69a554711137c5255e131055"),
                    'sum': f"{float(application.amount_paid):.2f}",
                }
                response = requests.get(postback_url, params=params, timeout=5)
                print(f"RedTrack postback sent: clickid={application.redtrack_click_id}, sum=${float(application.amount_paid):.2f}, status={response.status_code}")
            except Exception as e:
                print(f"WARNING: RedTrack postback failed (non-critical): {str(e)}")

        return db_application

    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create application: {str(e)}")


@app.get("/api/applications/{session_id}", response_model=ApplicationResponse)
@limiter.limit("30/minute")
async def get_application(request: Request, session_id: str, db: Session = Depends(get_db)):
    """Get application by session ID"""
    application = db.query(Application).filter(Application.session_id == session_id).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    return application


@app.patch("/api/applications/{session_id}/status")
@limiter.limit("30/minute")
async def update_application_status(
    request: Request,
    session_id: str,
    status_update: ApplicationStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update application status (e.g., after payment)"""
    application = db.query(Application).filter(Application.session_id == session_id).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    try:
        application.status = status_update.status
        application.updated_at = datetime.utcnow()

        if status_update.paid_at:
            application.paid_at = status_update.paid_at
        if status_update.amount_paid:
            application.amount_paid = status_update.amount_paid

        db.commit()
        db.refresh(application)

        return {
            "message": "Application status updated successfully",
            "application_id": application.id,
            "session_id": application.session_id,
            "status": application.status
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")


# ===== Contact Form Endpoints =====

@app.post("/api/contact", response_model=ContactResponse, status_code=201)
@limiter.limit("10/minute")
async def create_contact_submission(request: Request, contact: ContactCreate, db: Session = Depends(get_db)):
    """Submit a contact form"""
    try:
        db_contact = ContactSubmission(**contact.dict())
        db.add(db_contact)
        db.commit()
        db.refresh(db_contact)

        # Send email notification to internal team
        try:
            contact_data = {
                'first_name': db_contact.first_name,
                'last_name': db_contact.last_name,
                'email': db_contact.email,
                'subject': db_contact.subject,
                'message': db_contact.message,
                'created_at': db_contact.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')
            }

            # Send notification to internal team
            send_contact_form_notification(contact_data)

            # Send confirmation to customer
            customer_name = f"{db_contact.first_name} {db_contact.last_name}"
            send_contact_form_confirmation(
                to_email=db_contact.email,
                customer_name=customer_name
            )
        except Exception as email_error:
            # Log the error but don't fail the request
            print(f"WARNING: Failed to send contact form emails: {str(email_error)}")

        return db_contact

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit contact form: {str(e)}")


# ===== Admin Authentication Dependency =====

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Security

security = HTTPBearer()

async def verify_admin_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Verify admin JWT token"""
    token = credentials.credentials
    payload = verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    return payload


# ===== Admin Endpoints =====

@app.post("/api/admin/login", response_model=AdminLoginResponse)
@limiter.limit("5/minute")
async def admin_login(request: Request, login: AdminLogin):
    """Admin login endpoint"""
    if login.username != ADMIN_USERNAME or login.password != ADMIN_PASSWORD:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    # Create access token
    access_token = create_access_token({"sub": login.username, "role": "admin"})

    return AdminLoginResponse(access_token=access_token)


@app.get("/api/admin/applications", response_model=PaginatedApplicationsResponse)
@limiter.limit("30/minute")
async def get_all_applications(
    request: Request,
    search: Optional[str] = None,
    status: Optional[str] = None,
    fulfillment_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    """Get all applications with search and filters (admin only - requires authentication)"""
    query = db.query(Application)

    # Search by reference number, email, name, or payment IDs
    if search:
        query = query.filter(
            (Application.session_id.ilike(f"%{search}%")) |
            (Application.email.ilike(f"%{search}%")) |
            (Application.given_names.ilike(f"%{search}%")) |
            (Application.surname.ilike(f"%{search}%")) |
            (Application.passport_number.ilike(f"%{search}%")) |
            (Application.authorization_id.ilike(f"%{search}%")) |
            (Application.capture_id.ilike(f"%{search}%")) |
            (Application.payment_order_id.ilike(f"%{search}%"))
        )

    # Filter by payment status
    if status:
        query = query.filter(Application.status == status)

    # Filter by fulfillment status (VA workflow)
    if fulfillment_status:
        query = query.filter(Application.fulfillment_status == fulfillment_status)

    # Get total count before pagination
    total = query.with_entities(func.count(func.distinct(Application.id))).scalar()

    # Apply pagination
    applications = query.order_by(Application.created_at.desc()).offset(skip).limit(limit).all()

    return {"items": applications, "total": total}


@app.post("/api/admin/applications/{application_id}/mark-delivered")
@limiter.limit("20/minute")
async def mark_application_delivered(
    request: Request,
    application_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    """Mark an application as delivered (admin only - requires authentication)"""
    # Find the application
    application = db.query(Application).filter(Application.id == str(application_id)).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Update fulfillment status
    application.fulfillment_status = "delivered"
    application.fulfillment_delivered_at = datetime.utcnow()

    db.commit()
    db.refresh(application)

    return {
        "success": True,
        "message": "Application marked as delivered",
        "application_id": str(application_id),
        "fulfillment_status": application.fulfillment_status,
        "fulfillment_delivered_at": application.fulfillment_delivered_at
    }


@app.post("/api/admin/applications/{application_id}/mark-pending")
@limiter.limit("20/minute")
async def mark_application_pending(
    request: Request,
    application_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    """Mark an application as pending (undo delivered) (admin only - requires authentication)"""
    # Find the application
    application = db.query(Application).filter(Application.id == str(application_id)).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Update fulfillment status back to pending
    application.fulfillment_status = "pending"
    application.fulfillment_delivered_at = None

    db.commit()
    db.refresh(application)

    return {
        "success": True,
        "message": "Application marked as pending",
        "application_id": str(application_id),
        "fulfillment_status": application.fulfillment_status,
        "fulfillment_delivered_at": application.fulfillment_delivered_at
    }


class UpdateCaptureRequest(BaseModel):
    capture_id: Optional[str] = None
    authorization_status: str  # CAPTURED, VOIDED, EXPIRED, etc.


@app.post("/api/admin/applications/{application_id}/update-capture")
@limiter.limit("20/minute")
async def update_application_capture(
    request: Request,
    application_id: uuid.UUID,
    capture_data: UpdateCaptureRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    """Update application authorization/capture status after PayPal capture or void (admin only)"""
    # Find the application
    application = db.query(Application).filter(Application.id == str(application_id)).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Update authorization status
    application.authorization_status = capture_data.authorization_status

    # If captured, update capture fields and payment status
    if capture_data.authorization_status == 'CAPTURED':
        application.captured_at = datetime.utcnow()
        if capture_data.capture_id:
            application.capture_id = capture_data.capture_id
        application.payment_status = 'completed'
        application.paid_at = datetime.utcnow()

    # If voided, release the hold
    elif capture_data.authorization_status == 'VOIDED':
        application.payment_status = 'voided'

    db.commit()
    db.refresh(application)

    return {
        "success": True,
        "message": f"Application authorization status updated to {capture_data.authorization_status}",
        "application_id": str(application_id),
        "authorization_status": application.authorization_status,
        "captured_at": application.captured_at,
        "capture_id": application.capture_id
    }


@app.get("/api/admin/applications/lookup")
@limiter.limit("30/minute")
async def lookup_application_for_capture(
    request: Request,
    search_type: str,  # session_id, email, authorization_id
    search_value: str,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    """
    Lookup a single application for partial capture by session_id, email, or authorization_id.
    Returns application details including authorization info for capture operations.
    """
    application = None

    if search_type == "session_id":
        application = db.query(Application).filter(
            Application.session_id == search_value.strip()
        ).first()
    elif search_type == "email":
        application = db.query(Application).filter(
            Application.email.ilike(search_value.strip())
        ).first()
    elif search_type == "authorization_id":
        application = db.query(Application).filter(
            Application.authorization_id == search_value.strip()
        ).first()
    else:
        raise HTTPException(status_code=400, detail="Invalid search_type. Use: session_id, email, or authorization_id")

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    customer_name = f"{application.given_names or ''} {application.surname or ''}".strip() or None

    return {
        "id": str(application.id),
        "session_id": application.session_id,
        "customer_email": application.email,
        "customer_name": customer_name,
        "amount_paid": float(application.amount_paid) if application.amount_paid else 0,
        "authorization_id": application.authorization_id,
        "authorization_status": application.authorization_status,
        "authorized_at": application.authorized_at,
        "capture_id": application.capture_id,
        "captured_at": application.captured_at,
        "payment_status": application.payment_status,
        "processing_option": application.processing_option,
        "created_at": application.created_at,
        "can_capture": application.authorization_status in ("CREATED", "PENDING") and application.authorization_id is not None
    }


@app.get("/api/admin/contacts", response_model=List[ContactResponse])
@limiter.limit("30/minute")
async def get_all_contacts(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    """Get all contact submissions (admin only - requires authentication)"""
    contacts = db.query(ContactSubmission).order_by(ContactSubmission.created_at.desc()).offset(skip).limit(limit).all()

    return contacts


@app.get("/api/admin/stats", response_model=AdminStats)
@limiter.limit("30/minute")
async def get_admin_stats(
    request: Request,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    """Get dashboard statistics (admin only - requires authentication)"""
    from sqlalchemy import func

    total_applications = db.query(Application).count()

    # Applications today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_applications = db.query(Application).filter(Application.created_at >= today_start).count()

    # Captured revenue (completed payments)
    total_revenue = db.query(func.sum(Application.amount_paid)).filter(
        Application.payment_status == "completed"
    ).scalar() or 0

    # Authorized revenue (pre-auth, not yet captured)
    authorized_revenue = db.query(func.sum(Application.amount_paid)).filter(
        Application.payment_status == "authorized"
    ).scalar() or 0

    # Pending applications
    pending_applications = db.query(Application).filter(Application.status == "pending").count()

    return AdminStats(
        total_applications=total_applications,
        today_applications=today_applications,
        total_revenue=float(total_revenue),
        authorized_revenue=float(authorized_revenue),
        pending_applications=pending_applications
    )


@app.get("/api/admin/export")
@limiter.limit("10/minute")
async def export_applications_csv(
    request: Request,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    """Export all Canada eTA applications to CSV (admin only - requires authentication)"""
    from fastapi.responses import StreamingResponse
    import csv
    import io

    # Query all applications
    applications = db.query(Application).order_by(Application.created_at.desc()).all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        'Reference Number',
        'Application Date',
        'Status',
        'Applying On Behalf',
        'Travel Document Type',
        'Passport Country Code',
        'Nationality',
        'Passport Number',
        'Surname',
        'Given Names',
        'Date of Birth',
        'Gender',
        'Country of Birth',
        'City of Birth',
        'Passport Issue Date',
        'Passport Expiry Date',
        'Additional Nationalities',
        'Previous Canada Visa',
        'UCI Number',
        'Language Preference',
        'Email',
        'Apartment/Unit',
        'Street Address',
        'City',
        'Country of Residence',
        'District/Region',
        'Postal Code',
        'Travel Date Known',
        'Travel Date',
        'Travel Hour',
        'Travel Minute',
        'Travel Timezone',
        'Consent Agreed',
        'Signature',
        'Processing Option',
        'Amount Paid',
        'Payment Method',
        'Payment Status',
        'Transaction ID',
        'Order ID',
        'Authorization ID',
        'Authorization Status',
        'Authorized At',
        'Capture ID',
        'Captured At',
        'Fulfillment Status',
        'Fulfillment Delivered At',
    ])

    # Write data
    for app in applications:
        additional_nats = ', '.join(app.additional_nationalities) if app.additional_nationalities else ''
        writer.writerow([
            app.session_id,
            app.created_at.strftime('%Y-%m-%d %H:%M:%S') if app.created_at else '',
            app.status or '',
            app.applying_on_behalf or '',
            app.travel_document_type or '',
            app.passport_country_code or '',
            app.nationality or '',
            app.passport_number or '',
            app.surname or '',
            app.given_names or '',
            app.date_of_birth or '',
            app.gender or '',
            app.country_of_birth or '',
            app.city_of_birth or '',
            app.passport_issue_date or '',
            app.passport_expiry_date or '',
            additional_nats,
            app.previous_canada_visa or '',
            app.uci_number or '',
            app.language_preference or '',
            app.email or '',
            app.apartment_unit or '',
            app.street_address or '',
            app.city or '',
            app.country_residence or '',
            app.district_region or '',
            app.postal_code or '',
            app.travel_date_known or '',
            app.travel_date or '',
            app.travel_hour or '',
            app.travel_minute or '',
            app.travel_timezone or '',
            'Yes' if app.consent_agreed else 'No',
            app.signature or '',
            app.processing_option or '',
            f"${app.amount_paid:.2f}" if app.amount_paid else "N/A",
            app.payment_method or "N/A",
            app.payment_status or "N/A",
            app.payment_transaction_id or "N/A",
            app.payment_order_id or "N/A",
            app.authorization_id or "N/A",
            app.authorization_status or "N/A",
            app.authorized_at.strftime('%Y-%m-%d %H:%M:%S') if app.authorized_at else "N/A",
            app.capture_id or "N/A",
            app.captured_at.strftime('%Y-%m-%d %H:%M:%S') if app.captured_at else "N/A",
            app.fulfillment_status or "N/A",
            app.fulfillment_delivered_at.strftime('%Y-%m-%d %H:%M:%S') if app.fulfillment_delivered_at else "N/A",
        ])

    # Prepare response
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=canada_eta_applications_{datetime.utcnow().strftime('%Y_%m_%d')}.csv"}
    )


@app.get("/api/admin/export-payment-logs")
@limiter.limit("10/minute")
async def export_payment_logs_csv(
    request: Request,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    """Export payment logs to CSV (admin only - requires authentication)"""

    # Get all payment logs ordered by date
    payment_logs = db.query(PaymentLog).order_by(PaymentLog.created_at.desc()).all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        'Log ID',
        'Date/Time (UTC)',
        'Event Type',
        'Order ID',
        'Transaction ID',
        'Amount',
        'Currency',
        'Order Status',
        'Capture Status',
        'Payer Email',
        'IP Address',
        'Error Type',
        'Error Message',
        'PayPal Error Name',
        'PayPal Error Code',
        'PayPal Debug ID',
        'Application Reference',
        'Request Payload (JSON)',
        'Response Payload (JSON)'
    ])

    # Write data rows
    for log in payment_logs:
        # Get application reference if linked
        app_reference = 'N/A'
        if log.application_id:
            app = db.query(Application).filter(Application.id == log.application_id).first()
            if app:
                app_reference = app.session_id

        # Convert JSON payloads to strings
        request_json = json.dumps(log.request_payload) if log.request_payload else 'N/A'
        response_json = json.dumps(log.response_payload) if log.response_payload else 'N/A'

        writer.writerow([
            str(log.id),
            log.created_at.strftime('%Y-%m-%d %H:%M:%S UTC') if log.created_at else 'N/A',
            log.event_type or 'N/A',
            log.order_id or 'N/A',
            log.transaction_id or 'N/A',
            f"${log.amount:.2f}" if log.amount else 'N/A',
            log.currency or 'N/A',
            log.order_status or 'N/A',
            log.capture_status or 'N/A',
            log.payer_email or 'N/A',
            log.ip_address or 'N/A',
            log.error_type or 'N/A',
            log.error_message or 'N/A',
            log.paypal_error_name or 'N/A',
            log.paypal_error_code or 'N/A',
            log.paypal_debug_id or 'N/A',
            app_reference,
            request_json,
            response_json
        ])

    # Prepare response
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=payment_logs_{datetime.utcnow().strftime('%Y-%m-%d')}.csv"}
    )


@app.get("/api/admin/export-analytics")
@limiter.limit("10/minute")
async def export_analytics_csv(
    request: Request,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    """Export applications with card/bank data for chargeback analysis (admin only)"""

    # Query all applications with payment data
    applications = db.query(Application).order_by(Application.created_at.desc()).all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        'Reference Number',
        'Order ID',
        'Transaction ID',
        'Created At',
        'Delivered At',
        'Amount',
        'Payment Status',
        'Authorization Status',
        'Card Brand',
        'Card Last 4',
        'Card Type',
        'BIN',
        'Issuing Bank',
        'Card Country',
        'Payer Email',
        'IP Address'
    ])

    # Write data rows
    for app in applications:
        # Get card details from payment_logs response_payload
        card_brand = 'N/A'
        card_last4 = 'N/A'
        card_type = 'N/A'
        bin_number = 'N/A'
        issuing_bank = 'N/A'
        card_country = 'N/A'
        payer_email = 'N/A'
        ip_address = 'N/A'

        # Find the authorize_success or capture_success log for this order
        if app.payment_order_id:
            payment_log = db.query(PaymentLog).filter(
                PaymentLog.order_id == app.payment_order_id,
                PaymentLog.event_type.in_(['authorize_success', 'capture_success'])
            ).first()

            if payment_log:
                payer_email = payment_log.payer_email or 'N/A'
                ip_address = payment_log.ip_address or 'N/A'

                if payment_log.response_payload:
                    payload = payment_log.response_payload
                    # Extract card details from payment_source.card
                    card = payload.get('payment_source', {}).get('card', {})
                    if card:
                        card_brand = card.get('brand', 'N/A')
                        card_last4 = card.get('last_digits', 'N/A')
                        card_type = card.get('type', 'N/A')

                        bin_details = card.get('bin_details', {})
                        if bin_details:
                            bin_number = bin_details.get('bin', 'N/A')
                            issuing_bank = bin_details.get('issuing_bank', 'N/A')
                            card_country = bin_details.get('bin_country_code', 'N/A')

        writer.writerow([
            app.session_id or 'N/A',
            app.payment_order_id or 'N/A',
            app.payment_transaction_id or 'N/A',
            app.created_at.strftime('%Y-%m-%d %H:%M:%S') if app.created_at else 'N/A',
            app.fulfillment_delivered_at.strftime('%Y-%m-%d %H:%M:%S') if app.fulfillment_delivered_at else 'N/A',
            f"${app.amount_paid:.2f}" if app.amount_paid else 'N/A',
            app.payment_status or 'N/A',
            app.authorization_status or 'N/A',
            card_brand,
            card_last4,
            card_type,
            bin_number,
            issuing_bank,
            card_country,
            payer_email,
            ip_address
        ])

    # Prepare response
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=analytics_export_{datetime.utcnow().strftime('%Y-%m-%d')}.csv"}
    )


@app.get("/api/admin/payment-logs", response_model=List[PaymentLogResponse])
@limiter.limit("30/minute")
async def get_payment_logs(
    request: Request,
    limit: int = 100,
    offset: int = 0,
    order_id: Optional[str] = None,
    event_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    """
    Get payment logs with optional filters (admin only - requires authentication).

    Query parameters:
    - limit: Max number of records to return (default: 100, max: 500)
    - offset: Number of records to skip for pagination
    - order_id: Filter by PayPal order ID
    - event_type: Filter by event type (create_request, capture_success, etc.)
    - start_date: Filter logs created after this date (ISO format)
    - end_date: Filter logs created before this date (ISO format)
    """
    # Cap limit at 500
    if limit > 500:
        limit = 500

    # Build query
    query = db.query(PaymentLog)

    # Apply filters
    if order_id:
        query = query.filter(PaymentLog.order_id == order_id)

    if event_type:
        query = query.filter(PaymentLog.event_type == event_type)

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(PaymentLog.created_at >= start_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)")

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(PaymentLog.created_at <= end_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)")

    # Execute query with pagination
    logs = query.order_by(PaymentLog.created_at.desc()).offset(offset).limit(limit).all()

    # Convert to response format (convert UUIDs to strings)
    return [
        PaymentLogResponse(
            id=str(log.id),
            created_at=log.created_at,
            event_type=log.event_type,
            order_id=log.order_id,
            transaction_id=log.transaction_id,
            amount=float(log.amount) if log.amount else None,
            currency=log.currency,
            order_status=log.order_status,
            capture_status=log.capture_status,
            payer_email=log.payer_email,
            ip_address=log.ip_address,
            error_message=log.error_message,
            error_type=log.error_type,
            paypal_debug_id=log.paypal_debug_id,
            paypal_error_name=log.paypal_error_name,
            paypal_error_code=log.paypal_error_code,
            request_payload=log.request_payload,
            response_payload=log.response_payload if isinstance(log.response_payload, (dict, type(None))) else None,
            application_id=str(log.application_id) if log.application_id else None
        )
        for log in logs
    ]


@app.get("/api/admin/financial-stats", response_model=FinancialStats)
@limiter.limit("30/minute")
async def get_financial_stats(
    request: Request,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    """
    Get financial statistics for revenue dashboard (admin only - requires authentication).

    Returns:
    - Today's revenue
    - Yesterday's revenue
    - Average order value (AOV)
    - Total successful/failed payments
    - Revenue for last 7 and 30 days
    """
    from sqlalchemy import func

    now = datetime.utcnow()

    # Calculate date ranges
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    # ===== TODAY METRICS =====
    # Today captured - funds actually captured today
    today_captured = db.query(func.sum(Application.amount_paid)).filter(
        Application.captured_at >= today_start,
        Application.captured_at.isnot(None)
    ).scalar() or 0

    # Today authorized - currently held but not yet captured, authorized today
    today_authorized = db.query(func.sum(Application.amount_paid)).filter(
        Application.authorized_at >= today_start,
        Application.authorization_status.in_(['CREATED', 'PENDING']),
        Application.captured_at.is_(None)
    ).scalar() or 0

    # Today voided - authorizations cancelled today
    today_voided = db.query(func.sum(Application.amount_paid)).filter(
        Application.authorization_status == 'VOIDED',
        Application.authorized_at >= today_start
    ).scalar() or 0

    # Today failed - expired or capture failed today
    today_failed = db.query(func.sum(Application.amount_paid)).filter(
        Application.authorization_status.in_(['EXPIRED', 'CAPTURE_FAILED', 'DENIED']),
        Application.authorized_at >= today_start
    ).scalar() or 0

    # ===== YESTERDAY METRICS =====
    # Yesterday captured
    yesterday_captured = db.query(func.sum(Application.amount_paid)).filter(
        Application.captured_at >= yesterday_start,
        Application.captured_at < today_start,
        Application.captured_at.isnot(None)
    ).scalar() or 0

    # Yesterday authorized (authorized yesterday, still pending)
    yesterday_authorized = db.query(func.sum(Application.amount_paid)).filter(
        Application.authorized_at >= yesterday_start,
        Application.authorized_at < today_start,
        Application.authorization_status.in_(['CREATED', 'PENDING']),
        Application.captured_at.is_(None)
    ).scalar() or 0

    # Yesterday voided
    yesterday_voided = db.query(func.sum(Application.amount_paid)).filter(
        Application.authorization_status == 'VOIDED',
        Application.authorized_at >= yesterday_start,
        Application.authorized_at < today_start
    ).scalar() or 0

    # Yesterday failed
    yesterday_failed = db.query(func.sum(Application.amount_paid)).filter(
        Application.authorization_status.in_(['EXPIRED', 'CAPTURE_FAILED', 'DENIED']),
        Application.authorized_at >= yesterday_start,
        Application.authorized_at < today_start
    ).scalar() or 0

    # ===== 7-DAY METRICS =====
    # 7-day captured
    revenue_7_days_captured = db.query(func.sum(Application.amount_paid)).filter(
        Application.captured_at >= seven_days_ago,
        Application.captured_at.isnot(None)
    ).scalar() or 0

    # 7-day authorized (currently pending, authorized in last 7 days)
    revenue_7_days_authorized = db.query(func.sum(Application.amount_paid)).filter(
        Application.authorized_at >= seven_days_ago,
        Application.authorization_status.in_(['CREATED', 'PENDING']),
        Application.captured_at.is_(None)
    ).scalar() or 0

    # 7-day voided
    revenue_7_days_voided = db.query(func.sum(Application.amount_paid)).filter(
        Application.authorization_status == 'VOIDED',
        Application.authorized_at >= seven_days_ago
    ).scalar() or 0

    # 7-day failed
    revenue_7_days_failed = db.query(func.sum(Application.amount_paid)).filter(
        Application.authorization_status.in_(['EXPIRED', 'CAPTURE_FAILED', 'DENIED']),
        Application.authorized_at >= seven_days_ago
    ).scalar() or 0

    # ===== 30-DAY METRICS =====
    # 30-day captured
    revenue_30_days_captured = db.query(func.sum(Application.amount_paid)).filter(
        Application.captured_at >= thirty_days_ago,
        Application.captured_at.isnot(None)
    ).scalar() or 0

    # 30-day authorized (currently pending, authorized in last 30 days)
    revenue_30_days_authorized = db.query(func.sum(Application.amount_paid)).filter(
        Application.authorized_at >= thirty_days_ago,
        Application.authorization_status.in_(['CREATED', 'PENDING']),
        Application.captured_at.is_(None)
    ).scalar() or 0

    # 30-day voided
    revenue_30_days_voided = db.query(func.sum(Application.amount_paid)).filter(
        Application.authorization_status == 'VOIDED',
        Application.authorized_at >= thirty_days_ago
    ).scalar() or 0

    # 30-day failed
    revenue_30_days_failed = db.query(func.sum(Application.amount_paid)).filter(
        Application.authorization_status.in_(['EXPIRED', 'CAPTURE_FAILED', 'DENIED']),
        Application.authorized_at >= thirty_days_ago
    ).scalar() or 0

    # ===== EXISTING METRICS =====
    # Total successful payments (all time) - based on captured
    total_successful = db.query(Application).filter(
        Application.captured_at.isnot(None)
    ).count()

    # Total failed/rejected payments (all time)
    total_failed = db.query(Application).filter(
        Application.authorization_status.in_(['VOIDED', 'EXPIRED', 'CAPTURE_FAILED'])
    ).count()

    # Average Order Value (AOV) - based on captured payments
    avg_order_value = 0
    if total_successful > 0:
        total_revenue_all_time = db.query(func.sum(Application.amount_paid)).filter(
            Application.captured_at.isnot(None)
        ).scalar() or 0
        avg_order_value = float(total_revenue_all_time) / total_successful if total_successful > 0 else 0

    return FinancialStats(
        today_captured=float(today_captured),
        today_authorized=float(today_authorized),
        today_voided=float(today_voided),
        today_failed=float(today_failed),
        yesterday_captured=float(yesterday_captured),
        yesterday_authorized=float(yesterday_authorized),
        yesterday_voided=float(yesterday_voided),
        yesterday_failed=float(yesterday_failed),
        revenue_7_days_captured=float(revenue_7_days_captured),
        revenue_7_days_authorized=float(revenue_7_days_authorized),
        revenue_7_days_voided=float(revenue_7_days_voided),
        revenue_7_days_failed=float(revenue_7_days_failed),
        revenue_30_days_captured=float(revenue_30_days_captured),
        revenue_30_days_authorized=float(revenue_30_days_authorized),
        revenue_30_days_voided=float(revenue_30_days_voided),
        revenue_30_days_failed=float(revenue_30_days_failed),
        avg_order_value=round(avg_order_value, 2),
        total_successful_payments=total_successful,
        total_failed_payments=total_failed
    )


class AuthorizationSummary(BaseModel):
    id: uuid.UUID
    session_id: str
    authorization_id: Optional[str]
    authorization_status: Optional[str]
    authorized_at: Optional[datetime]
    captured_at: Optional[datetime]
    capture_id: Optional[str]
    amount_paid: Optional[float]
    fulfillment_status: str
    fulfillment_delivered_at: Optional[datetime]
    created_at: datetime
    applicant_email: Optional[str]

    class Config:
        from_attributes = True


class AuthorizationStatsResponse(BaseModel):
    pending_authorizations: int  # CREATED/PENDING, not captured
    failed_captures: int  # CAPTURE_FAILED, EXPIRED, etc.
    voided_authorizations: int  # VOIDED
    ready_for_capture: int  # Delivered 7+ days ago, not captured
    total_authorized_amount: float  # Sum of authorized (not captured) amounts
    total_captured_amount: float  # Sum of captured amounts
    applications: List[AuthorizationSummary]


@app.get("/api/admin/authorization-stats", response_model=AuthorizationStatsResponse)
@limiter.limit("30/minute")
async def get_authorization_stats(
    request: Request,
    status_filter: Optional[str] = None,  # 'pending', 'failed', 'voided', 'ready'
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    """
    Get authorization statistics and list of applications with authorization issues (admin only).

    Filters:
    - pending: CREATED or PENDING status
    - failed: CAPTURE_FAILED, EXPIRED, DENIED status
    - voided: VOIDED status
    - ready: Ready for capture (delivered 7+ days, not captured)
    """
    from sqlalchemy import func

    # Count pending authorizations (CREATED/PENDING, not captured)
    pending_count = db.query(Application).filter(
        Application.authorization_id.isnot(None),
        Application.authorization_status.in_(['CREATED', 'PENDING']),
        Application.captured_at.is_(None)
    ).count()

    # Count failed captures
    failed_count = db.query(Application).filter(
        Application.authorization_id.isnot(None),
        Application.authorization_status.in_(['CAPTURE_FAILED', 'EXPIRED', 'DENIED', 'FAILED'])
    ).count()

    # Count voided authorizations
    voided_count = db.query(Application).filter(
        Application.authorization_id.isnot(None),
        Application.authorization_status == 'VOIDED'
    ).count()

    # Count ready for capture (delivered 7+ days ago, not captured)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    ready_count = db.query(Application).filter(
        Application.authorization_id.isnot(None),
        Application.authorization_status.in_(['CREATED', 'PENDING']),
        Application.captured_at.is_(None),
        Application.fulfillment_status == 'delivered',
        Application.fulfillment_delivered_at <= seven_days_ago
    ).count()

    # Calculate total authorized amount (pending capture)
    total_authorized = db.query(func.sum(Application.amount_paid)).filter(
        Application.authorization_id.isnot(None),
        Application.authorization_status.in_(['CREATED', 'PENDING']),
        Application.captured_at.is_(None)
    ).scalar() or 0

    # Calculate total captured amount
    total_captured = db.query(func.sum(Application.amount_paid)).filter(
        Application.authorization_id.isnot(None),
        Application.captured_at.isnot(None)
    ).scalar() or 0

    # Build query for applications list based on filter
    query = db.query(Application).filter(
        Application.authorization_id.isnot(None)
    )

    if status_filter == 'pending':
        query = query.filter(
            Application.authorization_status.in_(['CREATED', 'PENDING']),
            Application.captured_at.is_(None)
        )
    elif status_filter == 'failed':
        query = query.filter(
            Application.authorization_status.in_(['CAPTURE_FAILED', 'EXPIRED', 'DENIED', 'FAILED'])
        )
    elif status_filter == 'voided':
        query = query.filter(Application.authorization_status == 'VOIDED')
    elif status_filter == 'ready':
        query = query.filter(
            Application.authorization_status.in_(['CREATED', 'PENDING']),
            Application.captured_at.is_(None),
            Application.fulfillment_status == 'delivered',
            Application.fulfillment_delivered_at <= seven_days_ago
        )
    else:
        # Default: show all with auth issues (not captured)
        query = query.filter(Application.captured_at.is_(None))

    # Order by most recent first
    applications = query.order_by(Application.created_at.desc()).limit(100).all()

    # Build response with applicant email
    app_summaries = []
    for app in applications:
        app_summaries.append(AuthorizationSummary(
            id=app.id,
            session_id=app.session_id,
            authorization_id=app.authorization_id,
            authorization_status=app.authorization_status,
            authorized_at=app.authorized_at,
            captured_at=app.captured_at,
            capture_id=app.capture_id,
            amount_paid=float(app.amount_paid) if app.amount_paid else None,
            fulfillment_status=app.fulfillment_status,
            fulfillment_delivered_at=app.fulfillment_delivered_at,
            created_at=app.created_at,
            applicant_email=app.email
        ))

    return AuthorizationStatsResponse(
        pending_authorizations=pending_count,
        failed_captures=failed_count,
        voided_authorizations=voided_count,
        ready_for_capture=ready_count,
        total_authorized_amount=float(total_authorized),
        total_captured_amount=float(total_captured),
        applications=app_summaries
    )


# ===== PayPal Endpoints =====

@app.post("/api/paypal/create-order", response_model=CreateOrderResponse)
@limiter.limit("60/minute")
async def create_paypal_order(request: Request, request_data: CreateOrderRequest, db: Session = Depends(get_db)):
    """
    Creates a PayPal order for the specified amount.
    Returns order_id and approval_url for redirect flow.
    """
    if not paypal_client:
        raise HTTPException(status_code=500, detail="PayPal is not configured")

    # Get client IP (use helper to get real IP behind Cloudflare)
    client_ip = get_real_client_ip(request)

    try:
        # Build the request
        paypal_request = OrdersCreateRequest()
        paypal_request.prefer('return=representation')

        # Set request body - Using AUTHORIZE intent for pre-authorization (hold funds without capturing)
        request_body = {
            "intent": "AUTHORIZE",
            "purchase_units": [{
                "amount": {
                    "currency_code": request_data.currency,
                    "value": request_data.amount
                },
                "description": "Canada eTA Assistance — Service Fee"
            }],
            "application_context": {
                "brand_name": "Canada eTA Service",
                "landing_page": "BILLING",
                "user_action": "PAY_NOW",
                "return_url": request_data.return_url or "http://localhost:8080/payment-success",
                "cancel_url": request_data.cancel_url or "http://localhost:8080/apply"
            }
        }
        paypal_request.request_body(request_body)

        # Log request to database
        log_payment_event(
            db=db,
            event_type="create_request",
            amount=request_data.amount,
            currency=request_data.currency,
            ip_address=client_ip,
            request_payload=request_body
        )

        # Execute request
        response = paypal_client.execute(paypal_request)

        # Extract order ID and approval URL
        order_id = response.result.id
        approval_url = None

        # Find the approval URL from links
        for link in response.result.links:
            if link.rel == "approve":
                approval_url = link.href
                break

        # Log success to database
        log_payment_event(
            db=db,
            event_type="create_success",
            order_id=order_id,
            amount=request_data.amount,
            currency=request_data.currency,
            order_status=response.result.status,
            ip_address=client_ip,
            response_payload=response.result  # Pass the object directly, let helper serialize it
        )

        return CreateOrderResponse(
            order_id=order_id,
            approval_url=approval_url,
            status=response.result.status
        )

    except Exception as e:
        # Extract PayPal error details
        error_details = extract_paypal_error_details(e)

        # Log error to database with PayPal details
        log_payment_event(
            db=db,
            event_type="create_error",
            amount=request_data.amount,
            currency=request_data.currency,
            ip_address=client_ip,
            error_message=error_details['error_message'],
            error_type=type(e).__name__,
            paypal_debug_id=error_details['debug_id'],
            paypal_error_name=error_details['error_name'],
            paypal_error_code=error_details['error_code']
        )
        raise HTTPException(status_code=500, detail=f"PayPal error: {str(e)}")


@app.post("/api/paypal/capture-order", response_model=CaptureOrderResponse)
@limiter.limit("60/minute")
async def capture_paypal_order(request: Request, request_data: CaptureOrderRequest, db: Session = Depends(get_db)):
    """
    Captures the payment after user approves on PayPal.
    Call this endpoint when user returns from PayPal.
    """
    if not paypal_client:
        raise HTTPException(status_code=500, detail="PayPal is not configured")

    # Get client IP (use helper to get real IP behind Cloudflare)
    client_ip = get_real_client_ip(request)

    try:
        # Log capture request to database
        log_payment_event(
            db=db,
            event_type="capture_request",
            order_id=request_data.order_id,
            ip_address=client_ip
        )

        # Build the request
        paypal_request = OrdersCaptureRequest(request_data.order_id)

        # Execute request
        response = paypal_client.execute(paypal_request)

        # Extract transaction details
        result = response.result
        order_status = result.status

        # Get payer email, transaction ID, and CAPTURE STATUS
        payer_email = None
        transaction_id = None
        amount = None
        currency = None
        capture_status = None  # THIS is the real payment status!

        if hasattr(result, 'payer') and hasattr(result.payer, 'email_address'):
            payer_email = result.payer.email_address

        if hasattr(result, 'purchase_units') and len(result.purchase_units) > 0:
            purchase_unit = result.purchase_units[0]

            # Get transaction ID and CAPTURE STATUS from captures
            if hasattr(purchase_unit, 'payments') and hasattr(purchase_unit.payments, 'captures'):
                if len(purchase_unit.payments.captures) > 0:
                    capture = purchase_unit.payments.captures[0]
                    transaction_id = capture.id
                    capture_status = capture.status  # CRITICAL: This is the actual payment status!

                    # Get amount and currency from capture (not from purchase_unit in capture responses)
                    if hasattr(capture, 'amount'):
                        if hasattr(capture.amount, 'value'):
                            amount = capture.amount.value
                        if hasattr(capture.amount, 'currency_code'):
                            currency = capture.amount.currency_code

        # Validate CAPTURE status - only accept COMPLETED or PENDING
        if not capture_status:
            # Log rejection to database
            log_payment_event(
                db=db,
                event_type="capture_rejected",
                order_id=request_data.order_id,
                order_status=order_status,
                ip_address=client_ip,
                error_message="No capture status found in response",
                response_payload=result  # Pass object directly
            )
            raise HTTPException(
                status_code=402,
                detail="Payment capture status not found"
            )

        if capture_status not in ["COMPLETED", "PENDING"]:
            # User-friendly error messages based on capture status
            error_messages = {
                "DECLINED": "Your payment was declined. Please check your card details and try again, or use a different payment method.",
                "FAILED": "Payment processing failed. Please try again or use a different payment method.",
                "VOIDED": "This payment was cancelled. Please try again.",
                "REFUNDED": "This payment was refunded. Please start a new payment.",
            }
            user_message = error_messages.get(
                capture_status,
                "Payment could not be completed. Please try again or use a different payment method."
            )

            # Log rejection to database
            log_payment_event(
                db=db,
                event_type="capture_rejected",
                order_id=request_data.order_id,
                transaction_id=transaction_id,
                amount=amount,
                order_status=order_status,
                capture_status=capture_status,
                payer_email=payer_email,
                ip_address=client_ip,
                error_message=f"Capture status {capture_status} not accepted (must be COMPLETED or PENDING)",
                response_payload=result  # Pass object directly
            )

            raise HTTPException(
                status_code=402,
                detail=user_message
            )

        # Payment accepted - log success to database
        log_payment_event(
            db=db,
            event_type="capture_success",
            order_id=request_data.order_id,
            transaction_id=transaction_id,
            amount=amount,
            currency=currency or "USD",  # Use extracted currency or fallback to USD
            order_status=order_status,
            capture_status=capture_status,
            payer_email=payer_email,
            ip_address=client_ip,
            response_payload=result  # Pass object directly
        )

        return CaptureOrderResponse(
            order_id=request_data.order_id,
            status=capture_status,  # Return the capture status, not order status
            payer_email=payer_email,
            transaction_id=transaction_id,
            amount=amount
        )

    except HTTPException:
        # Re-raise HTTP exceptions (like 402 payment rejected)
        raise
    except Exception as e:
        # Extract PayPal error details
        error_details = extract_paypal_error_details(e)

        # Log unexpected error to database with PayPal details
        log_payment_event(
            db=db,
            event_type="capture_error",
            order_id=request_data.order_id,
            ip_address=client_ip,
            error_message=error_details['error_message'],
            error_type=type(e).__name__,
            paypal_debug_id=error_details['debug_id'],
            paypal_error_name=error_details['error_name'],
            paypal_error_code=error_details['error_code']
        )
        raise HTTPException(status_code=500, detail=f"PayPal capture error: {str(e)}")


@app.get("/api/paypal/order/{order_id}")
@limiter.limit("60/minute")
async def get_paypal_order(request: Request, order_id: str, db: Session = Depends(get_db)):
    """
    Retrieves order details from PayPal.
    Useful for checking payment status.
    """
    if not paypal_client:
        raise HTTPException(status_code=500, detail="PayPal is not configured")

    # Get client IP
    client_ip = get_real_client_ip(request)

    try:
        # Log request to database
        log_payment_event(
            db=db,
            event_type="get_order_request",
            order_id=order_id,
            ip_address=client_ip
        )

        paypal_request = OrdersGetRequest(order_id)
        response = paypal_client.execute(paypal_request)

        # Log success to database
        log_payment_event(
            db=db,
            event_type="get_order_success",
            order_id=order_id,
            order_status=response.result.status,
            ip_address=client_ip,
            response_payload=response.result  # Pass object directly
        )

        return {
            "order_id": order_id,
            "status": response.result.status,
            "details": response.result.__dict__
        }

    except Exception as e:
        # Log error to database
        log_payment_event(
            db=db,
            event_type="get_order_error",
            order_id=order_id,
            ip_address=client_ip,
            error_message=str(e),
            error_type=type(e).__name__
        )
        raise HTTPException(status_code=500, detail=f"PayPal error: {str(e)}")


# ===== Pre-Authorization Endpoints =====

@app.post("/api/paypal/authorize-order", response_model=AuthorizeOrderResponse)
@limiter.limit("60/minute")
async def authorize_paypal_order(request: Request, request_data: AuthorizeOrderRequest, db: Session = Depends(get_db)):
    """
    Authorizes payment after user approves on PayPal.
    Funds are HELD but not captured. Returns authorization_id which must be stored.
    Use capture-authorization endpoint later to capture the funds.
    """
    if not paypal_client:
        raise HTTPException(status_code=500, detail="PayPal is not configured")

    client_ip = get_real_client_ip(request)

    try:
        # Log authorize request
        log_payment_event(
            db=db,
            event_type="authorize_request",
            order_id=request_data.order_id,
            ip_address=client_ip
        )

        # Build and execute authorize request
        paypal_request = OrdersAuthorizeRequest(request_data.order_id)
        response = paypal_client.execute(paypal_request)

        # Extract authorization details from response
        result = response.result
        order_status = result.status
        authorization_id = None
        authorization_status = None
        amount = None
        payer_email = None

        # Get payer email
        if hasattr(result, 'payer') and hasattr(result.payer, 'email_address'):
            payer_email = result.payer.email_address

        # Extract authorization from purchase_units[0].payments.authorizations[0]
        if hasattr(result, 'purchase_units') and len(result.purchase_units) > 0:
            purchase_unit = result.purchase_units[0]
            if hasattr(purchase_unit, 'payments') and hasattr(purchase_unit.payments, 'authorizations'):
                if len(purchase_unit.payments.authorizations) > 0:
                    authorization = purchase_unit.payments.authorizations[0]
                    authorization_id = authorization.id
                    authorization_status = authorization.status
                    if hasattr(authorization, 'amount') and hasattr(authorization.amount, 'value'):
                        amount = authorization.amount.value

        if not authorization_id:
            log_payment_event(
                db=db,
                event_type="authorize_error",
                order_id=request_data.order_id,
                ip_address=client_ip,
                error_message="No authorization ID found in response",
                response_payload=result
            )
            raise HTTPException(status_code=500, detail="Authorization failed - no authorization ID returned")

        # Validate authorization status
        if authorization_status not in ["CREATED", "PENDING"]:
            log_payment_event(
                db=db,
                event_type="authorize_error",
                order_id=request_data.order_id,
                ip_address=client_ip,
                error_message=f"Authorization status {authorization_status} not accepted",
                response_payload=result
            )
            raise HTTPException(status_code=402, detail=f"Authorization failed with status: {authorization_status}")

        # Log success
        log_payment_event(
            db=db,
            event_type="authorize_success",
            order_id=request_data.order_id,
            transaction_id=authorization_id,
            amount=amount,
            order_status=order_status,
            capture_status=authorization_status,  # Using capture_status field for authorization_status
            payer_email=payer_email,
            ip_address=client_ip,
            response_payload=result
        )

        return AuthorizeOrderResponse(
            order_id=request_data.order_id,
            authorization_id=authorization_id,
            status=authorization_status,
            amount=amount,
            payer_email=payer_email
        )

    except HTTPException:
        raise
    except Exception as e:
        error_details = extract_paypal_error_details(e)
        log_payment_event(
            db=db,
            event_type="authorize_error",
            order_id=request_data.order_id,
            ip_address=client_ip,
            error_message=error_details['error_message'],
            error_type=type(e).__name__,
            paypal_debug_id=error_details['debug_id'],
            paypal_error_name=error_details['error_name'],
            paypal_error_code=error_details['error_code']
        )
        raise HTTPException(status_code=500, detail=f"PayPal authorize error: {str(e)}")


@app.post("/api/paypal/capture-authorization", response_model=CaptureAuthorizationResponse)
@limiter.limit("60/minute")
async def capture_authorization(request: Request, request_data: CaptureAuthorizationRequest, db: Session = Depends(get_db)):
    """
    Captures funds from a previously authorized payment.
    Call this endpoint after service delivery (e.g., 7 days later via batch job or admin action).
    """
    if not paypal_client:
        raise HTTPException(status_code=500, detail="PayPal is not configured")

    client_ip = get_real_client_ip(request)

    try:
        # Log capture request
        log_payment_event(
            db=db,
            event_type="capture_auth_request",
            transaction_id=request_data.authorization_id,
            ip_address=client_ip
        )

        # Build capture request
        paypal_request = AuthorizationsCaptureRequest(request_data.authorization_id)

        # If partial capture amount specified, set it in request body
        if request_data.amount:
            paypal_request.request_body({
                "amount": {
                    "currency_code": "USD",
                    "value": request_data.amount
                }
            })

        # Execute capture
        response = paypal_client.execute(paypal_request)
        result = response.result

        capture_id = result.id
        capture_status = result.status
        amount = None

        if hasattr(result, 'amount') and hasattr(result.amount, 'value'):
            amount = result.amount.value

        # Validate capture status
        if capture_status not in ["COMPLETED", "PENDING"]:
            log_payment_event(
                db=db,
                event_type="capture_auth_error",
                transaction_id=request_data.authorization_id,
                ip_address=client_ip,
                error_message=f"Capture status {capture_status} not accepted",
                capture_status=capture_status,
                response_payload=result
            )
            raise HTTPException(status_code=402, detail=f"Capture failed with status: {capture_status}")

        # Log success
        log_payment_event(
            db=db,
            event_type="capture_auth_success",
            transaction_id=request_data.authorization_id,
            amount=amount,
            capture_status=capture_status,
            ip_address=client_ip,
            response_payload=result
        )

        return CaptureAuthorizationResponse(
            capture_id=capture_id,
            authorization_id=request_data.authorization_id,
            status=capture_status,
            amount=amount or "0.00"
        )

    except HTTPException:
        raise
    except Exception as e:
        error_details = extract_paypal_error_details(e)

        # Check if authorization was voided or expired
        error_msg = str(e).upper()
        if "AUTHORIZATION_VOIDED" in error_msg:
            log_payment_event(
                db=db,
                event_type="capture_auth_voided",
                transaction_id=request_data.authorization_id,
                ip_address=client_ip,
                error_message="Authorization was voided - cannot capture"
            )
            raise HTTPException(status_code=400, detail="Authorization was voided and cannot be captured")
        elif "AUTHORIZATION_EXPIRED" in error_msg:
            log_payment_event(
                db=db,
                event_type="capture_auth_expired",
                transaction_id=request_data.authorization_id,
                ip_address=client_ip,
                error_message="Authorization has expired - cannot capture"
            )
            raise HTTPException(status_code=400, detail="Authorization has expired and cannot be captured")

        log_payment_event(
            db=db,
            event_type="capture_auth_error",
            transaction_id=request_data.authorization_id,
            ip_address=client_ip,
            error_message=error_details['error_message'],
            error_type=type(e).__name__,
            paypal_debug_id=error_details['debug_id'],
            paypal_error_name=error_details['error_name'],
            paypal_error_code=error_details['error_code']
        )
        raise HTTPException(status_code=500, detail=f"PayPal capture error: {str(e)}")


@app.post("/api/paypal/void-authorization", response_model=VoidAuthorizationResponse)
@limiter.limit("60/minute")
async def void_authorization(request: Request, request_data: VoidAuthorizationRequest, db: Session = Depends(get_db)):
    """
    Voids a previously authorized payment, releasing the hold on customer's funds.
    Use this for cancellations/refunds before capture.
    """
    if not paypal_client:
        raise HTTPException(status_code=500, detail="PayPal is not configured")

    client_ip = get_real_client_ip(request)

    try:
        # Log void request
        log_payment_event(
            db=db,
            event_type="void_auth_request",
            transaction_id=request_data.authorization_id,
            ip_address=client_ip
        )

        # Build and execute void request
        paypal_request = AuthorizationsVoidRequest(request_data.authorization_id)
        response = paypal_client.execute(paypal_request)

        # Void returns 204 No Content on success, so response.result may be empty
        # Log success
        log_payment_event(
            db=db,
            event_type="void_auth_success",
            transaction_id=request_data.authorization_id,
            ip_address=client_ip
        )

        # Send refund confirmation email to customer
        try:
            application = db.query(Application).filter(
                Application.authorization_id == request_data.authorization_id
            ).first()

            if application and application.email:
                customer_email = application.email
                customer_name = f"{application.given_names or ''} {application.surname or ''}".strip() or "Applicant"
                reference_number = application.session_id
                amount_refunded = float(application.amount_paid) if application.amount_paid else 0.0

                send_refund_confirmation_email(
                    to_email=customer_email,
                    customer_name=customer_name,
                    reference_number=reference_number,
                    amount_refunded=amount_refunded
                )

                # Update authorization status in database
                application.authorization_status = "VOIDED"
                db.commit()
        except Exception as email_error:
            # Don't fail the void if email fails
            print(f"WARNING: Failed to send refund confirmation email: {str(email_error)}")

        return VoidAuthorizationResponse(
            authorization_id=request_data.authorization_id,
            status="VOIDED"
        )

    except HTTPException:
        raise
    except Exception as e:
        error_details = extract_paypal_error_details(e)
        log_payment_event(
            db=db,
            event_type="void_auth_error",
            transaction_id=request_data.authorization_id,
            ip_address=client_ip,
            error_message=error_details['error_message'],
            error_type=type(e).__name__,
            paypal_debug_id=error_details['debug_id'],
            paypal_error_name=error_details['error_name'],
            paypal_error_code=error_details['error_code']
        )
        raise HTTPException(status_code=500, detail=f"PayPal void error: {str(e)}")
