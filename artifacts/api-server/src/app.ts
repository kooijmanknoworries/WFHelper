import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { existsSync } from "node:fs";
import path from "node:path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Replit and self-hosted Caddy both place one reverse proxy in front of the API.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// A standalone self-hosted image can serve the Expo web export on the same
// origin as the API. Replit uses its existing artifact router when unset.
if (process.env.SELF_HOST_WEB_DIR) {
  const webDir = path.resolve(process.env.SELF_HOST_WEB_DIR);
  const indexFile = path.join(webDir, "index.html");
  if (!existsSync(indexFile)) {
    throw new Error(`Self-hosted web export is missing: ${indexFile}`);
  }

  // Expo web export places node-module assets (fonts, icon fonts, audio) under
  // an `assets/__node_modules/.pnpm/...` virtual-store path. serve-static's
  // default `dotfiles: "ignore"` would 404 that `.pnpm` segment, so allow it.
  app.use(express.static(webDir, { dotfiles: "allow" }));
  app.use((req, res, next) => {
    if (
      req.method !== "GET" ||
      req.path === "/api" ||
      req.path.startsWith("/api/") ||
      path.posix.extname(req.path)
    ) {
      next();
      return;
    }
    res.sendFile(indexFile);
  });
}

export default app;
