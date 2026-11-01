# Phase 5B Frontend Authentication - Testing Guide

## Overview
This guide covers manual browser testing for the Phase 5B frontend authentication implementation, which integrates the Vue 3 frontend with WorkOS AuthKit backend.

## Prerequisites
✅ Backend running on http://localhost:3000  
✅ Frontend running on http://localhost:5174  
✅ WorkOS API key and Client ID configured in backend `.env`  
✅ Database migrations completed  

## Test Scenarios

### 1. Session Restoration on Page Load

**Test:** User with valid session should be automatically restored

**Steps:**
1. Make sure you're logged out (clear cookies if needed)
2. Open DevTools → Application → Cookies → localhost:5174
3. Open browser to http://localhost:5174
4. Observe sidebar during load

**Expected Result:**
- Sidebar shows "Sign In" button initially
- No errors in console
- User section does NOT show authenticated user (clean state)

---

### 2. Sign In Flow - WorkOS Redirect

**Test:** Sign in redirects to WorkOS hosted auth page

**Steps:**
1. Navigate to http://localhost:5174
2. Click "Sign In" button in sidebar
3. Observe URL change

**Expected Result:**
- Browser redirects to WorkOS authorization URL (auth.workos.com)
- URL contains client_id, redirect_uri, response_type=code
- WorkOS login/signup page displays

---

### 3. WorkOS Authentication - Email/Password

**Test:** User can authenticate with email/password

**Steps:**
1. On WorkOS auth page, enter email and password
2. Click sign in/sign up
3. Complete authentication

**Expected Result:**
- WorkOS processes authentication
- Redirects back to http://localhost:3000/auth/callback?code=...
- Backend exchanges code for user profile
- Backend creates/updates user in database
- Backend sets `wos-session` HttpOnly cookie
- Backend redirects to http://localhost:5174
- Frontend restores session automatically
- Sidebar shows user profile:
  - User avatar (from WorkOS or generated)
  - User name (firstName + lastName or email prefix)
  - User email
  - "Sign Out" button

**Check in DevTools:**
- Application → Cookies → localhost:5174 should show `wos-session` cookie
- Console should show no errors
- Network → Fetch/XHR → look for successful GET /auth/me request

---

### 4. WorkOS Authentication - Google OAuth

**Test:** User can authenticate with Google

**Steps:**
1. On WorkOS auth page, click "Sign in with Google"
2. Complete Google OAuth flow
3. Authorize DevMate application

**Expected Result:**
- Same as email/password flow above
- User profile populated from Google account
- Avatar shows Google profile image if available

---

### 5. Authenticated API Requests

**Test:** All API requests include authentication cookie

**Steps:**
1. Sign in (following Test 3 or 4)
2. Navigate to Analyze view
3. Paste code snippet and click "Analyze Code"
4. Open DevTools → Network tab
5. Find POST /api/analyze request

**Expected Result:**
- Request headers include `Cookie: wos-session=...`
- Request succeeds (200 status)
- Response contains analysis results
- Report is saved with userId

**Repeat for:**
- GET /api/reports (History view)
- GET /api/reports/:id (View specific report)
- POST /api/explain (Request explanation)
- POST /api/review-summary (Generate review summary)
- DELETE /api/reports/:id (Delete report)

---

### 6. Authentication Error Handling - Missing Code

**Test:** Handle missing authorization code

**Steps:**
1. Manually navigate to http://localhost:5174?error=missing_code

**Expected Result:**
- Red error banner appears at top of page
- Banner shows: "Authentication failed: missing authorization code"
- Banner has close button (×)
- Click × closes banner
- URL is cleaned (error param removed)

---

### 7. Authentication Error Handling - Auth Failed

**Test:** Handle authentication failure

**Steps:**
1. Manually navigate to http://localhost:5174?error=auth_failed

**Expected Result:**
- Red error banner appears
- Banner shows: "Authentication failed: could not verify your credentials"
- Banner auto-dismisses after 5 seconds OR can be manually closed
- URL is cleaned

---

### 8. Sign Out Flow

**Test:** User can sign out

**Steps:**
1. Sign in (authenticated state)
2. Click "Sign Out" button in sidebar
3. Confirm sign out in browser confirmation dialog

**Expected Result:**
- Browser confirmation appears: "Are you sure you want to sign out?"
- Click OK
- POST /auth/logout request sent
- `wos-session` cookie is cleared
- Page redirects to http://localhost:5174
- Sidebar shows "Sign In" button again
- User is in unauthenticated state

**Check in DevTools:**
- Application → Cookies → wos-session should be deleted
- Network → POST /auth/logout should show 200 status

---

### 9. Session Persistence Across Page Refresh

**Test:** Session persists after browser refresh

**Steps:**
1. Sign in (authenticated state)
2. Refresh page (F5 or Ctrl+R)
3. Observe sidebar during page load

**Expected Result:**
- Brief loading state
- Sidebar restores authenticated user automatically
- User profile displays correctly
- No re-authentication required

---

### 10. Session Expiry Handling

**Test:** Expired session is handled gracefully

**Steps:**
1. Sign in
2. Manually delete `wos-session` cookie in DevTools
3. Refresh page
4. Try to make an API request (analyze code, view history)

**Expected Result:**
- Page loads with "Sign In" button (session not found)
- API requests return 401 Unauthorized
- Frontend handles 401 gracefully (no crash)
- User can sign in again to restore access

---

### 11. Ownership Enforcement - Reports

**Test:** Users only see their own reports

**Steps:**
1. Sign in as User A
2. Analyze code and create several reports
3. Navigate to History view
4. Note report IDs
5. Sign out
6. Sign in as User B (different email)
7. Navigate to History view

**Expected Result:**
- User B's History view is EMPTY (does not see User A's reports)
- Reports list only shows reports created by User B
- Attempting to GET /api/reports/:id with User A's report ID returns 404

---

### 12. Legacy Reports (No userId)

**Test:** Reports created before auth are isolated

**Steps:**
1. Check database for reports with `userId = NULL`
2. Sign in as any user
3. Navigate to History view

**Expected Result:**
- History view does NOT show legacy reports
- Only shows reports where `userId` matches current user
- Legacy reports remain in database but isolated

---

### 13. Mobile Responsive Sidebar

**Test:** Sidebar works on mobile viewport

**Steps:**
1. Open DevTools → Toggle device toolbar
2. Select mobile device (iPhone, Pixel, etc.)
3. Test sign in flow
4. Test sidebar collapse/expand

**Expected Result:**
- Sidebar adapts to mobile width
- Sign in button remains accessible
- User profile displays correctly
- Navigation works

---

### 14. Network Failure Handling

**Test:** Handle backend unavailable

**Steps:**
1. Stop backend server
2. Refresh frontend page
3. Try to sign in

**Expected Result:**
- Sign in redirect may fail or timeout
- Error message appears if backend unreachable
- Frontend does not crash
- User can retry when backend is back

---

### 15. Concurrent Sessions

**Test:** Same user in multiple tabs

**Steps:**
1. Open http://localhost:5174 in Tab 1
2. Sign in
3. Open http://localhost:5174 in Tab 2 (same browser)
4. Verify both tabs show authenticated state
5. Sign out in Tab 1
6. Refresh Tab 2

**Expected Result:**
- Both tabs share same session cookie
- Both tabs show authenticated user initially
- After sign out in Tab 1, Tab 2 loses session on next refresh
- Session is globally signed out

---

## Environment Variables Checklist

Verify these are set in backend `.env`:

```env
WORKOS_API_KEY=sk_test_YOUR_ACTUAL_KEY
WORKOS_CLIENT_ID=client_YOUR_ACTUAL_ID
WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
WORKOS_COOKIE_PASSWORD=<32_char_secure_random_string>
FRONTEND_URL=http://localhost:5174
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
```

Verify this is set in frontend `.env` (optional, defaults to localhost:3000):

```env
VITE_API_URL=http://localhost:3000
```

---

## Browser Console Checks

**No errors should appear for:**
- Session restoration
- Sign in redirect
- Callback handling
- API requests with credentials

**Expected console logs:**
- None (clean console is ideal)
- Any informational logs from useAuth composable

---

## Database Verification

**After sign in, check database:**

```sql
-- User should be created/updated
SELECT * FROM "User" WHERE email = 'your-test-email@example.com';

-- Reports should have userId
SELECT id, "userId", "createdAt" FROM "Report" 
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'your-test-email@example.com')
ORDER BY "createdAt" DESC;
```

---

## Known Limitations

1. **No Vue Router:** Navigation is simple view state toggle, not full routing
2. **No 401 Auto-Redirect:** API 401 responses don't automatically redirect to login (can be added later)
3. **No Token Refresh:** WorkOS session has fixed expiry (handles by cookie TTL)
4. **No Multi-Factor Auth:** MFA requires WorkOS dashboard configuration (not in Phase 5B scope)

---

## Next Steps

After successful manual testing:

1. ✅ Verify all 15 test scenarios pass
2. Write automated tests (Vitest + Testing Library)
3. Add E2E tests (Playwright/Cypress)
4. Configure WorkOS production environment
5. Deploy to staging/production
6. Monitor authentication metrics

---

## Troubleshooting

### Issue: "Sign In" button does nothing
**Fix:** Check WORKOS_CLIENT_ID is set correctly in backend .env

### Issue: Redirect loop after callback
**Fix:** Verify FRONTEND_URL matches actual frontend URL

### Issue: Cookie not being set
**Fix:** 
- Check WORKOS_COOKIE_PASSWORD is 32+ characters
- Verify CORS credentials are enabled in backend
- Ensure frontend and backend are on same domain or CORS allows credentials

### Issue: Session not persisting after refresh
**Fix:**
- Check cookie is HttpOnly and has correct domain/path
- Verify cookie SameSite attribute allows your setup
- Check cookie expiry (WorkOS session TTL)

### Issue: 401 errors on all API requests
**Fix:**
- Verify wos-session cookie exists in browser
- Check backend auth middleware is correctly applied to routes
- Confirm credentials: "include" is set on all fetch calls

---

## Completion Checklist

- [ ] Backend is running and healthy
- [ ] Frontend is running and accessible
- [ ] All 15 test scenarios pass
- [ ] No console errors during auth flow
- [ ] Database shows correct user and report associations
- [ ] Ownership enforcement works (users isolated)
- [ ] Sign out clears session properly
- [ ] Session persists across page refresh
- [ ] Auth errors display correctly
- [ ] All API requests include credentials
- [ ] Mobile viewport tested
- [ ] Code is committed and pushed to GitHub

**Phase 5B Frontend Authentication Integration is COMPLETE when all items above are checked.**
