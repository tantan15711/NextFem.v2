const buckets = new Map();

const getKey = (req) => {
  const userId = req.user?.id ? `user:${req.user.id}` : "";
  return `${userId || req.ip}:${req.method}:${req.baseUrl || ""}${req.route?.path || req.path}`;
};

const rateLimit = ({ limit = 120, windowMs = 60_000 } = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    const key = getKey(req);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return next();
    }

    current.count += 1;

    if (current.count > limit) {
      return res.status(429).json({
        message: "Demasiadas solicitudes. Intenta de nuevo en unos segundos."
      });
    }

    return next();
  };
};

setInterval(() => {
  const now = Date.now();

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 60_000).unref();

module.exports = rateLimit;
