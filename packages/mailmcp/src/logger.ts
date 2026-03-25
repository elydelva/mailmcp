import { createWriteStream, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import pino from "pino";

const logDir = join(homedir(), ".local", "share", "mailmcp", "logs");
mkdirSync(logDir, { recursive: true });

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    formatters: {
      level: (label) => ({ level: label }),
    },
  },
  createWriteStream(join(logDir, "mailmcp.log"), { flags: "a" }),
);
