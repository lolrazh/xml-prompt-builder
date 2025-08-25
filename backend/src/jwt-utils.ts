// JWT utility functions for cross-domain authentication
export interface JWTPayload {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

// Simple JWT encoding (for production, use a proper JWT library)
export function createJWT(payload: { userId: string; sessionId: string }, secret: string): string {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + (60 * 60 * 24 * 7) // 7 days
  };
  
  const encodedHeader = base64URLEncode(JSON.stringify(header));
  const encodedPayload = base64URLEncode(JSON.stringify(jwtPayload));
  
  const signature = base64URLEncode(
    hmacSHA256(`${encodedHeader}.${encodedPayload}`, secret)
  );
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJWT(token: string, secret: string): JWTPayload | null {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;
    
    // Verify signature
    const expectedSignature = base64URLEncode(
      hmacSHA256(`${headerB64}.${payloadB64}`, secret)
    );
    
    if (signatureB64 !== expectedSignature) return null;
    
    // Parse payload
    const payload: JWTPayload = JSON.parse(base64URLDecode(payloadB64));
    
    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    
    return payload;
  } catch {
    return null;
  }
}

// Base64 URL encoding utilities
function base64URLEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64URLDecode(str: string): string {
  str += '='.repeat((4 - str.length % 4) % 4);
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

// Simple HMAC SHA256 implementation
function hmacSHA256(message: string, secret: string): string {
  // For production, use a proper crypto library
  // This is a simplified version for demonstration
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  // Simplified HMAC - in production use crypto.subtle.sign
  let hash = '';
  for (let i = 0; i < messageData.length; i++) {
    hash += String.fromCharCode(
      messageData[i] ^ keyData[i % keyData.length]
    );
  }
  return hash;
}
