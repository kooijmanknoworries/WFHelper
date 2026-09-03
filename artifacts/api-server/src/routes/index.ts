import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scanBoardRouter from "./scan-board";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scanBoardRouter);

export default router;
