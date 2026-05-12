# OpWell Concierge — Pre-Deployment Checklist

**Use this checklist before every push to production.** Takes ~5 minutes.

---

## **Phase 1: Local Validation (2 min)**

- [ ] **Run HTML validator**
  ```bash
  .git/hooks/pre-commit
  ```
  Expected: ✅ All pre-commit checks passed

- [ ] **Run feature tests**
  ```bash
  python3 test-critical-features.py
  ```
  Expected: ✅ All critical tests passed — safe to deploy

- [ ] **Git status clean**
  ```bash
  git status
  ```
  Expected: No uncommitted changes (all changes committed)

---

## **Phase 2: Code Review (2 min)**

- [ ] **Changes reviewed** — Have someone else review your changes before merging to main
- [ ] **No unintended changes** — Review `git diff main..HEAD` to ensure only intended changes are included
- [ ] **Commit messages clear** — Recent commits have descriptive messages explaining why, not just what

---

## **Phase 3: Functional Testing (1 min)**

### Mobile Testing (iPhone or Android)
- [ ] Hero **"Book Your Consultation"** button works → goes to booking page
- [ ] Sticky mobile CTA bar appears at bottom
- [ ] **"Free Surgery Readiness Quiz"** link opens correctly
- [ ] Booking form loads and accepts input
- [ ] All page navigation works (mobile menu, links, buttons)

### Desktop Testing
- [ ] Same buttons work on desktop
- [ ] Layout looks correct (no broken sections)
- [ ] Forms are readable and functional

---

## **Phase 4: Pre-Push Verification (1 min)**

- [ ] **No sensitive data** in commit (no API keys, passwords, email addresses)
- [ ] **Images load correctly** (no broken image links)
- [ ] **Meta tags present** (title, description, og:image)
- [ ] **No console errors** when opening DevTools (F12)

---

## **Phase 5: Deployment**

```bash
# Make sure you're on main and everything is committed
git checkout main
git status  # Should say "nothing to commit"

# Push to production
git push origin main

# Verify deployment (wait 30-60 seconds for build)
curl -s -o /dev/null -w "Status: %{http_code}\n" https://opwellconcierge.com
# Expected: Status: 200
```

---

## **Phase 6: Post-Deployment Smoke Test (2 min)**

✅ **Do this immediately after deploying:**

- [ ] Visit https://opwellconcierge.com in browser
- [ ] **Hero button works** → clicking "Book Your Consultation" opens booking form
- [ ] **Sticky mobile CTA works** (on mobile, swipe up to see)
- [ ] **Booking form loads** with 3 steps visible
- [ ] **Page loads in <3 seconds** (check Network tab in DevTools)
- [ ] **No console errors** (F12 → Console tab)

---

## **If Something Goes Wrong**

**Immediate rollback (< 5 min):**
```bash
# Find the last good commit
git log --oneline | head -10

# Revert to the last known good state
git revert HEAD
git push origin main

# OR force revert to specific commit (use with caution)
git reset --hard <commit-hash>
git push -f origin main
```

---

## **Post-Deployment Monitoring (Daily)**

- [ ] Check Google Analytics for traffic drop-offs
- [ ] Monitor booking form completions
- [ ] Watch for 4xx/5xx errors in logs
- [ ] Verify no new console errors on live site

---

## **Quick Reference**

| Check | Command | Expected Result |
|-------|---------|-----------------|
| HTML valid | `.git/hooks/pre-commit` | ✅ All checks passed |
| Features work | `python3 test-critical-features.py` | ✅ All tests passed |
| No errors | `git status` | `nothing to commit` |
| Site online | `curl https://opwellconcierge.com` | Status: 200 |

---

**Last updated:** May 12, 2026  
**Created by:** Claude Code  
**Reviewed by:** Dr. Ornella Oluwole
