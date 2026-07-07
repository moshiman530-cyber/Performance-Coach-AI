import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import athletesRouter from "./athletes";
import recordsRouter from "./records";
import goalsRouter from "./goals";
import openaiRouter from "./openai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(athletesRouter);
router.use(recordsRouter);
router.use(goalsRouter);
router.use(openaiRouter);

export default router;
