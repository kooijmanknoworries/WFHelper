import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scanBoardRouter from "./scan-board";
import dictionaryRouter from "./dictionary";
import checkWordRouter from "./check-word";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dictionaryRouter);
router.use(checkWordRouter);
router.use(scanBoardRouter);

export default router;
