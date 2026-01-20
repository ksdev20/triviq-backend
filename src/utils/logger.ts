type Level = "info" | "warm" | "error";

export const log = (level: Level, msg: string, meta?: unknown) =>
  console.log(JSON.stringify({ level, msg, meta }));
