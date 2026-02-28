# EPIC 5: SSO Authentication — Implementation Plan

## Overview
Add Google and Facebook OAuth alongside existing email/password auth using Passport.js with a server-side redirect flow. The flow is: user clicks "Sign in with Google" → redirected to Google → Google calls back to our server → server issues JWT → client receives token.

---

## Architecture Decision: Server-Side Redirect Flow

**Why not client-side (Google Identity Services SDK)?**
- Our existing auth is fully JWT-based on the server
- Server-side keeps OAuth secrets off the client
- Works through our nginx proxy without any CSP/CORS issues
- Passport.js is the de facto standard for Node.js

**Flow:**
```
1. User clicks "Sign in with Google" on login page
2. Browser → GET /api/oauth/google → Passport redirects to Google
3. User grants consent on Google
4. Google → GET /api/oauth/google/callback → Passport receives profile
5. Server creates/finds user, generates JWT
6. Server redirects to CLIENT_URL/oauth-callback?token=xxx&user_name=xxx
7. React reads query params, stores in localStorage, navigates to /
```

---

## Files to Create

### 1. `config/passport.js` — Passport strategies
- Google OAuth 2.0 strategy
- Facebook OAuth strategy
- Both strategies: find-or-create user logic, account linking by email

### 2. `routes/api/oauth.js` — OAuth routes
- `GET /api/oauth/google` — initiate Google login
- `GET /api/oauth/google/callback` — Google callback
- `GET /api/oauth/facebook` — initiate Facebook login
- `GET /api/oauth/facebook/callback` — Facebook callback
- On success: redirect to `CLIENT_URL/oauth-callback?token=xxx&user_name=xxx`
- On failure: redirect to `CLIENT_URL/login?error=oauth_failed`

### 3. `client/src/components/authPage/OAuthCallback.jsx` — New component
- Reads `token` and `user_name` from URL query params
- Calls `useAuth().login()` to store in localStorage
- Redirects to `/` (home page)
- Shows loading spinner while processing

---

## Files to Modify

### 4. `models/User.js` — Make password optional, add OAuth fields
- `password`: change from `required: true` to `required: false`
- Add `provider`: `{ type: String, enum: ['local', 'google', 'facebook'], default: 'local' }`
- Add `providerId`: `{ type: String, default: null }`
- Keep existing unique constraint on `email`

### 5. `server.js` — Initialize Passport, mount OAuth routes
- `require('passport')` + `app.use(passport.initialize())`
- Mount OAuth routes: `app.use("/api/oauth", require("./routes/api/oauth"))`
- Apply rate limiter to `/api/oauth` as well
- Update CSP: add `accounts.google.com` and `facebook.com` to `connectSrc` and `formAction`

### 6. `routes/api/auth.js` — Guard bcrypt compare for OAuth users
- When logging in with email/password, if user has no password (OAuth-only), return "Please use Google/Facebook to sign in"
- Remove unused `config` import (pre-existing test fix)

### 7. `routes/api/users.js` — Prevent duplicate email registration
- If email already exists with OAuth provider, tell user to use that provider instead
- Remove unused `config` import (pre-existing test fix)

### 8. `client/src/components/authPage/AuthPage.js` — Add social buttons
- Add "Sign in with Google" and "Sign in with Facebook" buttons
- Add divider ("or sign in with email")
- Buttons simply navigate to `/api/oauth/google` and `/api/oauth/facebook`

### 9. `client/src/components/authPage/RegisterPage.jsx` — Add social buttons
- Same social buttons as AuthPage (sign up flow is identical for OAuth)
- Add divider ("or create account with email")

### 10. `client/src/App.js` — Add OAuth callback route
- Add `<Route path="/oauth-callback" element={<OAuthCallback />} />`

### 11. `client/src/App.scss` — Social button styles
- `.social-divider` — "OR" divider between social and email login
- `.btn-google` — Google branded button (white bg, Google colors)
- `.btn-facebook` — Facebook branded button (blue bg)
- `.social-buttons` — container for social login buttons

### 12. `.env.example` — Add OAuth env vars
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_CALLBACK_URL`
- `CLIENT_URL`

### 13. `package.json` — Add dependencies
- `passport`, `passport-google-oauth20`, `passport-facebook`

---

## Pre-existing Test Fixes (bundled in this PR)

### 14. Remove unused `config` import
- `routes/api/users.js` line 6: `const config = require("config");` → remove
- `routes/api/auth.js` line 5: `const config = require("config");` → remove
- `middleware/auth.js` line 1: `const config = require("config");` → remove

---

## Account Linking Logic (in `config/passport.js`)

```
When Google/Facebook returns a profile with email:
1. Find user by email
2. If user exists:
   a. If same provider → return existing user
   b. If different provider (e.g., local) → link account:
      - Set user.provider to original (keep 'local' if they had password)
      - Store providerId for the new OAuth provider
      - Return existing user
3. If user doesn't exist:
   - Create new user with provider='google'/'facebook', no password
   - Use OAuth profile name and avatar
```

---

## .env Variables Needed

**Local development (`.env`):**
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/oauth/google/callback
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:4000/api/oauth/facebook/callback
CLIENT_URL=http://localhost:3000
```

**Production EC2 (`.env`):**
```
GOOGLE_CALLBACK_URL=https://52patta.in/api/oauth/google/callback
FACEBOOK_CALLBACK_URL=https://52patta.in/api/oauth/facebook/callback
CLIENT_URL=https://52patta.in
```

---

## Implementation Order

1. Install dependencies (`passport`, `passport-google-oauth20`, `passport-facebook`)
2. Update User model (password optional, add provider/providerId)
3. Create `config/passport.js` with strategies
4. Create `routes/api/oauth.js` with routes
5. Update `server.js` (Passport init, mount routes, CSP)
6. Guard `routes/api/auth.js` for OAuth-only users
7. Fix unused imports (users.js, auth.js, middleware/auth.js)
8. Create `OAuthCallback.jsx` component
9. Update `App.js` with callback route
10. Update `AuthPage.js` and `RegisterPage.jsx` with social buttons
11. Update `App.scss` with social button styles
12. Update `.env.example` with new vars
13. Test locally with Google OAuth
