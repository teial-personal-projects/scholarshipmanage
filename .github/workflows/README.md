# GitHub Actions Workflows

## Send Reminders Workflow

The `send-reminders.yml` workflow automatically sends reminder emails for applications and collaborations on a scheduled basis.

### Setup Instructions

The workflow uses **GitHub Environments** to support multiple deployment environments (production, staging, dev). This allows you to have different API URLs for each environment while keeping the configuration organized.

Before the workflow can run, you need to set up environments and configure secrets/variables:

#### 1. Generate CRON_SECRET

Generate a secure random secret (minimum 32 characters):

**Using Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Using OpenSSL:**
```bash
openssl rand -hex 32
```

Copy the generated secret - you'll need it for both GitHub and your server environment.

#### 2. Create GitHub Environments

Go to your GitHub repository:
1. Navigate to **Settings** → **Environments**
2. Click **New environment**
3. Create the following environments:
   - `production`
   - `staging` (optional)
   - `dev` (optional)

For each environment, you can optionally configure:
- **Protection rules** (e.g., require approval for production)
- **Deployment branches** (e.g., only allow main branch to deploy to production)

#### 3. Configure Environment Variables & Secrets

For **each environment** you created, add the following:

1. Click on the environment name (e.g., "production")
2. Add **Environment Variables**:
   - Click **Add variable**
   - Name: `API_URL`
   - Value: Your API base URL for this environment (without trailing slash)

   **Example API_URL values:**
   - **production**: `https://api.yourapp.com` or `https://your-app.railway.app`
   - **staging**: `https://staging-api.yourapp.com`
   - **dev**: `https://dev-api.yourapp.com`
   - **local** (for testing): `http://localhost:3001` or use ngrok URL

3. Add **Environment Secrets**:
   - Click **Add secret**
   - Name: `CRON_SECRET`
   - Value: The secure token generated in step 1

   **Note:** You can use the same `CRON_SECRET` for all environments, or use different secrets for each environment for better security isolation.

#### 4. Configure Server Environment

Add the same `CRON_SECRET` to your server's environment variables for each deployment:

**For local development (api/.env):**
```env
CRON_SECRET=a1b2c3d4e5f6...
```

**For production/staging/dev:**
Add the `CRON_SECRET` environment variable to your hosting platform (Railway, Heroku, Vercel, etc.)

**Important:** Make sure the `CRON_SECRET` on your server matches the one in the corresponding GitHub environment.

### Schedule Configuration

The workflow is currently set to run:
- **Daily at 12:00 PM UTC** (noon) against the **production** environment
- This is **7:00 AM EST** / **4:00 AM PST**

To change the schedule, edit the cron expression in `send-reminders.yml`:

```yaml
on:
  schedule:
    - cron: '0 12 * * *'  # minute hour day-of-month month day-of-week
```

**Common schedules:**
- `'0 12 * * *'` - Daily at noon UTC
- `'0 9,17 * * *'` - Twice daily at 9 AM and 5 PM UTC
- `'0 8 * * 1-5'` - Weekdays only at 8 AM UTC
- `'0 */6 * * *'` - Every 6 hours

**Note:** Scheduled runs always use the **production** environment by default. To change this, modify the `environment:` line in the workflow file.

### Manual Testing

You can manually trigger the workflow for testing **with environment selection**:

1. Go to **Actions** tab in your GitHub repository
2. Select **Send Automated Reminders** workflow
3. Click **Run workflow** dropdown
4. **Select the environment** from the dropdown:
   - `production` - Run against production API
   - `staging` - Run against staging API
   - `dev` - Run against development API
5. Click **Run workflow** button

This allows you to:
- Test the reminder system without waiting for the scheduled time
- Test against different environments (dev/staging) before production
- Verify the integration works with your environment configuration

### Monitoring

- View workflow runs in the **Actions** tab
- Each run shows the API response and HTTP status
- Failed runs will show error details in the logs
- Set up GitHub Actions email notifications in your GitHub settings to be alerted of failures

### Troubleshooting

**Workflow fails with 401/403 error:**
- Check that `CRON_SECRET` matches between the GitHub environment secret and server environment variable
- Verify you selected the correct environment when manually triggering
- Ensure the secret is set in the specific environment, not just repository secrets

**Workflow fails with connection error:**
- Verify `API_URL` is correct in the environment variables
- Check that your API server is running and accessible
- Ensure the endpoint is `/api/cron/send-reminders`
- Verify you're using the right environment (production vs staging vs dev)

**Workflow fails with "environment not found":**
- Make sure you created the environment in Settings → Environments
- Check that the environment name matches exactly (case-sensitive)
- Default scheduled runs use "production" - ensure that environment exists

**Workflow succeeds but no emails sent:**
- Check the API server logs for the environment you ran against
- Verify reminder service is implemented (TODO 6.9.2)
- Check that there are reminders due to be sent
- Ensure you're testing against the right environment with test data

**Can't see environment variables/secrets:**
- Environment variables and secrets are only visible within their specific environment
- They don't appear in the main "Secrets and variables" → "Actions" page
- Navigate to Settings → Environments → [environment name] to see them

### Environment Best Practices

**Production Environment:**
- Add protection rules to require approval before running
- Restrict to main/master branch only
- Use production API URL and production CRON_SECRET

**Staging Environment:**
- Use staging API URL for pre-production testing
- Can use same or different CRON_SECRET than production
- No protection rules needed

**Dev Environment:**
- Use development API URL for testing
- Can be your local dev server (use ngrok for public URL)
- Can use different CRON_SECRET for isolation

### Security Notes

- **Never commit secrets to the repository**
- The `CRON_SECRET` should be at least 32 characters
- Rotate secrets periodically (update in both GitHub environment and server)
- Environment secrets are more secure than repository secrets as they provide isolation
- Consider using different `CRON_SECRET` values for each environment for better security isolation
- `API_URL` is stored as an environment variable (not secret) since it's not sensitive, but provides clean organization per environment
