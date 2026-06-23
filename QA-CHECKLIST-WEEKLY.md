# OpWell Concierge - Weekly QA Checklist
**Last Updated:** June 22, 2026
**Test Date:** _____________
**Tester:** _____________

---

## ✅ CRITICAL FEATURES (Must Pass)

### Homepage
- [ ] Hero CTA "Book Your Consultation" button works
- [ ] Mobile sticky "Book Now" button appears and works
- [ ] All navigation links working
- [ ] Images load correctly
- [ ] Mobile hamburger menu opens/closes

### Pricing Page (`/pricing`)
- [ ] **NEW:** "Complete Care. One Simple Price." heading visible
- [ ] **NEW:** Mental Wellness card shows BOTH prices:
  - [ ] $200 (new price) is clear
  - [ ] ~~$250~~ (strikethrough) is large and obvious
  - [ ] "SAVE $50" label in red/terracotta color
- [ ] **NEW:** Bariatric section is visually prominent
  - [ ] "Specialized Bariatric Care" badge visible
  - [ ] 2-column layout (Initial Assessment + Ongoing)
  - [ ] Pricing clear ($250 initial, $150/session)
- [ ] All tab buttons work (Complete Care, Labor & Delivery, Bariatric, Gifts)
- [ ] Mental Wellness tab is HIDDEN
- [ ] Klarna/Afterpay messaging visible

### Booking Flow (Complete Path)
1. **Step 1 - Personal Info**
   - [ ] All fields accept input (name, email, phone, DOB, procedure, consultant)
   - [ ] "Continue" button works
   
2. **Step 2 - Appointment Details**
   - [ ] Service dropdown shows ONLY:
     - [ ] Complete Surgical Care Package ($850) ✓
     - [ ] Labor & Delivery (New/Return)
     - [ ] Vitamin Supplementation (Initial/Follow-up)
   - [ ] **NEW:** Pre-Surgical ($490) and Post-Op ($490) are GONE
   - [ ] **NEW:** Executive Package ($1,350) is GONE
   - [ ] Date and time selections work
   - [ ] **NEW:** Mental Wellness add-on checkbox appears
   - [ ] **NEW:** Mental Wellness shows: "$200 (save $50)"
   - [ ] Checkbox can be checked/unchecked
   
3. **Step 3 - Review/Payment**
   - [ ] Order summary displays correctly
   - [ ] Without Mental Wellness: $850 total
   - [ ] With Mental Wellness: $1,050 total ($850 + $200)
   - [ ] Patient info correct
   - [ ] "Pay Now" button exists
   - [ ] Stripe checkout loads (can go to payment page)

### Mobile Responsiveness
- [ ] Pricing cards stack properly (1 column on mobile)
- [ ] Bariatric section text is readable on mobile
- [ ] Booking form fields stack properly
- [ ] Buttons are clickable (touch-friendly size)
- [ ] No horizontal scrolling needed

---

## ⚠️ IMPORTANT CHECKS

### Pricing Integrity
- [ ] Complete Surgical Care Package: **$850 ONLY**
- [ ] Mental Wellness add-on: **$200 (not $215)**
- [ ] Bariatric Initial: **$250** (visible/prominent)
- [ ] Bariatric Quarterly: **$150/session**
- [ ] No old prices showing ($490, $980, $1,350, $1,580)

### Stripe Integration
- [ ] Checkout API endpoint responds (`/api/checkout`)
- [ ] Payment button triggers Stripe checkout
- [ ] Success page shows after payment (or redirects correctly)

### SEO/Meta Tags
- [ ] Meta description updated (pricing page)
- [ ] OG tags include new pricing info
- [ ] Canonical tags present

---

## 📱 MOBILE TESTING DEVICES
Test on actual devices (not just browser zoom):

**Phone:**
- [ ] iPhone/iOS
- [ ] Android

**Tablet:**
- [ ] iPad/iOS tablet
- [ ] Android tablet

**Test Scenarios:**
- [ ] Portrait orientation
- [ ] Landscape orientation
- [ ] Touch interactions (no hover states)
- [ ] Font sizes readable

---

## 🔍 REGRESSION CHECKS (Make sure we didn't break anything)

### Existing Features Still Working
- [ ] Blog page loads
- [ ] About page loads
- [ ] Contact form works
- [ ] Footer links work
- [ ] Newsletter signup (if applicable)
- [ ] FAQs expand/collapse
- [ ] Surgery prep page loads
- [ ] Recovery page loads
- [ ] Labor & Delivery tab still works
- [ ] Bariatric vitamins tab still works
- [ ] Gift section still works

### Performance
- [ ] Page loads quickly (< 3 seconds)
- [ ] No console errors (F12 → Console tab)
- [ ] No 404 errors for images
- [ ] No broken links

---

## 🚀 DEPLOYMENT CHECK

**Vercel Status:**
- [ ] Latest commit is deployed (check Vercel dashboard)
- [ ] Deployment shows "Ready" (not building or failed)
- [ ] No build errors in Vercel logs

**Live Site Check:**
- [ ] Changes visible on `opwellconcierge.com`
- [ ] Hard refresh shows new content (not cached)
- [ ] Mobile version also updated

---

## 📋 NOTES & ISSUES

**Any bugs found:**
```
1. [Issue Description]
   Status: [ ] CRITICAL [ ] MAJOR [ ] MINOR
   Fix needed: Yes / No
   
2. [Issue Description]
   Status: [ ] CRITICAL [ ] MAJOR [ ] MINOR
   Fix needed: Yes / No
```

---

## ✅ FINAL SIGN-OFF

- [ ] All critical features pass
- [ ] No regressions found
- [ ] Mobile testing complete
- [ ] Ready for production

**QA Sign-off Date:** _____________
**Approved by:** _____________

---

**Next QA Check:** _____________ (Weekly on: _____________)
