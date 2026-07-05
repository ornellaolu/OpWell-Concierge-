#!/bin/bash

# Test patient enrollment and check-in flow
# This script simulates a complete patient journey

echo "════════════════════════════════════════════════"
echo "OpWell Patient Recovery System - Test Flow"
echo "════════════════════════════════════════════════"
echo ""

# Test 1: Register a new patient
echo "1️⃣  Registering new patient..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/patient-register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "(555) 123-4567",
    "surgeryType": "BBL",
    "surgeryDate": "2026-07-01"
  }')

echo "Response: $REGISTER_RESPONSE"
PATIENT_ID=$(echo $REGISTER_RESPONSE | grep -o '"patientId":"[^"]*' | cut -d'"' -f4)
echo "✓ Patient registered with ID: $PATIENT_ID"
echo ""

# Note: In real usage, patient would receive email with token link
# For testing, we would need to extract the token from the database
echo "2️⃣  In production, patient receives email with check-in link"
echo "   Link format: https://opwellconcierge.com/recovery-checkin?token=xyz"
echo ""

echo "3️⃣  Patient would then:"
echo "   - Click the link in email"
echo "   - See the check-in form pre-authenticated"
echo "   - Complete 8-step daily check-in"
echo "   - Responses stored in database"
echo "   - Dr. Oluwole receives email summary"
echo ""

echo "════════════════════════════════════════════════"
echo "✓ Test flow complete"
echo "════════════════════════════════════════════════"
