import http from "http";

import "express-async-errors";
import {
  CustomError,
  startAndCheckElasticConnection,
  envConfig,
  winstonLogger,
} from "@users/config";
import { IAuthPayload, IErrorResponse } from "@users/interfaces";
import { Logger } from "winston";
import {
  Application,
  Request,
  Response,
  NextFunction,
  json,
  urlencoded,
} from "express";
import hpp from "hpp";
import helmet from "helmet";
import cors from "cors";
import { verify } from "jsonwebtoken";
import compression from "compression";
import { Channel } from "amqplib";

import { appRoutes } from "@users/routes";
import { createQueueConnection } from "./config/amqp";
import {
  consumeBuyerDirectMessage,
  consumeReviewFanoutMessages,
  consumeSeedGigDirectMessages,
  consumeSellerDirectMessage,
} from "./queues/";

const log: Logger = winstonLogger("usersServer", "debug");

const start = (app: Application): void => {
  securityMiddleware(app);
  standardMiddleware(app);
  routesMiddleware(app);
  startQueues();
  startElasticSearch();
  usersErrorHandler(app);
  startServer(app);
};

const securityMiddleware = (app: Application): void => {
  app.set("trust proxy", 1);
  app.use(hpp());
  app.use(helmet());
  app.use(
    cors({
      origin: envConfig.api_gateway_url,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  );
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(" ")[1];
      const payload: IAuthPayload = verify(
        token,
        envConfig.jwt_token!
      ) as IAuthPayload;
      req.currentUser = payload;
    }
    next();
  });
};

const standardMiddleware = (app: Application): void => {
  app.use(compression());
  app.use(json({ limit: "200mb" }));
  app.use(urlencoded({ extended: true, limit: "200mb" }));
};

const routesMiddleware = (app: Application): void => {
  appRoutes(app);
};

const startQueues = async (): Promise<void> => {
  const userChannel: Channel = (await createQueueConnection()) as Channel;
  await consumeBuyerDirectMessage(userChannel);
  await consumeSellerDirectMessage(userChannel);
  await consumeReviewFanoutMessages(userChannel);
  await consumeSeedGigDirectMessages(userChannel);
};

const startElasticSearch = (): void => {
  startAndCheckElasticConnection();
};

const usersErrorHandler = (app: Application): void => {
  app.use(
    (
      error: IErrorResponse,
      _req: Request,
      res: Response,
      next: NextFunction
    ) => {
      log.log("error", `UsersService ${error.comingFrom}:`, error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(error.serializeErrors());
      }
      next();
    }
  );
};

const startServer = (app: Application): void => {
  try {
    const httpServer: http.Server = new http.Server(app);
    log.info(`Users server has started with process id ${process.pid}`);
    httpServer.listen(envConfig.port, () => {
      log.info(`Users server running on port ${envConfig.port}`);
    });
  } catch (error) {
    log.log("error", "UsersService startServer() method error:", error);
  }
};

export { start };
