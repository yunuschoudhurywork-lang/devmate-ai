# Phase 5: WorkOS AuthKit Setup Checklist

## ✅ Completed

- [x] Install WorkOS SDK and dependencies
- [x] Update database schema with User model
- [x] Run database migration
- [x] Create authentication controllers and middleware
- [x] Update all controllers with ownership enforcement
- [x] TypeScript compilation passes
- [x] Backend build successful

## 🔧 Required Configuration (Must Complete)

### 1. Update `.env` File

Your `.env` file must have these WorkOS variables:

```env
# Existing variables
GEMINI_API_KEY=your_actual_gemini_key_from_google_ai_studio
GEMINI_MODEL=gemini-3.5-flash-lite
DATABASE_URL=postgresql://your_supabase_connection_string_here

# WorkOS AuthKit Configuration (ADD THESE)
WORKOS_API_KEY=sk_test_YOUR_ACTUAL_KEY_FROM_WORKOS_DASHBOARD
WORKOS_CLIENT_ID=client_YOUR_ACTUAL_ID_FROM_WORKOS_DASHBOARD
WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
WORKOS_COOKIE_PASSWORD=your_generated_32_character_secure_password
FRONTEND_URL=http://localhost:5174
```

**Important:** 
- Replace `sk_test_YOUR_ACTUAL_KEY_FROM_WORKOS_DASHBOARD` with your actual WorkOS API Key
- Replace `client_YOUR_ACTUAL_ID_FROM_WORKOS_DASHBOARD` with your actual WorkOS Client ID  
- Replace `your_generated_32_character_secure_password` with a secure random string

### 2. WorkOS Dashboard Configuration

Go to https://dashboard.workos.com/ and configure:

#### A. Redirect URI
1. Go to your application in the WorkOS Dashboard
2. Click the **Redirects** tab
3. Add redirect URI: `http://localhost:3000/auth/callback`
4. Save

#### B. Initiate Login URI  
1. In the same **Redirects** tab
2. Set "Initiate login URI": `http://localhost:3000/auth/login`
3. Save

#### C. Sign-out URI
1. In the same **Redirects** tab
2. Set "Sign-out URI": `http://localhost:5174` (your frontend URL)
3. Save

#### D. Enable Authentication Methods
1. Go to **Authentication** → **AuthKit** in the sidebar
2. Enable **Email + Password** authentication
3. Enable **Google OAuth** (optional but recommended)
   - Follow the prompts to configure Google OAuth
   - You'll need a Google Cloud Project with OAuth configured
4. Save changes

## 🧪 Testing Steps (After Configuration)

Once all configuration is complete:

### 1. Start Backend
```powershell
npm run dev
```

Expected output:
```
DevMate AI Phase 1 backend listening on port 3000
```

### 2. Start Frontend
```powershell
cd frontend
npm run dev
```

### 3. Test Authentication Flow
1. Open http://localhost:5174
2. Click "Sign In" in the sidebar
3. You should be redirected to WorkOS hosted login page
4. Create a new account or sign in with Google
5. After success, you should be redirected back to your app
6. You should see your name/email in the sidebar

### 4. Test Report Ownership
1. While signed in, analyze some code
2. Go to History tab - you should see your report
3. Sign out
4. Sign in with a different account
5. Go to History tab - you should NOT see the first user's reports

## 📝 Quick Reference

### Environment Variable Generation

**Cookie Password (32+ characters):**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### WorkOS Dashboard Locations
- API Keys: https://dashboard.workos.com/api-keys
- Client ID: https://dashboard.workos.com/applications  
- Redirects: https://dashboard.workos.com/applications → Your App → Redirects tab
- Auth Methods: https://dashboard.workos.com/authentication

## ⚠️ Common Issues

### "Missing required environment variable"
- Check that all WorkOS variables are in `.env`
- Make sure there are no typos in variable names
- Restart the backend server after updating `.env`

### "Redirect URI mismatch"
- Verify the redirect URI in `.env` matches what's in WorkOS Dashboard
- Must be exact match including protocol (http://)

### "Authentication failed"  
- Check that AuthKit is enabled in WorkOS Dashboard
- Verify API Key and Client ID are correct
- Check browser console for errors

### CORS Errors
- Make sure FRONTEND_URL in `.env` matches your actual frontend URL
- Backend allows both 5173 and 5174 ports

## 🎯 Success Criteria

Phase 5 is complete when:

- ✅ Backend starts without errors
- ✅ Frontend can initiate sign-in
- ✅ Users can register with email/password
- ✅ Users can sign in with Google (if configured)
- ✅ Authenticated user info shows in sidebar
- ✅ Users can sign out
- ✅ Analysis reports are saved with user ownership
- ✅ History only shows the current user's reports
- ✅ Users cannot access other users' reports

## 📚 Next Steps

After Phase 5 is working:
- Phase 6: GitHub Integration (planned)
- Phase 7: PR Review (planned)
