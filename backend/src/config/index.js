export function initConfig () {
  const cfg = {
    port: Number(process.env.PORT || 5001),
    mongoUri: process.env.MONGO_URI || '',
    mongoDbName: process.env.MONGO_DB || '',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
    accessTokenTtlSec: Number(process.env.ACCESS_TTL_SEC),
    refreshTokenTtlSec: Number(process.env.REFRESH_TTL_SEC),
    corsOrigin: process.env.CORS_ORIGIN || '',
    corsOrigins: (process.env.CORS_ORIGIN || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    geoApiUrl: process.env.GEO_API_URL || '',
    captcha: {
      recaptchaSecret: process.env.RECAPTCHA_SECRET || '',
      hcaptchaSecret: process.env.HCAPTCHA_SECRET || ''
    },
    adminBootstrapEmail: process.env.ADMIN_EMAIL || ''
  };

  if ((!cfg.corsOrigin && cfg.corsOrigins.length === 0) && process.env.NODE_ENV !== 'production') {
    cfg.corsOrigins = ['http://localhost:5173', 'http://localhost:8080'];
  }

  cfg.corsAllowAll = process.env.CORS_ALLOW_ALL === 'true' || (!cfg.corsOrigin && cfg.corsOrigins.length === 0 && process.env.NODE_ENV !== 'production');

  return cfg;
}


