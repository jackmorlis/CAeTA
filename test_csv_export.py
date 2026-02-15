#!/usr/bin/env python3
"""Test script to debug CSV export issues"""

import csv
import io
from datetime import datetime, date

# Simulate the problematic part of the CSV export
def test_csv_export():
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header (same as in main.py)
    writer.writerow([
        'Reference Number',
        'Application Date',
        'Status',
        'Family/Last Name',
        'First Name',
        'Passport No.',
        'Nationality/Citizenship',
        'Date of Birth',
        'Place of Birth',
        'Gender',
        'Civil Status',
        'Occupation',
        'Country of Residence',
        'City',
        'Permanent Address',
        'Phone No.',
        'Email',
        'Direction',
        'Embarkation Port',
        'Disembarkation Port',
        'Airline',
        'Flight Date',
        'Flight No.',
        'Travel Purpose',
        'Days of Staying',
        'Sports During Stay',
        'Accommodation Type',
        'Accommodation Details',
        'Currency > $10K',
        'Has Animals/Food',
        'Has Taxable Goods',
        'Amount Paid',
        'Payment Method',
        'Payment Status',
        'Transaction ID',
        'Order ID'
    ])

    # Test with sample data that might be problematic
    test_cases = [
        # Case 1: All fields populated
        {
            'session_id': 'DRET-ABC123',
            'created_at': datetime.now(),
            'status': 'completed',
            'last_name': 'Garcia',
            'first_name': 'Carlos',
            'passport_number': 'A12345678',
            'nationality': 'USA',
            'date_of_birth': date(1990, 1, 1),
            'place_of_birth': 'United States',
            'gender': 'male',
            'civil_status': 'Single',
            'occupation': 'Private Employee',
            'country_of_residence': 'United States',
            'city': 'Miami',
            'permanent_address': '123 Ocean Drive, Miami FL',
            'phone_code': '+1',
            'phone': '555-1234',
            'email': 'test@example.com',
            'direction': 'arrival',
            'embarkation_port': 'MIA',
            'disembarkation_port': 'PUJ',
            'airline_name': 'American Airlines',
            'flight_date': date(2025, 3, 15),
            'flight_number': 'AA123',
            'travel_purpose': 'Leisure',
            'days_of_staying': 7,
            'sports_during_stay': 'None',
            'accommodation_type': 'Hotel',
            'accommodation_details': 'Barcelo Bavaro Palace, Punta Cana',
            'exceeds_money_limit': False,
            'has_animals_or_food': False,
            'has_taxable_goods': False,
            'amount_paid': 49.99,
            'payment_method': 'paypal',
            'payment_status': 'completed',
            'payment_transaction_id': 'TXN123',
            'payment_order_id': 'ORD123'
        },
        # Case 2: Some fields None/missing
        {
            'session_id': 'DRET-DEF456',
            'created_at': None,
            'status': None,
            'last_name': None,
            'first_name': 'Jane',
            'passport_number': '',
            'nationality': 'UK',
            'date_of_birth': None,
            'place_of_birth': None,
            'gender': None,
            'civil_status': None,
            'occupation': None,
            'country_of_residence': None,
            'city': None,
            'permanent_address': None,
            'phone_code': None,
            'phone': None,
            'email': None,
            'direction': None,
            'embarkation_port': None,
            'disembarkation_port': None,
            'airline_name': None,
            'flight_date': None,
            'flight_number': None,
            'travel_purpose': None,
            'days_of_staying': None,
            'sports_during_stay': None,
            'accommodation_type': None,
            'accommodation_details': None,
            'exceeds_money_limit': None,
            'has_animals_or_food': None,
            'has_taxable_goods': None,
            'amount_paid': None,
            'payment_method': None,
            'payment_status': None,
            'payment_transaction_id': None,
            'payment_order_id': None
        }
    ]

    # Try to write data rows
    for i, data in enumerate(test_cases):
        try:
            writer.writerow([
                data['session_id'],
                data['created_at'].strftime('%Y-%m-%d %H:%M:%S') if data['created_at'] else '',
                data['status'] or '',
                data['last_name'] or '',
                data['first_name'] or '',
                data['passport_number'] or '',
                data['nationality'] or '',
                data['date_of_birth'].strftime('%Y-%m-%d') if data['date_of_birth'] else '',
                data['place_of_birth'] or '',
                data['gender'].capitalize() if data['gender'] else '',
                data['civil_status'] or '',
                data['occupation'] or '',
                data['country_of_residence'] or '',
                data['city'] or '',
                data['permanent_address'] or '',
                f"{data['phone_code']} {data['phone']}" if data['phone_code'] and data['phone'] else '',
                data['email'] or '',
                data['direction'] or '',
                data['embarkation_port'] or '',
                data['disembarkation_port'] or '',
                data['airline_name'] or '',
                data['flight_date'].strftime('%Y-%m-%d') if data['flight_date'] else '',
                data['flight_number'] or 'N/A',
                data['travel_purpose'] or '',
                data['days_of_staying'] or '',
                data['sports_during_stay'] or '',
                data['accommodation_type'] or '',
                data['accommodation_details'] or 'N/A',
                'Yes' if data['exceeds_money_limit'] else 'No' if data['exceeds_money_limit'] is not None else '',
                'Yes' if data['has_animals_or_food'] else 'No' if data['has_animals_or_food'] is not None else '',
                'Yes' if data['has_taxable_goods'] else 'No' if data['has_taxable_goods'] is not None else '',
                f"${data['amount_paid']:.2f}" if data['amount_paid'] else "N/A",
                data['payment_method'] or "N/A",
                data['payment_status'] or "N/A",
                data['payment_transaction_id'] or "N/A",
                data['payment_order_id'] or "N/A"
            ])
            print(f"✅ Test case {i+1} passed")
        except Exception as e:
            print(f"❌ Test case {i+1} failed: {e}")
            import traceback
            traceback.print_exc()

    # Check output
    output.seek(0)
    content = output.getvalue()
    print(f"\n📊 CSV Generated ({len(content)} bytes)")
    print("First few lines:")
    print('\n'.join(content.split('\n')[:5]))

if __name__ == "__main__":
    test_csv_export()
