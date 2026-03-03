import os
import requests
from typing import Optional
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Mailgun configuration
MAILGUN_API_KEY = os.getenv("MAILGUN_API_KEY")
MAILGUN_DOMAIN = os.getenv("MAILGUN_DOMAIN")
MAILGUN_FROM_EMAIL = os.getenv("MAILGUN_FROM_EMAIL", f"noreply@{MAILGUN_DOMAIN}")
MAILGUN_API_URL = f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages"


def send_payment_confirmation_email(
    to_email: str,
    customer_name: str,
    reference_number: str,
    amount_paid: float = None,
    processing_option: str = None,
    travel_date: date = None
) -> bool:
    """
    Send payment confirmation email to customer

    Args:
        to_email: Customer's email address
        customer_name: Customer's name
        reference_number: Application reference number (CETA-XXXXXX)
        amount_paid: Total amount paid for the application
        processing_option: Processing option selected (standard, fast, ultra)
        travel_date: Planned travel date (for delivery tracker)

    Returns:
        bool: True if email sent successfully, False otherwise
    """

    if not MAILGUN_API_KEY or not MAILGUN_DOMAIN:
        print("❌ Mailgun not configured. Skipping email.")
        return False

    # Email subject
    subject = "Thank you for your Canada eTA Application"

    # Format amount for display
    amount_display = f"${amount_paid:.2f}" if amount_paid else "Amount not available"

    # Calculate order breakdown
    base_price = 49.99
    processing_option = processing_option or "standard"

    # Determine processing fee based on option
    processing_fees = {
        "standard": {"name": "Standard Processing", "fee": 0.00},
        "fast": {"name": "Fast Processing", "fee": 20.00},
        "ultra": {"name": "Ultra Premium", "fee": 50.00}
    }

    processing_info = processing_fees.get(processing_option, processing_fees["standard"])
    processing_name = processing_info["name"]
    processing_fee = processing_info["fee"]

    # Calculate total (or use the provided amount)
    calculated_total = base_price + processing_fee
    final_total = amount_paid if amount_paid else calculated_total

    # Calculate delivery tracker if travel date is more than 7 days away
    delivery_tracker_text = ""
    delivery_tracker_html = ""

    if travel_date:
        today = datetime.now(ZoneInfo('America/Toronto')).date()
        days_until_travel = (travel_date - today).days

        if days_until_travel > 7:
            delivery_date = travel_date - timedelta(days=7)
            delivery_date_formatted = delivery_date.strftime("%A, %b %d, %Y")
            delivery_day = delivery_date.strftime("%d")
            delivery_month = delivery_date.strftime("%b")

            delivery_tracker_text = f"""
================== DELIVERY TRACKER ==================
Est. delivery: {delivery_month} {delivery_day}, 07:00 AM

[✓] Application → [2] Waiting → [ ] Delivered

We've received your Canada eTA (Electronic Travel Authorization) application and are currently reviewing it. Your document will be delivered on {delivery_date_formatted}.

The estimated delivery date ensures that your Canada eTA will be valid on the date of your trip.
======================================================
"""

            delivery_tracker_html = f"""
            <!-- Delivery Tracker -->
            <div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                <!-- Header with progress bar and delivery date -->
                <div style="padding: 15px; border-bottom: 1px solid #e0e0e0; background-color: #ffffff;">
                    <table style="width: 100%;">
                        <tr>
                            <td style="width: 60%; vertical-align: middle;">
                                <div style="background-color: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
                                    <div style="background-color: #3b82f6; height: 8px; width: 66%; border-radius: 4px;"></div>
                                </div>
                            </td>
                            <td style="width: 10%; text-align: center; vertical-align: middle;">
                                <img src="https://flagcdn.com/w40/ca.png" alt="CA" style="width: 28px; height: 18px; border-radius: 2px;">
                            </td>
                            <td style="width: 30%; text-align: right; vertical-align: middle;">
                                <div style="border: 2px solid #1f2937; border-radius: 8px; padding: 8px 12px; display: inline-block; text-align: center;">
                                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Est. delivery</div>
                                    <div style="font-size: 20px; font-weight: bold; color: #1f2937; line-height: 1.2;">{delivery_month} {delivery_day}</div>
                                    <div style="font-size: 10px; color: #6b7280;">07:00 AM</div>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Progress steps -->
                <div style="padding: 15px; background-color: #f9fafb; text-align: center;">
                    <div style="margin-bottom: 10px;">
                        <span style="background-color: #fef3c7; color: #b45309; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">Waiting</span>
                    </div>
                    <table style="width: 100%; max-width: 350px; margin: 0 auto;">
                        <tr>
                            <td style="text-align: center; width: 33%;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #1f2937; color: white; text-align: center; line-height: 32px; font-size: 14px; margin: 0 auto;">&#10003;</div>
                                <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">Application</div>
                            </td>
                            <td style="text-align: center; width: 33%;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #1f2937; color: white; text-align: center; line-height: 32px; font-size: 14px; font-weight: bold; margin: 0 auto;">2</div>
                                <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">Waiting</div>
                            </td>
                            <td style="text-align: center; width: 33%;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #e5e7eb; color: #9ca3af; text-align: center; line-height: 32px; font-size: 14px; margin: 0 auto;">3</div>
                                <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Delivered</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Message -->
                <div style="padding: 15px; font-size: 14px; color: #374151; line-height: 1.5;">
                    <p style="margin: 0 0 8px 0;">We've received your <strong>Canada eTA</strong> (Electronic Travel Authorization) application and are currently reviewing it. Your document will be delivered on <strong>{delivery_date_formatted}</strong>.</p>
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">The estimated delivery date ensures that your Canada eTA will be valid on the date of your trip.</p>
                </div>
            </div>
"""

    # Plain text version
    text_content = f"""Hello {customer_name}

Your Canada eTA application has been received successfully.
{delivery_tracker_text}
REFERENCE NUMBER:
{reference_number}

ORDER SUMMARY:
===============================================
eTA Application Service Fee: ${base_price:.2f}
{processing_name}: ${processing_fee:.2f}
-----------------------------------------------
TOTAL AMOUNT PAID: {amount_display}
===============================================

You will receive your Canada eTA (Electronic Travel Authorization) via email as a PDF. Please have this document available when you travel to Canada.

If you need to make any changes, please use the contact form or write us an email with your reference number at help@canadaeta-support.com.

Payment:
Your transaction was successful. You will see a charge from *CANADAETA* on your bank statement.

If you have any questions or need further assistance, feel free to contact us.
You can reach out to us anytime at help@canadaeta-support.com

Wishing you a wonderful trip,
The Canada eTA Service Team
"""

    # HTML version
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #0066cc;
            margin-bottom: 30px;
        }}
        .header h1 {{
            color: #0066cc;
            margin: 0;
            font-size: 24px;
        }}
        .content {{
            margin: 20px 0;
        }}
        .reference-box {{
            background-color: #f8f9fa;
            border-left: 4px solid #0066cc;
            padding: 15px;
            margin: 20px 0;
            font-size: 16px;
        }}
        .reference-number {{
            font-size: 20px;
            font-weight: bold;
            color: #0066cc;
            letter-spacing: 1px;
        }}
        .button {{
            display: inline-block;
            padding: 12px 30px;
            background-color: #0066cc;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eeeeee;
            text-align: center;
            font-size: 14px;
            color: #666666;
        }}
        .footer a {{
            color: #0066cc;
            text-decoration: none;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>\U0001f1e8\U0001f1e6 Canada eTA</h1>
        </div>

        <div class="content">
            <p>Hello {customer_name}</p>

            <p>Your Canada eTA application has been received successfully.</p>

            {delivery_tracker_html}

            <div class="reference-box">
                <div>REFERENCE NUMBER:</div>
                <div class="reference-number">{reference_number}</div>
            </div>

            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin: 0 0 15px 0; color: #333;">Order Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px 0; color: #555;">eTA Application Service Fee</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: bold;">${base_price:.2f}</td>
                    </tr>
                    <tr style="border-bottom: 2px solid #ddd;">
                        <td style="padding: 10px 0; color: #555;">{processing_name}</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: bold;">${processing_fee:.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 15px 0 5px 0; font-weight: bold; font-size: 1.1em;">TOTAL</td>
                        <td style="padding: 15px 0 5px 0; text-align: right; font-weight: bold; font-size: 1.1em; color: #2e7d32;">{amount_display}</td>
                    </tr>
                </table>
            </div>

            <p><strong>You will receive your Canada eTA (Electronic Travel Authorization) via email as a PDF. Please have this document available when you travel to Canada.</strong></p>

            <p>If you need to make any changes, please use the contact form or write us an email with your reference number at <a href="mailto:help@canadaeta-support.com">help@canadaeta-support.com</a>.</p>

            <p><strong>Payment:</strong><br>
            Your transaction was successful. You will see a charge from <strong>*CANADAETA*</strong> on your bank statement.</p>

            <p>If you have any questions or need further assistance, feel free to contact us.<br>
            You can reach out to us anytime at <a href="mailto:help@canadaeta-support.com">help@canadaeta-support.com</a></p>
        </div>

        <div class="footer">
            <p>Wishing you a wonderful trip,<br>
            <strong>The Canada eTA Service Team</strong></p>
        </div>
    </div>
</body>
</html>
"""

    try:
        # Send email via Mailgun API with reply-to header
        response = requests.post(
            MAILGUN_API_URL,
            auth=("api", MAILGUN_API_KEY),
            data={
                "from": f"Canada eTA <{MAILGUN_FROM_EMAIL}>",
                "to": [to_email],
                "subject": subject,
                "text": text_content,
                "html": html_content,
                "h:Reply-To": "Canada eTA Support <help@canadaeta-support.com>"
            },
            timeout=10
        )

        if response.status_code == 200:
            print(f"✅ Payment confirmation email sent to {to_email}")
            return True
        else:
            print(f"❌ Failed to send email. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        return False


def send_internal_order_notification(
    reference_number: str,
    application_data: dict,
    payment_data: dict
) -> bool:
    """
    Send internal order notification to team with all application details

    Args:
        reference_number: Application reference number (CETA-XXXXXX)
        application_data: Dictionary with application details (flat structure with applicant fields)
        payment_data: Dictionary with payment information

    Returns:
        bool: True if email sent successfully, False otherwise
    """

    if not MAILGUN_API_KEY or not MAILGUN_DOMAIN:
        print("❌ Mailgun not configured. Skipping internal notification.")
        return False

    internal_emails = [os.getenv("ORDER_NOTIFICATION_EMAIL", "1-octo-orders-ca-eta-aaaatlhsks4fajo33pbbq4m2ym@octo-services.slack.com")]
    subject = f"New Canada eTA Order: {reference_number}"

    # Plain text version
    text_content = f"""NEW CANADA eTA ORDER NOTIFICATION

Reference Number: {reference_number}

=== APPLICANT DETAILS ===
Surname: {application_data.get('surname', 'N/A')}
Given Names: {application_data.get('given_names', 'N/A')}
Email: {application_data.get('email', 'N/A')}
Nationality: {application_data.get('nationality', 'N/A')}
Passport Number: {application_data.get('passport_number', 'N/A')}
Passport Country: {application_data.get('passport_country_code', 'N/A')}
Date of Birth: {application_data.get('date_of_birth', 'N/A')}
Gender: {application_data.get('gender', 'N/A')}
Travel Date: {application_data.get('travel_date', 'N/A')}

=== PAYMENT DETAILS ===
Amount Paid: ${payment_data.get('amount_paid', 'N/A')}
Payment Method: {payment_data.get('payment_method', 'N/A')}
Transaction ID: {payment_data.get('transaction_id', 'N/A')}
Payment Status: {payment_data.get('payment_status', 'N/A')}
"""

    # HTML version
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .container {{
            max-width: 800px;
            margin: 20px auto;
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            background-color: #0066cc;
            color: white;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
        }}
        .reference {{
            font-size: 18px;
            margin-top: 10px;
            font-family: monospace;
        }}
        .section {{
            margin: 25px 0;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }}
        .section h2 {{
            color: #0066cc;
            margin-top: 0;
            font-size: 18px;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 10px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        td {{
            padding: 8px 10px;
            border-bottom: 1px solid #eeeeee;
        }}
        td:first-child {{
            font-weight: bold;
            width: 200px;
        }}
        .button {{
            display: inline-block;
            padding: 12px 30px;
            background-color: #0066cc;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eeeeee;
            text-align: center;
            font-size: 14px;
            color: #666666;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>\U0001f195 New Canada eTA Order</h1>
            <div class="reference">Reference: {reference_number}</div>
        </div>

        <div class="section">
            <h2>Applicant Details</h2>
            <table>
                <tr>
                    <td>Surname:</td>
                    <td>{application_data.get('surname', 'N/A')}</td>
                </tr>
                <tr>
                    <td>Given Names:</td>
                    <td>{application_data.get('given_names', 'N/A')}</td>
                </tr>
                <tr>
                    <td>Email:</td>
                    <td>{application_data.get('email', 'N/A')}</td>
                </tr>
                <tr>
                    <td>Nationality:</td>
                    <td>{application_data.get('nationality', 'N/A')}</td>
                </tr>
                <tr>
                    <td>Passport Number:</td>
                    <td>{application_data.get('passport_number', 'N/A')}</td>
                </tr>
                <tr>
                    <td>Passport Country:</td>
                    <td>{application_data.get('passport_country_code', 'N/A')}</td>
                </tr>
                <tr>
                    <td>Date of Birth:</td>
                    <td>{application_data.get('date_of_birth', 'N/A')}</td>
                </tr>
                <tr>
                    <td>Gender:</td>
                    <td>{application_data.get('gender', 'N/A')}</td>
                </tr>
                <tr>
                    <td>Travel Date:</td>
                    <td>{application_data.get('travel_date', 'N/A')}</td>
                </tr>
            </table>
        </div>

        <div class="section">
            <h2>Payment Details</h2>
            <table>
                <tr>
                    <td>Amount Paid:</td>
                    <td><strong style="color: #28a745; font-size: 18px;">${payment_data.get('amount_paid', 'N/A')}</strong></td>
                </tr>
                <tr>
                    <td>Payment Method:</td>
                    <td>{payment_data.get('payment_method', 'N/A').upper()}</td>
                </tr>
                <tr>
                    <td>Transaction ID:</td>
                    <td style="font-family: monospace;">{payment_data.get('transaction_id', 'N/A')}</td>
                </tr>
                <tr>
                    <td>Payment Status:</td>
                    <td><span style="color: #28a745; font-weight: bold;">{payment_data.get('payment_status', 'N/A').upper()}</span></td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <p>This is an automated notification from the Canada eTA system.</p>
        </div>
    </div>
</body>
</html>
"""

    try:
        # Send email via Mailgun API
        response = requests.post(
            MAILGUN_API_URL,
            auth=("api", MAILGUN_API_KEY),
            data={
                "from": f"Canada eTA Service <{MAILGUN_FROM_EMAIL}>",
                "to": internal_emails,
                "subject": subject,
                "text": text_content,
                "html": html_content
            },
            timeout=10
        )

        if response.status_code == 200:
            print(f"✅ Internal order notification sent to {', '.join(internal_emails)}")
            return True
        else:
            print(f"❌ Failed to send internal notification. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error sending internal notification: {str(e)}")
        return False


def send_contact_form_notification(
    contact_data: dict
) -> bool:
    """
    Send contact form submission notification to internal team

    Args:
        contact_data: Dictionary with contact form details
            - first_name: Contact's first name
            - last_name: Contact's last name
            - email: Contact's email address
            - subject: Reason for contact
            - message: Message content

    Returns:
        bool: True if email sent successfully, False otherwise
    """

    if not MAILGUN_API_KEY or not MAILGUN_DOMAIN:
        print("❌ Mailgun not configured. Skipping contact form notification.")
        return False

    internal_emails = ["contact@octoservicesinc.com", "help@canadaeta-support.com", "2-octo-customer-servi-aaaar34iipzvepcbkrbe4c6nza@octo-services.slack.com"]
    subject = f"New Contact Form Submission: {contact_data.get('subject', 'General Inquiry')}"

    # Plain text version
    text_content = f"""NEW CONTACT FORM SUBMISSION

=== CONTACT DETAILS ===
Name: {contact_data.get('first_name', 'N/A')} {contact_data.get('last_name', 'N/A')}
Email: {contact_data.get('email', 'N/A')}
Subject: {contact_data.get('subject', 'N/A')}

=== MESSAGE ===
{contact_data.get('message', 'N/A')}

---
Submitted at: {contact_data.get('created_at', 'N/A')}
"""

    # HTML version
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .container {{
            max-width: 700px;
            margin: 20px auto;
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            background-color: #0066cc;
            color: white;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            margin: 0;
            font-size: 22px;
        }}
        .section {{
            margin: 25px 0;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }}
        .section h2 {{
            color: #0066cc;
            margin-top: 0;
            font-size: 18px;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 10px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        td {{
            padding: 10px;
            border-bottom: 1px solid #eeeeee;
        }}
        td:first-child {{
            font-weight: bold;
            width: 150px;
            color: #555;
        }}
        .message-box {{
            background-color: #ffffff;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
            white-space: pre-wrap;
            word-wrap: break-word;
        }}
        .button {{
            display: inline-block;
            padding: 12px 30px;
            background-color: #0066cc;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eeeeee;
            text-align: center;
            font-size: 14px;
            color: #666666;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>\U0001f4e7 New Contact Form Submission</h1>
        </div>

        <div class="section">
            <h2>Contact Details</h2>
            <table>
                <tr>
                    <td>Name:</td>
                    <td>{contact_data.get('first_name', 'N/A')} {contact_data.get('last_name', 'N/A')}</td>
                </tr>
                <tr>
                    <td>Email:</td>
                    <td><a href="mailto:{contact_data.get('email', '')}">{contact_data.get('email', 'N/A')}</a></td>
                </tr>
                <tr>
                    <td>Subject:</td>
                    <td><strong>{contact_data.get('subject', 'N/A')}</strong></td>
                </tr>
                <tr>
                    <td>Submitted:</td>
                    <td>{contact_data.get('created_at', 'N/A')}</td>
                </tr>
            </table>
        </div>

        <div class="section">
            <h2>Message</h2>
            <div class="message-box">
{contact_data.get('message', 'N/A')}
            </div>
        </div>

        <div class="footer">
            <p>This is an automated notification from the Canada eTA system.</p>
        </div>
    </div>
</body>
</html>
"""

    try:
        # Send email via Mailgun API
        response = requests.post(
            MAILGUN_API_URL,
            auth=("api", MAILGUN_API_KEY),
            data={
                "from": f"Canada eTA Service Contact <{MAILGUN_FROM_EMAIL}>",
                "to": internal_emails,
                "subject": subject,
                "text": text_content,
                "html": html_content
            },
            timeout=10
        )

        if response.status_code == 200:
            print(f"✅ Contact form notification sent to {', '.join(internal_emails)}")
            return True
        else:
            print(f"❌ Failed to send contact form notification. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error sending contact form notification: {str(e)}")
        return False


def send_contact_form_confirmation(
    to_email: str,
    customer_name: str
) -> bool:
    """
    Send contact form confirmation email to customer

    Args:
        to_email: Customer's email address
        customer_name: Customer's name (first + last)

    Returns:
        bool: True if email sent successfully, False otherwise
    """

    if not MAILGUN_API_KEY or not MAILGUN_DOMAIN:
        print("❌ Mailgun not configured. Skipping contact form confirmation.")
        return False

    # Email subject
    subject = "We've received your inquiry - Canada eTA"

    # Plain text version
    text_content = f"""Hi {customer_name},

Thanks for reaching out! We've received your inquiry and will get back to you shortly.
Our team is on it, and we aim to respond within 0-6 business hours.

Best Regards,
The Canada eTA Service Team
"""

    # HTML version
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #0066cc;
            margin-bottom: 30px;
        }}
        .header h1 {{
            color: #0066cc;
            margin: 0;
            font-size: 24px;
        }}
        .content {{
            margin: 20px 0;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eeeeee;
            text-align: center;
            font-size: 14px;
            color: #666666;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>\U0001f1e8\U0001f1e6 Canada eTA</h1>
        </div>

        <div class="content">
            <p>Hi {customer_name},</p>

            <p>Thanks for reaching out! We've received your inquiry and will get back to you shortly.<br>
            Our team is on it, and we aim to respond within 0-6 business hours.</p>
        </div>

        <div class="footer">
            <p>Best Regards,<br>
            <strong>The Canada eTA Service Team</strong></p>
        </div>
    </div>
</body>
</html>
"""

    try:
        # Send email via Mailgun API
        response = requests.post(
            MAILGUN_API_URL,
            auth=("api", MAILGUN_API_KEY),
            data={
                "from": f"Canada eTA <{MAILGUN_FROM_EMAIL}>",
                "to": [to_email],
                "subject": subject,
                "text": text_content,
                "html": html_content
            },
            timeout=10
        )

        if response.status_code == 200:
            print(f"✅ Contact form confirmation sent to {to_email}")
            return True
        else:
            print(f"❌ Failed to send contact form confirmation. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error sending contact form confirmation: {str(e)}")
        return False


def send_capture_job_report(
    job_result: dict,
    days_after_authorization: int = 5
) -> bool:
    """
    Send capture job report email to admin.

    Args:
        job_result: Dictionary with keys: total, success, failed, errors
        days_after_authorization: Number of days after authorization used for capture

    Returns:
        bool: True if email sent successfully, False otherwise
    """

    if not MAILGUN_API_KEY or not MAILGUN_DOMAIN:
        print("❌ Mailgun not configured. Skipping capture job report.")
        return False

    admin_email = "admin@octoservicesinc.com"
    subject = f"Capture Job Report - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC"

    # Build plain text report
    report = f"""
CAPTURE JOB REPORT
==================
Run Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC
Capture Rule: {days_after_authorization} days after authorization

SUMMARY
-------
Total Processed: {job_result.get('total', 0)}
Successful: {job_result.get('success', 0)}
Failed: {job_result.get('failed', 0)}
"""

    errors = job_result.get('errors', [])
    if errors:
        report += "\nFAILED APPLICATIONS\n-------------------\n"
        for err in errors:
            report += f"- Session: {err.get('session_id', 'N/A')}\n"
            report += f"  Auth ID: {err.get('authorization_id', 'N/A')}\n"
            if 'status' in err:
                report += f"  Status: {err.get('status', 'N/A')}\n"
            if 'error' in err:
                report += f"  Error: {err.get('error', 'N/A')}\n"
            report += "\n"
    else:
        report += "\nNo errors.\n"

    report += "\n==================\nEnd of Report\n"

    try:
        response = requests.post(
            MAILGUN_API_URL,
            auth=("api", MAILGUN_API_KEY),
            data={
                "from": f"Canada eTA Service <{MAILGUN_FROM_EMAIL}>",
                "to": admin_email,
                "subject": subject,
                "text": report
            },
            timeout=10
        )

        if response.status_code == 200:
            print(f"✅ Capture job report sent to {admin_email}")
            return True
        else:
            print(f"❌ Failed to send capture job report. Status: {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ Error sending capture job report: {str(e)}")
        return False


def send_refund_confirmation_email(
    to_email: str,
    customer_name: str,
    reference_number: str,
    amount_refunded: float
) -> bool:
    """
    Send refund/void confirmation email to customer when authorization is voided

    Args:
        to_email: Customer's email address
        customer_name: Customer's name
        reference_number: Application reference number (CETA-XXXXXX)
        amount_refunded: Amount that was refunded/voided

    Returns:
        bool: True if email sent successfully, False otherwise
    """

    if not MAILGUN_API_KEY or not MAILGUN_DOMAIN:
        print("❌ Mailgun not configured. Skipping refund confirmation email.")
        return False

    subject = f"Your Payment Has Been Cancelled - {reference_number}"

    amount_display = f"${amount_refunded:.2f}" if amount_refunded else "Amount not available"

    # Plain text version
    text_content = f"""Dear {customer_name},

We're writing to confirm that your payment for order {reference_number} has been cancelled.

Amount: {amount_display} USD

This will appear on your statement as either:
- A cancellation of the pending charge, OR
- A refund to your original payment method

Please note: It may take 3-5 business days for this to reflect in your account, depending on your bank or card issuer.

If you have any questions, please contact our support team at help@canadaeta-support.com

Best regards,
The Canada eTA Service Team
"""

    # HTML version
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #dc3545;
            margin-bottom: 30px;
        }}
        .header h1 {{
            color: #dc3545;
            margin: 0;
            font-size: 24px;
        }}
        .content {{
            margin: 20px 0;
        }}
        .reference-box {{
            background-color: #f8f9fa;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 20px 0;
            font-size: 16px;
        }}
        .reference-number {{
            font-size: 18px;
            font-weight: bold;
            color: #333;
            letter-spacing: 1px;
        }}
        .amount-box {{
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }}
        .amount {{
            font-size: 28px;
            font-weight: bold;
            color: #333;
        }}
        .note-box {{
            background-color: #e7f3ff;
            border: 1px solid #b6d4fe;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eeeeee;
            text-align: center;
            font-size: 14px;
            color: #666666;
        }}
        .footer a {{
            color: #0066cc;
            text-decoration: none;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Payment Cancelled</h1>
        </div>

        <div class="content">
            <p>Dear {customer_name},</p>

            <p>We're writing to confirm that your payment for the following order has been cancelled:</p>

            <div class="reference-box">
                <div>Order Reference:</div>
                <div class="reference-number">{reference_number}</div>
            </div>

            <div class="amount-box">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Amount Cancelled</div>
                <div class="amount">{amount_display} USD</div>
            </div>

            <div class="note-box">
                <p style="margin: 0 0 10px 0;"><strong>What happens next?</strong></p>
                <p style="margin: 0;">This will appear on your statement as either:</p>
                <ul style="margin: 10px 0;">
                    <li>A cancellation of the pending charge, OR</li>
                    <li>A refund to your original payment method</li>
                </ul>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
                    <strong>Please note:</strong> It may take 3-5 business days for this to reflect in your account, depending on your bank or card issuer.
                </p>
            </div>

            <p>If you have any questions, please contact our support team at <a href="mailto:help@canadaeta-support.com">help@canadaeta-support.com</a>.</p>
        </div>

        <div class="footer">
            <p>Best regards,<br>
            <strong>The Canada eTA Service Team</strong></p>
        </div>
    </div>
</body>
</html>
"""

    try:
        response = requests.post(
            MAILGUN_API_URL,
            auth=("api", MAILGUN_API_KEY),
            data={
                "from": f"Canada eTA <{MAILGUN_FROM_EMAIL}>",
                "to": [to_email],
                "subject": subject,
                "text": text_content,
                "html": html_content,
                "h:Reply-To": "Canada eTA Support <help@canadaeta-support.com>"
            },
            timeout=10
        )

        if response.status_code == 200:
            print(f"✅ Refund confirmation email sent to {to_email}")
            return True
        else:
            print(f"❌ Failed to send refund confirmation email. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error sending refund confirmation email: {str(e)}")
        return False
