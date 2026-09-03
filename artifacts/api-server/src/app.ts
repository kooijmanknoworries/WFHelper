import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { scanBoardAccess } from "./middlewares/scan-board-access";

const app: Express = express();

// The API runs behind Replit's reverse proxy in production.
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
// Reject unauthenticated or rate-limited scan requests before parsing their
// potentially large image body or invoking the paid vision model.
app.use("/api/scan-board", scanBoardAccess);
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
