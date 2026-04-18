# Email Setup Guide

This guide explains how to configure email sending for Scholarship Hub using Resend and your Cloudflare domain.

## Overview

Scholarship Hub uses [Resend](https://resend.com/) to send transactional emails for:
- Collaboration invitations to recommenders and essay reviewers
- Application deadline reminders
- Recommendation deadline notifications

## Prerequisites

- A domain purchased from Cloudflare (or any domain registrar)
- Access to Cloudflare DNS management
- A Resend account (free tier supports 3,000 emails/month)

## Step 1: Create Resend Account

1. Go to https://resend.com/
2. Sign up for a free account
3. Note your API key from the dashboard

## Step 2: Add and Verify Your Domain in Resend

### Add Domain

1. In Resend dashboard, navigate to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourscholarships.com`)
4. Click **Add**

### Configure DNS Records

Resend will provide you with DNS records to add. Go to your **Cloudflare Dashboard**:

1. Select your domain
2. Navigate to **DNS** → **Records**
3. Add the following records (exact values will be provided by Resend): (If you select "Login into Cloudflare" and authorize Resend to access your account, it'll auto populate those records)

#### SPF Record (TXT)
```
Type: TXT
Name: @ (or your domain root)
Content: v=spf1 include:_spf.resend.com ~all
TTL: Auto
```

#### DKIM Record (CNAME)
```
Type: CNAME
Name: resend._domainkey
Content: resend._domainkey.u123456.wl.sendgrid.net (Resend will provide)
TTL: Auto
```

#### Return-Path (CNAME)
```
Type: CNAME
Name: em
Content: u123456.wl.sendgrid.net (Resend will provide)
TTL: Auto
```

### Verify Domain

1. Back in Resend dashboard, click **Verify Domain**
2. Verification usually takes 1-5 minutes
3. Once verified, you'll see a green checkmark ✓

**Note:** DNS propagation can take up to 48 hours, but typically completes within minutes on Cloudflare.

## Step 3: Configure Environment Variables

### Development Environment

Create or update `api/.env.local`:

```bash
# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Email Settings
RESEND_FROM_EMAIL=noreply@scholarshipmanage.com.com
RESEND_FROM_NAME=Scholarship Hub

# App URL (used in email links)
APP_URL=http://localhost:5173
```

### Production Environment

For Railway, Vercel, or other hosting:

1. Go to your hosting dashboard
2. Navigate to Environment Variables
3. Add the following variables:

```bash
RESEND_API_KEY=re_your_production_api_key
RESEND_WEBHOOK_SECRET=whsec_your_webhook_secret
RESEND_FROM_EMAIL=noreply@yourscholarships.com
RESEND_FROM_NAME=Scholarship Hub
APP_URL=https://yourscholarships.com
```

## Step 4: Choose Your "From" Email Address

### Recommended Options

1. **No-Reply Address** (Recommended)
   ```
   RESEND_FROM_EMAIL=noreply@yourscholarships.com
   RESEND_FROM_NAME=Scholarship Hub
   ```
   - Best for transactional emails
   - Users won't try to reply

2. **Support Address**
   ```
   RESEND_FROM_EMAIL=support@yourscholarships.com
   RESEND_FROM_NAME=Scholarship Hub
   ```
   - Allows users to reply
   - Requires email forwarding setup (see below)

3. **Custom Name**
   ```
   RESEND_FROM_EMAIL=hello@yourscholarships.com
   RESEND_FROM_NAME=Your Scholarship Platform
   ```

### Email Forwarding (Optional)

If you want to receive replies (e.g., using `support@yourscholarships.com`):

1. In Cloudflare, navigate to **Email** → **Email Routing**
2. Enable Email Routing
3. Add a forwarding rule:
   - From: `support@yourscholarships.com`
   - To: `your-personal-email@gmail.com`
4. Verify your destination email

## Step 5: Test Email Sending

### Using the Test Endpoint

The application includes a test email endpoint:

```bash
# Replace with your actual API URL and valid auth token
curl -X POST http://localhost:3001/api/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{"to": "your-email@example.com"}'
```

### Expected Response

Success:
```json
{
  "success": true,
  "emailId": "abc123...",
  "message": "Test email sent successfully"
}
```

Error:
```json
{
  "error": "Email Error",
  "message": "Domain not verified"
}
```

### Common Test Email Errors

#### "Domain not verified"
- **Cause:** DNS records not configured or verified
- **Solution:** Complete Step 2 above, wait for verification

#### "API key invalid"
- **Cause:** Wrong API key or not set
- **Solution:** Check `RESEND_API_KEY` in environment variables

#### "From email not allowed"
- **Cause:** Using unverified domain in `RESEND_FROM_EMAIL`
- **Solution:** Use `yourverifieddomain.com` or `onboarding@resend.dev` (dev only)

## Step 6: Configure Webhook (Optional)

Webhooks allow you to track email delivery status.

### In Resend Dashboard

1. Navigate to **Webhooks**
2. Click **Add Endpoint**
3. Enter your webhook URL:
   ```
   https://yourscholarships.com/api/webhooks/resend
   ```
4. Select events to track:
   - ✓ email.sent
   - ✓ email.delivered
   - ✓ email.bounced
   - ✓ email.complained
5. Copy the webhook secret
6. Add to environment variables:
   ```
   RESEND_WEBHOOK_SECRET=whsec_abc123...
   ```

### Webhook Implementation

The webhook handler is already implemented in:
- [api/src/routes/webhooks.routes.ts](../api/src/routes/webhooks.routes.ts)
- [api/src/controllers/webhooks.controller.ts](../api/src/controllers/webhooks.controller.ts)
- [api/src/services/webhooks.service.ts](../api/src/services/webhooks.service.ts)

## Step 7: Production Checklist

Before going live, verify:

- [ ] Domain verified in Resend (green checkmark)
- [ ] DNS records configured in Cloudflare
- [ ] `RESEND_API_KEY` set in production environment
- [ ] `RESEND_FROM_EMAIL` uses verified domain
- [ ] `APP_URL` points to production domain
- [ ] Test email sent successfully
- [ ] Webhook configured (optional but recommended)
- [ ] Email templates look correct

## Email Templates

### Current Templates

The application includes pre-built templates for:

1. **Collaboration Invitation** - Sent when inviting recommenders/reviewers
2. **Application Deadline Reminder** - Sent 7 days before deadline
3. **Recommendation Deadline Reminder** - Sent to collaborators

### Customizing Templates

Email templates are in [api/src/services/email.service.ts](../api/src/services/email.service.ts).

To customize:
1. Locate the template function (e.g., `generateCollaborationInviteEmail`)
2. Modify the HTML/text content
3. Test changes using the test endpoint
4. Deploy

## Best Practices

### Email Deliverability

1. **Use a Professional From Name**
   ```
   RESEND_FROM_NAME=Scholarship Hub
   ```
   Not: `RESEND_FROM_NAME=John's App`

2. **Use No-Reply for Transactional Emails**
   ```
   RESEND_FROM_EMAIL=noreply@yourscholarships.com
   ```

3. **Keep Email Content Concise**
   - Include clear call-to-action buttons
   - Use simple, clean HTML
   - Avoid spam trigger words

4. **Monitor Bounce Rates**
   - Set up webhooks to track bounces
   - Remove invalid email addresses
   - Target < 2% bounce rate

### Security

1. **Never Commit API Keys**
   - Use environment variables
   - Add `.env*` to `.gitignore`

2. **Rotate Keys Regularly**
   - Generate new Resend API key quarterly
   - Update environment variables

3. **Verify Webhook Signatures**
   - Already implemented in `webhooks.service.ts`
   - Prevents unauthorized webhook calls

### Rate Limiting

Resend free tier limits:
- **3,000 emails/month**
- **100 emails/day** (soft limit)

For higher volumes, upgrade to Pro:
- **50,000 emails/month** - $20/month
- **100,000 emails/month** - $40/month

## Troubleshooting

### Emails Not Sending

1. **Check Logs**
   ```bash
   # In development
   npm run dev --workspace=@scholarship-hub/api

   # Look for errors in console
   ```

2. **Verify Configuration**
   ```bash
   # Test environment variables are loaded
   node -e "console.log(process.env.RESEND_API_KEY)"
   ```

3. **Check Resend Dashboard**
   - View **Logs** tab in Resend
   - Look for delivery failures

### Emails Going to Spam

1. **Verify All DNS Records**
   - SPF, DKIM, Return-Path must be configured
   - Use [MXToolbox](https://mxtoolbox.com/SuperTool.aspx) to verify

2. **Warm Up Your Domain**
   - Start with low volume (< 50/day)
   - Gradually increase over 2-4 weeks

3. **Improve Email Content**
   - Avoid spam trigger words ("free", "urgent", "act now")
   - Include unsubscribe link (for marketing emails)
   - Use plain text alternative

### Domain Verification Failing

1. **Check DNS Propagation**
   ```bash
   # Check if DNS records are visible
   dig TXT yourscholarships.com
   dig CNAME resend._domainkey.yourscholarships.com
   ```

2. **Wait Longer**
   - Can take up to 48 hours
   - Usually completes in 5-15 minutes on Cloudflare

3. **Verify Record Format**
   - Ensure no extra spaces in TXT records
   - CNAME records should not include `http://` or trailing `.`

## Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Email Best Practices](https://resend.com/docs/send-with-nodejs)
- [Cloudflare DNS Documentation](https://developers.cloudflare.com/dns/)
- [Email Deliverability Guide](https://postmarkapp.com/guides/email-deliverability)
- [MXToolbox - Test Email Configuration](https://mxtoolbox.com/)

## Support

If you encounter issues:

1. Check Resend Logs in dashboard
2. Review application logs for errors
3. Test with `onboarding@resend.dev` (development only)
4. Contact Resend support at support@resend.com
