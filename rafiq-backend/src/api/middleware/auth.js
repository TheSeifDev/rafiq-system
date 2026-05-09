/**
 * api/middleware/auth.js - Auth middleware (optional)
 * Currently handled in api/index.js, this can be extended for JWT/etc.
 */

const API_KEY = process.env.RAFIQ_API_KEY || process.env.API_KEY;

export async function authMiddleware(request, reply) {
  const key = request.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    reply.code(401).send({ success: false, error: { code: 'unauthorized', message: 'Invalid API key' } });
  }
}