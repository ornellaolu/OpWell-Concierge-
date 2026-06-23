#!/usr/bin/env python3
"""
OpWell Concierge - Booking Flow QA Test
Tests pricing, booking form, and key functionality
Run before weekly QA: python3 test-booking-flow.py
"""

import re
import sys

def test_pricing_and_booking():
    with open('index.html', 'r') as f:
        html = f.read()

    tests = [
        # PRICING PAGE TESTS
        ('Pricing page: "Complete Care. One Simple Price."', r'Complete Care\. One Simple Price', True),
        ('Pricing page: Complete Surgical Care Package $850', r'Complete Surgical Care Package.*\$850', True),
        ('Pricing page: Mental Wellness $200 price', r'Mental Wellness.*\$200', True),
        ('Pricing page: Mental Wellness $250 strikethrough', r'<del>\$250</del>', True),
        ('Pricing page: SAVE $50 label', r'[Ss]ave \$50|SAVE \$50', True),
        ('Pricing page: Bariatric section visible', r'Special for Bariatric Surgery Patients|Vitamin Monitoring for Weight-Loss Surgery', True),
        ('Pricing page: Klarna/Afterpay mentioned', r'Klarna|Afterpay', True),

        # BOOKING FORM TESTS
        ('Booking: Complete Surgical Care Package ($850) in dropdown', r"'Complete Surgical Care Package \(\$850\)'", True),
        ('Booking: Pre-Surgical $490 should NOT be in dropdown', r"'Pre-Surgical Consultation \(\$490\)'", False),
        ('Booking: Post-Operative $490 should NOT be in dropdown', r"'Post-Operative Care \(\$490\)'", False),
        ('Booking: Executive $1,350 should NOT be in dropdown', r"'Executive Package.*\$1,350'", False),

        # MENTAL WELLNESS ADD-ON TESTS
        ('Booking: Mental Wellness add-on checkbox exists', r"id=['\"]s2-addon-mh['\"]", True),
        ('Booking: Mental Wellness $200 price in form', r"Mental Wellness.*\$200|'Mental Wellness.*Bundle.*': 200", True),
        ('Booking: Save $50 on Mental Wellness add-on', r"save \$50|SAVE \$50", True),

        # CRITICAL JAVASCRIPT TESTS
        ('Booking: schedServices object defined', r'var schedServices = \{', True),
        ('Booking: SCHED_PRICES object updated', r"'Complete Surgical Care Package': 850", True),
        ('Booking: Mental Wellness Bundle Add-On price $200', r"'Mental Wellness.*Bundle.*': 200", True),
        ('Booking: Mental Wellness Single Session $250', r"'Mental Wellness.*Single Session': 250", True),

        # CHECKOUT TESTS
        ('Checkout: /api/checkout endpoint configured', r"'/api/checkout'", True),
        ('Checkout: Stripe integration present', r'stripe|Stripe', True),
        ('Checkout: Pay button exists', r"<button[^>]*id=['\"]s3-pay-btn['\"]", True),

        # UI/UX TESTS
        ('UI: Pricing grid is centered', r'max-width: 900px|max-width:900px', True),
        ('UI: Package section has max-width', r'package-section.*max-width.*1200px|max-width.*1200px.*package-section', True),
        ('UI: Mental Wellness tab is hidden', r'#prtab-mental.*display: none|display:none.*#prtab-mental', True),

        # BARIATRIC SECTION TESTS
        ('Bariatric: "Specialized Bariatric Care" badge', r'Specialized Bariatric Care', True),
        ('Bariatric: Initial Vitamin Assessment $250', r'Initial.*Assessment.*\$250|Initial Vitamin Assessment.*\$250', True),
        ('Bariatric: Quarterly Follow-Up $150', r'Quarterly|Follow-Up.*\$150', True),
    ]

    print("\n🧪 OpWell Booking Flow & Pricing QA Tests\n")
    print("=" * 70)

    passed = 0
    failed = 0
    warnings = 0

    for test_name, pattern, should_exist in tests:
        found = bool(re.search(pattern, html, re.DOTALL | re.IGNORECASE))

        # Invert for negative tests
        if not should_exist:
            found = not found

        if found:
            status = "✅"
            passed += 1
        else:
            status = "❌"
            failed += 1

        critical_marker = " [CRITICAL]" if should_exist else " [REGRESSION]"
        print(f"{status} {test_name}{critical_marker}")

    print("=" * 70)
    print(f"\n📊 Results: {passed} passed, {failed} failed\n")

    if failed > 0:
        print("❌ TESTS FAILED - Review issues before deployment")
        return False
    else:
        print("✅ ALL TESTS PASSED - Ready for QA testing")
        return True

if __name__ == '__main__':
    success = test_pricing_and_booking()
    sys.exit(0 if success else 1)
