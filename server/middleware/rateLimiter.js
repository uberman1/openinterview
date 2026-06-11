// server/middleware/rateLimiter.js
// Rate limiting middleware

function readPositiveIntegerEnv(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;

    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// Helper factory to create rate limiters
const createRateLimiter = (options) => {
    const { windowMs, maxRequests, name, errorMessage } = options;
    const rateLimitMap = new Map();

    // Clean up expired entries every 10 minutes to prevent memory leaks
    const cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, data] of rateLimitMap.entries()) {
            if (now > data.resetTime) {
                rateLimitMap.delete(key);
            }
        }
    }, 10 * 60 * 1000);
    cleanupTimer.unref?.();

    return (req, res, next) => {
        try {
            // 1. Determine the key (User ID > Session ID > IP)
            // Prefer authenticated user id when available to avoid penalizing the same IP.
            const key = req.user?.id
              ? `user:${req.user.id}`
              : (
                  req.cookies?.anonUserId ||
                  req.session?.anonymousUserId ||
                  req.headers['x-forwarded-for'] ||
                  req.ip ||
                  'unknown'
                );

            const now = Date.now();
            
            // 2. Get or initialize the record
            let record = rateLimitMap.get(key);
            
            // Check if record exists and is within the window
            if (!record || now > record.resetTime) {
                // New window or expired
                record = {
                    count: 0,
                    resetTime: now + windowMs
                };
            }

            // 3. Check limit
            if (record.count >= maxRequests) {
                const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
                const resetInMinutes = Math.ceil(retryAfterSeconds / 60);
                console.warn(`[RateLimit-${name}] Blocked request from ${key}. Limit reached.`);
                res.setHeader('Retry-After', String(retryAfterSeconds));
                return res.status(429).json({
                    error: errorMessage || `You have reached the limit for ${name}. Please try again in ${resetInMinutes} minutes.`,
                    message: errorMessage || `You have reached the limit for ${name}. Please try again in ${resetInMinutes} minutes.`,
                    retryAfterSeconds
                });
            }

            // 4. Increment and update
            record.count++;
            rateLimitMap.set(key, record);
            
            console.log(`[RateLimit-${name}] Attempt ${record.count}/${maxRequests} for ${key}`);
            next();
        } catch (error) {
            console.error(`[RateLimit-${name}] Error in rate limiter middleware:`, error);
            // Fail open: If rate limiter fails, allow the request to proceed
            next();
        }
    };
};

// 1. Upload Rate Limiter
// Limit: 20 requests per hour
export const uploadRateLimiter = createRateLimiter({
    windowMs: readPositiveIntegerEnv('UPLOAD_RATE_LIMIT_WINDOW_MS', 60 * 60 * 1000), // 1 hour
    maxRequests: readPositiveIntegerEnv('UPLOAD_RATE_LIMIT_MAX', 20),
    name: "Upload",
    errorMessage: "You have reached the upload limit."
});

// 2. Auth Rate Limiter
// Limit: 10 requests per minute
export const authRateLimiter = createRateLimiter({
    windowMs: readPositiveIntegerEnv('AUTH_RATE_LIMIT_WINDOW_MS', 60 * 1000), // 1 minute
    maxRequests: readPositiveIntegerEnv('AUTH_RATE_LIMIT_MAX', 10),
    name: "Auth",
    errorMessage: "Too many authentication attempts. Please try again shortly."
});

// 3. AI Parse Rate Limiter
// Limit: 3 requests per 15 minutes
export const aiParseRateLimiter = createRateLimiter({
    windowMs: readPositiveIntegerEnv('AI_PARSE_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
    maxRequests: readPositiveIntegerEnv('AI_PARSE_RATE_LIMIT_MAX', 3),
    name: "AI-Parse",
    errorMessage: "You have reached the AI parsing limit. Please try again later."
});

// 4. Profile Rate Limiter
// Limit: 30 requests per 5 minutes
export const profileRateLimiter = createRateLimiter({
    windowMs: readPositiveIntegerEnv('PROFILE_RATE_LIMIT_WINDOW_MS', 5 * 60 * 1000), // 5 minutes
    maxRequests: readPositiveIntegerEnv('PROFILE_RATE_LIMIT_MAX', 30),
    name: "Profile",
    errorMessage: "You have reached the profile request limit. Please try again later."
});

// 5. Public AI Chat Rate Limiter
// Defaults are intentionally conservative and can be changed with env vars.
export const aiChatRateLimiter = createRateLimiter({
    windowMs: readPositiveIntegerEnv('AI_CHAT_RATE_LIMIT_WINDOW_MS', 60 * 1000), // 1 minute
    maxRequests: readPositiveIntegerEnv('AI_CHAT_RATE_LIMIT_MAX', 10),
    name: "AI-Chat",
    errorMessage: "Too many AI chat requests. Please wait before trying again."
});
