#!/usr/bin/env python3
"""
Smoke test for critical OpWell website features.
Run before deployment: python3 test-critical-features.py
"""

import re
import sys

def test_website():
    with open('index.html', 'r') as f:
        html = f.read()

    tests = [
        ('Hero "Book Your Consultation" button', r'<a[^>]*onclick="showPage\(\'schedule\'\)"[^>]*>Book Your Consultation', True),
        ('Sticky mobile CTA button', r'<button[^>]*onclick="showPage\(\'schedule\'\)"[^>]*>Book Now', True),
        ('Surgery Readiness Quiz link', r'href="/surgery-readiness-quiz.html"', True),
        ('showPage function defined', r'function showPage\(', True),
        ('Meta description tag', r'<meta name="description"', True),
        ('Viewport meta tag', r'<meta name="viewport"', True),
        ('Canonical tag', r'<link rel="canonical"', True),
        ('OG tags for social', r'<meta property="og:', True),
        ('At least one testimonial', r'Why Patients Trust OpWell', True),
        ('Favicon reference', r'<link[^>]*rel="icon"', False),
        ('H1 tags properly paired', None, True),  # Special check below
    ]

    print("\n🧪 OpWell Critical Feature Tests\n")
    print("=" * 50)

    passed = 0
    failed = 0

    for test_name, pattern, is_critical in tests:
        # Special check for H1 tags
        if test_name == 'H1 tags properly paired':
            h1_opens = html.count('<h1')
            h1_closes = html.count('</h1>')
            found = h1_opens == h1_closes and h1_opens > 0
        else:
            found = bool(re.search(pattern, html))

        status = "✅" if found else "❌"
        critical_marker = " [CRITICAL]" if is_critical else ""

        print(f"{status} {test_name}{critical_marker}")

        if found:
            passed += 1
        else:
            failed += 1
            if is_critical:
                print(f"   ⚠️  CRITICAL: {test_name} not found!")

    print("=" * 50)
    print(f"\n📊 Results: {passed} passed, {failed} failed\n")

    if failed > 0:
        print("❌ Tests failed - do not deploy")
        return False
    else:
        print("✅ All critical tests passed - safe to deploy")
        return True

if __name__ == '__main__':
    success = test_website()
    sys.exit(0 if success else 1)
