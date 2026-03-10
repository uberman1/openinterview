// server/middleware/rateLimiter.js
// Rate limiting middleware

// Helper factory to create rate limiters
const createRateLimiter = (options) => {
    const { windowMs, maxRequests, name, errorMessage } = options;
    const rateLimitMap = new Map();

    // Clean up expired entries every 10 minutes to prevent memory leaks
    setInterval(() => {
        const now = Date.now();
        for (const [key, data] of rateLimitMap.entries()) {
            if (now > data.resetTime) {
                rateLimitMap.delete(key);
            }
        }
    }, 10 * 60 * 1000);

    return (req, res, next) => {
        try {
            // 1. Determine the key (User ID > Session ID > IP)
            // Prefer anonUserId cookie as it tracks the user across sessions
            const key = req.cookies?.anonUserId || 
                        req.session?.anonymousUserId || 
                        req.ip || 
                        req.headers['x-forwarded-for'] || 
                        'unknown';

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
                const resetInMinutes = Math.ceil((record.resetTime - now) / 60000);
                console.warn(`[RateLimit-${name}] Blocked request from ${key}. Limit reached.`);
                return res.status(429).json({
                    error: "AI Bot Protection Activated - Too many login attempts. Please login again in 60 seconds.",
                    message: errorMessage || `You have reached the limit for ${name}. Please try again in ${resetInMinutes} minutes.`
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
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    name: "Upload",
    errorMessage: "You have reached the upload limit."
});

// 2. Auth Rate Limiter
// Limit: 10 requests per minute
export const authRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    name: "Auth"
});

// 3. AI Parse Rate Limiter
// Limit: 3 requests per 15 minutes
export const aiParseRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 3,
    name: "AI-Parse"
});

// 4. Profile Rate Limiter
// Limit: 30 requests per 5 minutes
export const profileRateLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 30,
    name: "Profile"
});
