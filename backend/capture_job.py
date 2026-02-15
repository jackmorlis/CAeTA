#!/usr/bin/env python3
"""
Batch Capture Job for Pre-Authorized Payments

This script captures all authorized payments that are ready for capture.
Business rule: Capture ALL transactions 5+ days after authorization (regardless of fulfillment status)

Run via cron: 0 2 * * * /path/to/python /path/to/capture_job.py >> /var/log/capture_job.log 2>&1

Or manually: python capture_job.py
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, String, DateTime, Numeric, Date, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

# PayPal SDK imports
from paypalcheckoutsdk.core import PayPalHttpClient, SandboxEnvironment, LiveEnvironment
from paypalcheckoutsdk.payments import AuthorizationsCaptureRequest

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/var/log/capture_job.log', mode='a') if os.path.exists('/var/log') else logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("DATABASE_URL environment variable not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# PayPal setup
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox")

paypal_client = None
if PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET:
    if PAYPAL_MODE == "live":
        environment = LiveEnvironment(client_id=PAYPAL_CLIENT_ID, client_secret=PAYPAL_CLIENT_SECRET)
    else:
        environment = SandboxEnvironment(client_id=PAYPAL_CLIENT_ID, client_secret=PAYPAL_CLIENT_SECRET)
    paypal_client = PayPalHttpClient(environment)
else:
    logger.error("PayPal credentials not configured")
    sys.exit(1)


# Minimal Application model (only fields we need)
class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True)
    session_id = Column(String, unique=True, nullable=False)
    payment_status = Column(String, nullable=True)
    amount_paid = Column(Numeric(10, 2), nullable=True)
    paid_at = Column(DateTime, nullable=True)

    # Pre-authorization fields
    authorization_id = Column(String, nullable=True)
    authorization_status = Column(String, nullable=True)
    authorized_at = Column(DateTime(timezone=True), nullable=True)
    captured_at = Column(DateTime(timezone=True), nullable=True)
    capture_id = Column(String, nullable=True)

    # Fulfillment fields
    fulfillment_status = Column(String, nullable=False, default="pending")
    fulfillment_delivered_at = Column(DateTime, nullable=True)


def get_applications_ready_for_capture(db: Session, days_after_authorization: int = 5):
    """
    Get all applications that are:
    1. Have authorization_id (pre-authorized)
    2. authorization_status = 'CREATED' or 'PENDING'
    3. Not yet captured (captured_at is NULL)
    4. Authorized at least X days ago (default 5 days)
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days_after_authorization)

    applications = db.query(Application).filter(
        Application.authorization_id.isnot(None),
        Application.authorization_status.in_(['CREATED', 'PENDING']),
        Application.captured_at.is_(None),
        Application.authorized_at <= cutoff_date
    ).all()

    return applications


def capture_authorization(authorization_id: str) -> dict:
    """
    Capture funds from a PayPal authorization.
    Returns capture result or raises exception.
    """
    paypal_request = AuthorizationsCaptureRequest(authorization_id)
    response = paypal_client.execute(paypal_request)

    result = response.result
    capture_id = result.id
    capture_status = result.status
    amount = None

    if hasattr(result, 'amount') and hasattr(result.amount, 'value'):
        amount = result.amount.value

    return {
        'capture_id': capture_id,
        'status': capture_status,
        'amount': amount
    }


def process_capture(db: Session, application: Application) -> bool:
    """
    Process a single application capture.
    Returns True on success, False on failure.
    """
    try:
        logger.info(f"Capturing authorization {application.authorization_id} for {application.session_id}")

        result = capture_authorization(application.authorization_id)

        if result['status'] in ['COMPLETED', 'PENDING']:
            # Success - update application
            application.captured_at = datetime.utcnow()
            application.capture_id = result['capture_id']
            application.authorization_status = 'CAPTURED'
            application.payment_status = 'completed'
            application.paid_at = datetime.utcnow()

            db.commit()
            logger.info(f"SUCCESS: Captured {application.session_id} - Capture ID: {result['capture_id']}")
            return True
        else:
            # Unexpected status
            application.authorization_status = f"CAPTURE_FAILED_{result['status']}"
            db.commit()
            logger.error(f"FAILED: {application.session_id} - Unexpected status: {result['status']}")
            return False

    except Exception as e:
        error_msg = str(e).upper()

        # Handle specific PayPal errors
        if "AUTHORIZATION_VOIDED" in error_msg:
            application.authorization_status = 'VOIDED'
            db.commit()
            logger.warning(f"VOIDED: {application.session_id} - Authorization was already voided")
        elif "AUTHORIZATION_EXPIRED" in error_msg:
            application.authorization_status = 'EXPIRED'
            db.commit()
            logger.warning(f"EXPIRED: {application.session_id} - Authorization has expired")
        elif "AUTHORIZATION_ALREADY_CAPTURED" in error_msg:
            application.authorization_status = 'CAPTURED'
            db.commit()
            logger.warning(f"ALREADY_CAPTURED: {application.session_id} - Was already captured")
        else:
            application.authorization_status = 'CAPTURE_FAILED'
            db.commit()
            logger.error(f"ERROR: {application.session_id} - {str(e)}")

        return False


def run_capture_job(days_after_authorization: int = 5):
    """
    Main job runner.
    Finds all applications ready for capture and processes them.
    """
    logger.info("=" * 60)
    logger.info(f"CAPTURE JOB STARTED at {datetime.utcnow().isoformat()}")
    logger.info(f"Capturing authorizations {days_after_authorization}+ days old")
    logger.info("=" * 60)

    db = SessionLocal()

    try:
        # Get applications ready for capture
        applications = get_applications_ready_for_capture(db, days_after_authorization)

        logger.info(f"Found {len(applications)} applications ready for capture")

        if not applications:
            logger.info("No applications to process")
            return {
                'total': 0,
                'success': 0,
                'failed': 0,
                'errors': []
            }

        # Process each application
        success_count = 0
        failed_count = 0
        errors = []

        for app in applications:
            try:
                if process_capture(db, app):
                    success_count += 1
                else:
                    failed_count += 1
                    errors.append({
                        'session_id': app.session_id,
                        'authorization_id': app.authorization_id,
                        'status': app.authorization_status
                    })
            except Exception as e:
                failed_count += 1
                errors.append({
                    'session_id': app.session_id,
                    'authorization_id': app.authorization_id,
                    'error': str(e)
                })
                logger.error(f"Unexpected error processing {app.session_id}: {str(e)}")

        # Summary
        logger.info("=" * 60)
        logger.info("CAPTURE JOB SUMMARY")
        logger.info(f"Total processed: {len(applications)}")
        logger.info(f"Successful: {success_count}")
        logger.info(f"Failed: {failed_count}")
        if errors:
            logger.info("Failed applications:")
            for err in errors:
                logger.info(f"  - {err}")
        logger.info("=" * 60)

        return {
            'total': len(applications),
            'success': success_count,
            'failed': failed_count,
            'errors': errors
        }

    finally:
        db.close()


if __name__ == "__main__":
    # Allow overriding days via command line argument
    days = 5
    if len(sys.argv) > 1:
        try:
            days = int(sys.argv[1])
        except ValueError:
            logger.error(f"Invalid days argument: {sys.argv[1]}")
            sys.exit(1)

    result = run_capture_job(days_after_authorization=days)

    # Send email report
    try:
        from email_service import send_capture_job_report
        send_capture_job_report(result, days_after_authorization=days)
    except Exception as e:
        logger.error(f"Failed to send capture job report email: {str(e)}")

    # Exit with error code if any failures
    if result['failed'] > 0:
        sys.exit(1)
    sys.exit(0)
