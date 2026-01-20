export const CONFIG = {
  port: Number(process.env.PORT) || 8000,
  corsOrigin: process.env.CORS_ORIGIN || "*",
  questionDurationMs: 15000,
  maxPlayersPerRoom: 50,
  rateLimit: {
    windowMs: 2000,
    maxEvents: 8,
  },
};
