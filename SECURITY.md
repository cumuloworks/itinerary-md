# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in TripMD Studio, please report it responsibly:

1. **DO NOT** open a public issue
2. Send details to the maintainers through private channels
3. Allow reasonable time for a fix before public disclosure

## Security Measures

### Current Implementation

- ✅ XSS Protection through React's automatic escaping
- ✅ CSRF Protection via origin checking
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ HTTPS-only external connections
- ✅ Input validation and sanitization
- ✅ No sensitive data storage in localStorage
- ✅ Regular dependency updates

### Best Practices for Contributors

1. **Dependencies**
   - Run `npm audit` before committing
   - Keep dependencies up-to-date
   - Review security advisories

2. **Code Review**
   - Never use `dangerouslySetInnerHTML`
   - Avoid `eval()` and `Function()` constructors
   - Validate and sanitize all user inputs
   - Use HTTPS for all external resources

3. **Environment Variables**
   - Never commit `.env` files with real values
   - Use `.env.example` for documentation
   - Prefix public variables with `PUBLIC_`

## Security Headers

The application implements the following security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (restrictive policy)
- `Permissions-Policy` (minimal permissions)