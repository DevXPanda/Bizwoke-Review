const isProd = process.env.NODE_ENV === "production";

export const logger = {
  debug: (...args: any[]) => {
    if (!isProd) {
      console.log("[DEBUG]", ...args);
    }
  },
  info: (...args: any[]) => {
    if (!isProd) {
      console.log("[INFO]", ...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn("[WARN]", ...args);
  },
  error: (...args: any[]) => {
    console.error("[ERROR]", ...args);
  },
  request: (method: string, route: string, status: number, duration: number) => {
    // Format: METHOD route status (durationms)
    console.log(`${method} ${route} ${status} (${duration}ms)`);
  }
};
