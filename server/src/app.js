import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/notFound.middleware.js";
import { authenticate } from "./middlewares/auth.middleware.js";
import authRoutes from "./modules/auth/auth.routes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://localhost:5173",
  env.corsOrigin,
];

app.use(helmet());

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

app.use("/api/auth", authRoutes);

app.use("/api", authenticate, routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
