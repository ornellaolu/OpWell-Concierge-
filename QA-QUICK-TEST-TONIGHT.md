# 🚀 Tonight's QA Testing - Quick Guide
**Date:** June 22, 2026
**Focus:** Verify new pricing, booking flow, and payment integration

---

## ⏱️ Quick Test Plan (30-45 minutes)

### 1. **Desktop Web Testing** (15 mins)
Visit: `https://opwellconcierge.com`

**Pricing Page (`/pricing`):**
- [ ] Title shows: "One Simple Price. Complete Care."
- [ ] See Complete Surgical Care Package: **$850**
- [ ] See Mental Wellness add-on card next to it
- [ ] **$250 is visibly crossed out** (big, obvious strikethrough)
- [ ] **"SAVE $50"** label is RED/TERRACOTTA colored
- [ ] Bariatric section is prominent:
  - [ ] Shows "Specialized Bariatric Care" badge
  - [ ] 2 columns: Initial Assessment ($250) + Ongoing ($150/session)
  - [ ] Gradient background makes it stand out
- [ ] Klarna/Afterpay mentioned (payment plans visible)

**Booking Flow (Click "Book Your Consultation"):**
1. Step 1: Fill out personal info → Click Continue
2. Step 2: Appointment Details
   - [ ] Service dropdown shows ONLY:
     - ✓ Complete Surgical Care Package ($850)
     - ✓ Labor & Delivery (New/Return)
     - ✓ Vitamin Supplementation (Initial/Follow-up)
   - [ ] NO Pre-Surgical ($490) or Post-Op ($490) options
   - [ ] NO Executive Package ($1,350)
   - [ ] Mental Wellness ADD-ON checkbox visible
   - [ ] Checkbox label: "$200 (save $50)" ✓
3. Step 3: Review/Payment
   - [ ] Without add-on: **Total = $850**
   - [ ] **WITH add-on checked:** Total = **$1,050** ✓
   - [ ] "Pay Now" button appears
   - [ ] Click Pay → Stripe checkout loads ✓

---

### 2. **Mobile Web Testing** (15 mins)
Open on iPhone/Android: `https://opwellconcierge.com`

**Layout Check:**
- [ ] Pricing cards stack vertically (1 column on mobile)
- [ ] Mental Wellness card readable
- [ ] Bariatric section text is legible
- [ ] No horizontal scrolling needed
- [ ] Buttons are finger-clickable size

**Booking Flow on Mobile:**
- [ ] All form fields touch-friendly
- [ ] Dropdown works (service selection)
- [ ] Checkbox toggles (Mental Wellness add-on)
- [ ] Total price updates when checkbox toggled
- [ ] "Pay Now" button is large/clickable

---

### 3. **Critical Payment Integration** (5 mins)
**DO NOT complete actual payment** - just verify the flow:
- [ ] Click "Pay Now"
- [ ] Stripe checkout page loads (shows Klarna option)
- [ ] See "Pay later with Klarna" option
- [ ] See credit card option
- [ ] Can close without paying (don't enter card info)

---

### 4. **Regression Check** (5 mins)
Make sure we didn't break anything:
- [ ] Homepage loads without errors
- [ ] Navigation menu works
- [ ] Blog page works
- [ ] About page works
- [ ] Labor & Delivery tab on pricing works
- [ ] Bariatric tab works
- [ ] Gift section works
- [ ] No console errors (F12 → Console)

---

## 🎯 What to VERIFY SPECIFICALLY

### Pricing Accuracy:
```
✓ Complete Surgical Care Package = $850 (ONLY option)
✓ Mental Wellness add-on = $200 (normally $250)
✓ Mental Wellness savings = $50
✓ Bariatric Initial = $250 (visible/prominent)
✓ Bariatric Quarterly = $150/session
✓ NO old prices: $490, $980, $1,350, $1,580
```

### Booking Form:
```
✓ Only shows Complete Surgical Care Package
✓ Has Mental Wellness add-on checkbox
✓ Price updates when checkbox toggled:
  - Unchecked: $850
  - Checked: $1,050
✓ Order summary reflects selection
```

### Visual Design:
```
✓ $250 strikethrough is LARGE and OBVIOUS
✓ "SAVE $50" is RED/TERRACOTTA colored
✓ Bariatric section has gradient background
✓ 2-column layout for bariatric pricing
✓ Everything is CENTERED, not full-width
```

---

## ❌ If You Find an Issue

**Document It:**
1. **What:** Describe the issue clearly
2. **Where:** Which page/step/device
3. **Expected:** What should happen
4. **Actual:** What actually happened
5. **Severity:** Critical / Major / Minor

**Example:**
> Issue: Mental Wellness checkbox doesn't update total
> Page: Booking Step 3
> Device: iPhone 12
> Expected: $850 → $1,050 when checked
> Actual: Total stays at $850
> Severity: CRITICAL

---

## ✅ SIGN-OFF CHECKLIST

- [ ] All pricing is correct ($850, $200, $250, $150)
- [ ] Booking flow works end-to-end
- [ ] Mental Wellness add-on works with pricing update
- [ ] Mobile layout is responsive
- [ ] Payment integration loads Stripe
- [ ] No regressions found
- [ ] Bariatric section is prominent

**Tester:** _____________
**Date:** _____________
**Time Spent:** _____________
**Issues Found:** [ ] None [ ] 1-2 Minor [ ] 3+ or Critical

---

## 🔗 Key URLs to Test

1. Pricing Page: https://opwellconcierge.com/pricing
2. Homepage: https://opwellconcierge.com
3. Booking: Click "Book Your Consultation" from any page

---

**Questions?** Check the full QA-CHECKLIST-WEEKLY.md for detailed testing steps.
