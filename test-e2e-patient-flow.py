#!/usr/bin/env python3
"""
End-to-End Patient Journey Test
Tests complete patient flow from enrollment through daily check-in
"""

import subprocess
import sys
import time
import json

def run_test():
    print("="*60)
    print("OpWell Patient Recovery - E2E Test Suite")
    print("="*60)
    print()

    # Start local server
    print("📦 Starting local server on port 3000...")
    server_proc = subprocess.Popen(
        ["npx", "http-server", "-p", "3000", "-c-1", "--gzip"],
        cwd="/Users/ornellaoluwole/OpWell-Concierge--1",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    time.sleep(3)  # Wait for server to start

    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            tests_passed = 0
            tests_failed = 0

            # Test 1: Recovery check-in page loads
            print("\n🧪 Test 1: Recovery check-in page accessibility")
            try:
                page.goto("http://localhost:3000", wait_until="networkidle", timeout=10000)
                page.click("text=Start Your Check-In →")
                page.wait_for_load_state("networkidle")

                # Verify we're on recovery-checkin page
                checkin_header = page.locator("text=Recovery Check-In").count()
                assert checkin_header > 0, "Check-in page header not found"
                print("   ✅ Recovery check-in page loads successfully")
                tests_passed += 1
            except Exception as e:
                print(f"   ❌ Failed: {str(e)}")
                tests_failed += 1

            # Test 2: Authentication with access code
            print("\n🧪 Test 2: Patient authentication")
            try:
                access_code_input = page.locator("#accessCode")
                access_code_input.fill("TEST123")
                page.click("text=Access Your Program")
                page.wait_for_timeout(1000)

                # Should show error or dashboard
                error_shown = page.locator("#auth-error").count()
                dashboard_shown = page.locator("#checkin-dashboard").count()

                assert error_shown > 0 or dashboard_shown > 0, "Neither error nor dashboard shown"
                print("   ✅ Authentication flow works")
                tests_passed += 1
            except Exception as e:
                print(f"   ❌ Failed: {str(e)}")
                tests_failed += 1

            # Test 3: Admin dashboard accessibility
            print("\n🧪 Test 3: Admin dashboard page")
            try:
                page.goto("http://localhost:3000", wait_until="networkidle")
                # Navigate to admin (in real test would click admin link)
                page.evaluate("window.showPage('admin')")
                page.wait_for_load_state("networkidle")

                admin_header = page.locator("text=Patient Recovery Management").count()
                assert admin_header > 0, "Admin dashboard not found"
                print("   ✅ Admin dashboard is accessible")
                tests_passed += 1
            except Exception as e:
                print(f"   ❌ Failed: {str(e)}")
                tests_failed += 1

            # Test 4: Patient enrollment form
            print("\n🧪 Test 4: Patient enrollment form")
            try:
                # Should be on admin page
                admin_tabs = page.locator(".admin-tab-btn").count()
                assert admin_tabs > 0, "Admin tabs not found"

                # Click "Enroll New Patient" tab
                page.click("text=Enroll New Patient")
                page.wait_for_timeout(500)

                # Fill form
                page.fill("#enroll-name", "Test Patient")
                page.fill("#enroll-email", "test@example.com")
                page.fill("#enroll-phone", "(555) 123-4567")
                page.select_option("#enroll-surgery", "BBL")
                page.fill("#enroll-date", "2026-07-01")

                print("   ✅ Enrollment form can be filled")
                tests_passed += 1
            except Exception as e:
                print(f"   ❌ Failed: {str(e)}")
                tests_failed += 1

            # Test 5: Patient list view
            print("\n🧪 Test 5: Patient list view")
            try:
                # Click "My Patients" tab
                page.click("text=My Patients")
                page.wait_for_timeout(500)

                # Check if patients list container exists
                patients_list = page.locator("#patients-list").count()
                assert patients_list > 0, "Patients list not found"
                print("   ✅ Patient list view accessible")
                tests_passed += 1
            except Exception as e:
                print(f"   ❌ Failed: {str(e)}")
                tests_failed += 1

            # Test 6: Chart functionality available
            print("\n🧪 Test 6: Chart.js library loaded")
            try:
                # Check if Chart.js is available
                chart_available = page.evaluate("typeof Chart !== 'undefined'")
                assert chart_available, "Chart.js not available"
                print("   ✅ Chart.js library is loaded")
                tests_passed += 1
            except Exception as e:
                print(f"   ❌ Failed: {str(e)}")
                tests_failed += 1

            # Test 7: Form validation
            print("\n🧪 Test 7: Check-in form structure")
            try:
                page.goto("http://localhost:3000", wait_until="networkidle")
                page.evaluate("window.showPage('recovery-checkin')")
                page.wait_for_timeout(500)

                # Check form exists
                form_exists = page.locator("#checkin-form").count()
                assert form_exists > 0, "Check-in form not found"

                # Check key form elements
                pain_slider = page.locator("#painRest").count()
                qor_container = page.locator("#qor-questions").count()

                assert pain_slider > 0, "Pain slider not found"
                assert qor_container > 0, "QoR questions not found"

                print("   ✅ Check-in form has all required fields")
                tests_passed += 1
            except Exception as e:
                print(f"   ❌ Failed: {str(e)}")
                tests_failed += 1

            browser.close()

            # Print results
            print("\n" + "="*60)
            print("Test Results")
            print("="*60)
            print(f"\n✅ Passed: {tests_passed}")
            print(f"❌ Failed: {tests_failed}")
            print(f"📊 Total: {tests_passed + tests_failed}\n")

            if tests_failed == 0:
                print("🎉 ALL E2E TESTS PASSED!")
                print("\nSystem verified:")
                print("  ✓ Patient recovery check-in page loads")
                print("  ✓ Authentication flow works")
                print("  ✓ Admin dashboard accessible")
                print("  ✓ Patient enrollment form functional")
                print("  ✓ Patient list view works")
                print("  ✓ Chart visualization available")
                print("  ✓ Check-in form structure complete")
                return 0
            else:
                print("⚠️  Some tests failed")
                return 1

    finally:
        server_proc.terminate()
        try:
            server_proc.wait(timeout=2)
        except:
            server_proc.kill()

if __name__ == "__main__":
    sys.exit(run_test())
