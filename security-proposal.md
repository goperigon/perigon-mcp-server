# Perigon MCP Playground Security Proposal

## Executive Summary

The Perigon MCP playground at https://mcp.perigon.io provides two main interfaces for users to interact with news search tools:
1. **Inspector Mode**: Direct tool testing interface
2. **Chat Mode**: AI-powered conversational interface using Claude Sonnet

Currently, the playground has minimal abuse protection, making it vulnerable to API cost abuse, resource exhaustion, and automated scraping. This proposal outlines a multi-layered security approach to protect against these threats while maintaining a good user experience.

## Current Security State

### ✅ Already Implemented
- **Turnstile Integration**: Ready to enable (currently commented out)
- **Input Validation**: Zod schemas for tool parameters
- **Error Handling**: Proper error responses and logging

### ❌ Current Vulnerabilities
- **No Rate Limiting**: Unlimited requests per user/IP
- **No Authentication**: Anyone can use expensive AI/API features
- **No Usage Tracking**: No visibility into abuse patterns
- **No Request Size Limits**: Large payloads could cause issues
- **No Geographic Restrictions**: Global access without controls

## Recommended Security Layers

### 1. Bot Protection (Immediate - Already Available)

**Enable Turnstile Protection**
- ✅ Turnstile is already configured in production (`VITE_USE_TURNSTILE: true`)
- ✅ Site key and secret are already set up
- ✅ Frontend integration is ready (`@marsidev/react-turnstile`)
- ✅ Backend verification code exists (just commented out)

**Action Required:**
```typescript
// Uncomment the existing Turnstile verification in worker/index.ts handleChatRequest()
if (env.VITE_USE_TURNSTILE) {
  // ... existing verification code
}
```

**Benefits:**
- Blocks automated bots and scrapers
- Minimal impact on legitimate users
- Already implemented, just needs activation

### 2. Rate Limiting (High Priority)

**Implement Multi-Tier Rate Limiting using Cloudflare Workers Rate Limiting API**

```typescript
// Suggested rate limits
const RATE_LIMITS = {
  chat: {
    requests: 10,     // requests per window
    window: 300,      // 5 minutes
    description: "Chat requests (expensive AI calls)"
  },
  tools: {
    requests: 30,     // requests per window  
    window: 300,      // 5 minutes
    description: "Tool inspection requests"
  },
  burst: {
    requests: 100,    // requests per window
    window: 60,       // 1 minute
    description: "Total requests across all endpoints"
  }
};
```

**Implementation Approach:**
```typescript
async function checkRateLimit(request: Request, env: Env, type: 'chat' | 'tools' | 'burst') {
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const identifier = `${type}:${clientIP}`;
  
  const outcome = await env.RATE_LIMITER.limit({
    key: identifier,
    limit: RATE_LIMITS[type].requests,
    period: RATE_LIMITS[type].window
  });
  
  if (!outcome.success) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      details: `Too many ${type} requests. Try again in ${outcome.retryAfter} seconds.`,
      retryAfter: outcome.retryAfter
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': outcome.retryAfter.toString()
      }
    });
  }
  
  return null; // Rate limit passed
}
```

### 3. Request Size and Complexity Limits

**Chat Endpoint Limits:**
```typescript
const CHAT_LIMITS = {
  maxMessageLength: 2000,      // characters per message
  maxMessagesPerChat: 20,      // conversation history
  maxToolCallsPerMessage: 5,   // prevent tool call spam
  maxResponseTokens: 4000      // Claude response limit
};
```

**Tool Endpoint Limits:**
```typescript
const TOOL_LIMITS = {
  maxPageSize: 50,            // results per API call
  maxQueryLength: 500,        // search query length
  maxArrayParams: 10,         // items in array parameters
  timeoutMs: 30000           // 30 second timeout
};
```

### 4. Usage Monitoring and Analytics

**Track Key Metrics:**
- Requests per IP/hour/day
- API costs per session
- Tool usage patterns
- Error rates and types
- Geographic distribution

**Alert Thresholds:**
- >100 requests/hour from single IP
- >$10 API cost from single session
- >50% error rate from IP range
- Unusual geographic patterns

**Implementation:**
```typescript
// Log usage metrics
async function logUsage(request: Request, endpoint: string, cost?: number) {
  const metrics = {
    timestamp: Date.now(),
    ip: request.headers.get('CF-Connecting-IP'),
    country: request.cf?.country,
    endpoint,
    userAgent: request.headers.get('User-Agent'),
    cost: cost || 0
  };
  
  // Send to analytics service or Cloudflare Analytics
  await env.ANALYTICS.writeDataPoint(metrics);
}
```

### 5. Content and Input Validation

**Enhanced Input Sanitization:**
```typescript
// Prevent prompt injection attempts
const BLOCKED_PATTERNS = [
  /ignore.{0,10}previous.{0,10}instructions/i,
  /you.{0,10}are.{0,10}now.{0,10}(?:assistant|ai|gpt)/i,
  /system.{0,10}prompt/i,
  /\/dev\/null/i,
  /<script|javascript:|data:/i
];

function validateChatInput(message: string): boolean {
  return !BLOCKED_PATTERNS.some(pattern => pattern.test(message));
}
```

**Tool Parameter Validation:**
```typescript
// Add stricter validation to existing Zod schemas
const enhancedValidation = {
  // Limit expensive operations
  maxDateRange: 365,  // days
  blockedSources: ['*'],  // prevent wildcard abuse
  maxLocations: 5     // prevent parameter stuffing
};
```

### 6. Geographic and Access Controls

**Optional Geographic Restrictions:**
```typescript
// Restrict access based on country if needed
const ALLOWED_COUNTRIES = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP'];

function checkGeographicAccess(request: Request): boolean {
  const country = request.cf?.country;
  return !country || ALLOWED_COUNTRIES.includes(country);
}
```

**Time-based Restrictions:**
```typescript
// Optional: Restrict during maintenance windows or high-cost periods
const MAINTENANCE_HOURS = [2, 3, 4]; // UTC hours
function isMaintenanceTime(): boolean {
  const hour = new Date().getUTCHours();
  return MAINTENANCE_HOURS.includes(hour);
}
```

### 7. Advanced Protection (Future Considerations)

**Session Management:**
- Temporary session tokens for extended conversations
- Session-based rate limiting
- Conversation context limits

**Machine Learning Detection:**
- Automated abuse pattern detection
- Behavioral analysis for bot identification
- Dynamic rate limit adjustment

**API Key System:**
- Optional registration for higher limits
- Tiered access levels
- Usage quotas and billing

## Implementation Priority

### Phase 1 (Immediate - 1 day)
1. ✅ **Enable Turnstile** - Uncomment existing code
2. 🔧 **Basic Rate Limiting** - Implement Cloudflare Workers rate limiting
3. 📏 **Request Size Limits** - Add payload size validation

### Phase 2 (Short-term - 1 week)
1. 📊 **Usage Monitoring** - Add analytics and alerting
2. 🛡️ **Enhanced Input Validation** - Prompt injection protection
3. ⚙️ **Tool Parameter Limits** - Stricter validation rules

### Phase 3 (Medium-term - 1 month)
1. 🌍 **Geographic Controls** - Optional country restrictions
2. 📈 **Advanced Analytics** - Detailed usage patterns
3. 🔐 **Session Management** - Enhanced user tracking

## Cost-Benefit Analysis

### Protection Benefits
- **API Cost Savings**: Prevent $100s-$1000s in abuse
- **Service Reliability**: Maintain performance for legitimate users
- **Legal Protection**: Reduce scraping and ToS violations
- **Brand Protection**: Prevent service degradation

### Implementation Costs
- **Development Time**: ~40 hours total across all phases
- **Monitoring Overhead**: Minimal with Cloudflare analytics
- **User Experience**: Slight friction for first-time users (Turnstile)
- **Maintenance**: Ongoing monitoring and tuning

## Monitoring and Alerts

### Key Metrics Dashboard
```typescript
// Suggested metrics to track
const DASHBOARD_METRICS = {
  realtime: {
    activeUsers: 'current active sessions',
    requestsPerMinute: 'requests across all endpoints',
    errorRate: 'percentage of failed requests',
    averageResponseTime: 'performance metric'
  },
  hourly: {
    uniqueIPs: 'distinct users',
    totalCosts: 'Anthropic + Perigon API costs',
    topCountries: 'geographic distribution',
    topTools: 'most used tool functions'
  },
  daily: {
    totalUsers: 'unique daily users',
    conversionRate: 'chat vs tool usage',
    abuseBlocked: 'blocked malicious requests',
    costPerUser: 'average cost per user'
  }
};
```

### Automated Alerts
- Rate limit breaches from single IP
- Unusual cost spikes (>$50/hour)
- High error rates (>10%)
- Geographic anomalies
- Service downtime

## Conclusion

This multi-layered security approach provides comprehensive protection against abuse while maintaining excellent user experience for legitimate users. The modular implementation allows for gradual rollout and adjustment based on observed usage patterns.

**Immediate Action Items:**
1. Enable Turnstile protection (5 minutes)
2. Implement basic rate limiting (4 hours)  
3. Add request size validation (2 hours)
4. Set up basic monitoring (4 hours)

**Total Estimated Implementation Time: 2-3 days for core protection**

The proposed security measures should reduce potential abuse by >95% while adding minimal friction for legitimate users.