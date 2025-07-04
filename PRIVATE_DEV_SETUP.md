# Private Development Environment Setup

## Overview
To create a truly private development environment for your MCP server that only people in your Cloudflare account can access, we'll use **Cloudflare Access** to implement proper access controls.

## Current Configuration
Your `wrangler.jsonc` already has a "preview" environment configured with:
- Custom domain: `mcp-preview.perigon.io`
- Compatible with Durable Objects
- Disabled observability for privacy

## Setting Up Cloudflare Access

### Step 1: Enable Cloudflare Access
1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com/)
2. Select your account
3. Go to **Zero Trust** > **Access** > **Applications**
4. Click **Add an application**
5. Select **Self-hosted** application type

### Step 2: Configure Application Settings
1. **Application name**: `MCP Server Preview`
2. **Session duration**: Choose how long users stay logged in (e.g., 8 hours)
3. **Application domain**: 
   - Subdomain: `mcp-preview`
   - Domain: `perigon.io`
4. Click **Next**

### Step 3: Set Access Policies
Create a policy to restrict access to only your Cloudflare account users:

**Policy Name**: `Cloudflare Account Members Only`

**Configure Rules**:
- **Action**: Allow
- **Rule type**: Include
- **Selector**: Choose one of these options:

#### Option A: Restrict by Email Domain
- **Selector**: `Email domain`
- **Value**: `your-company.com` (replace with your company domain)

#### Option B: Restrict by Specific Emails
- **Selector**: `Emails`
- **Value**: Add specific email addresses of people who should have access

#### Option C: Restrict by SSO Identity Provider
- **Selector**: `Authentication method`
- **Value**: Your configured SSO provider (Google Workspace, Microsoft, etc.)

### Step 4: Deploy and Test
1. Deploy your preview environment:
   ```bash
   wrangler deploy --env preview
   ```

2. Visit `https://mcp-preview.perigon.io`
3. You should be prompted to authenticate through Cloudflare Access
4. Only users matching your access policy will be able to access the site

## Access Control Features

### Authentication Required
- All visitors must authenticate before accessing the preview environment
- Authentication state is maintained for the session duration you configured
- Failed authentication attempts are logged

### Team Management
- Add/remove team members through the Cloudflare dashboard
- No need to redeploy your worker when team membership changes
- Granular control over who can access different environments

### Additional Security Options
You can enhance security further by adding:
- **IP restrictions**: Limit access to specific IP ranges
- **Device posture**: Require specific device configurations
- **Multi-factor authentication**: Enforce MFA for additional security
- **Time-based access**: Restrict access to business hours

## Alternative: Service Tokens
For API access or CI/CD pipelines, you can create service tokens:

1. Go to **Zero Trust** > **Access** > **Service Tokens**
2. Click **Create Service Token**
3. Name it `MCP Preview API Access`
4. Add this token to your Access policy as an allowed authentication method

## Deployment Commands

```bash
# Deploy to private preview environment
wrangler deploy --env preview

# Check deployment status
wrangler deployments list --env preview

# View preview environment logs
wrangler tail --env preview
```

## Summary

This setup gives you:
- ✅ **Truly private**: Only authenticated users can access
- ✅ **Durable Objects compatible**: Works with your existing setup
- ✅ **Team-friendly**: Easy to manage who has access
- ✅ **Secure**: Enterprise-grade authentication
- ✅ **Flexible**: Multiple authentication methods supported

The preview environment will now be accessible only to people you explicitly grant access to, making it truly private rather than just "hard to find".