import { Router, type IRouter } from "express";
import healthRouter from "./health";
import athletesRouter from "./athletes";
import recordsRouter from "./records";
import openaiRouter from "./openai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(athletesRouter);
router.use(recordsRouter);
router.use(openaiRouter);

export default router;
