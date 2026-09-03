import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scanBoardRouter from "./scan-board";
import dictionaryRouter from "./dictionary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dictionaryRouter);
router.use(scanBoardRouter);

export default router;
