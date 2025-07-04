import type { AuthResponse, AuthError } from '../types/session.types';

/**
 * Mock authentication service that simulates backend behavior
 */
class AuthService {
  private readonly baseUrl = '/api/auth';

  /**
   * Mock JWT generation - simulates backend creating JWT after Turnstile validation
   */
  private generateMockJWT(): string {
    const header = {
      typ: 'JWT',
      alg: 'HS256'
    };

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 30 * 60; // 30 minutes
    
    const payload = {
      iat: now,
      exp: now + expiresIn,
      session_id: crypto.randomUUID(),
      ip: '127.0.0.1', // Mock IP
      usage: {
        chat: 0,
        tools: 0,
        maxChat: 10,
        maxTools: 30
      }
    };

    const signature = 'mock_signature_' + Math.random().toString(36).substr(2, 9);

    return [
      btoa(JSON.stringify(header)),
      btoa(JSON.stringify(payload)),
      signature
    ].join('.');
  }

  /**
   * Simulate Turnstile token validation and JWT generation
   */
  async authenticateWithTurnstile(turnstileToken: string): Promise<AuthResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Simulate validation failure (10% chance)
    if (Math.random() < 0.1) {
      throw new Error('Turnstile validation failed');
    }

    // Mock successful response
    const token = this.generateMockJWT();
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 30 * 60; // 30 minutes
    const expiresAt = now + expiresIn;

    return {
      token,
      expiresAt,
      expiresIn
    };
  }

  /**
   * Validate session token (simulate server-side validation)
   */
  async validateSession(token: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    if (!token) return false;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      return payload.exp > now;
    } catch {
      return false;
    }
  }

  /**
   * Mock API call that requires authentication
   */
  async makeAuthenticatedRequest(
    url: string, 
    options: RequestInit = {},
    token: string | null
  ): Promise<Response> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check if token is provided and valid
    if (!token || !await this.validateSession(token)) {
      return new Response(
        JSON.stringify({
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Please complete verification',
          code: 'TURNSTILE_REQUIRED'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Simulate successful API response
    if (url.includes('/v1/api/tools') && options.method === 'GET') {
      // Mock tools list response
      return new Response(
        JSON.stringify({
          tools: [
            {
              name: 'search_news_articles',
              description: 'Search across news articles with various filters',
              args: { type: 'object', properties: {} }
            }
          ]
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (url.includes('/v1/api/tools') && options.method === 'POST') {
      // Mock tool execution response
      return new Response(
        JSON.stringify({
          result: 'Mock tool execution result for authenticated request'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (url.includes('/v1/api/chat')) {
      // Mock chat response - return a simple text stream
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const response = 'This is a mock authenticated chat response.';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: response })}\n\n`));
          controller.close();
        }
      });

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    // Default mock response
    return new Response(
      JSON.stringify({ message: 'Mock authenticated response' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export const authService = new AuthService();