import { NextFunction, Request, Response } from 'express';
import { ClientSession, startSession } from 'mongoose';

const runTasks = async (tasks?: Array<() => Promise<void>>) => {
  if (!tasks?.length) return;

  const results = await Promise.allSettled(tasks.map((task) => task()));

  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error(`❌ Task ${result.status}:- Reason ${result.reason}`);
    }
  });
};

export const tryCatchResponse = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.locals.afterResponse = [];
    res.locals.afterRollback = [];
    res.locals.afterFinish = [];

    res.once('finish', () => {
      runTasks(res.locals.afterFinish).catch(console.error);
    });

    try {
      await fn(req, res, next);

      await runTasks(res.locals.afterResponse);
    } catch (error) {
      await runTasks(res.locals.afterRollback);

      return next(error);
    }
  };
};

export const tryCatchSessionResponse = (
  fn: (req: Request, res: Response, next: NextFunction, session: ClientSession) => Promise<unknown>,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = await startSession();

    res.locals.afterCommit = [];
    res.locals.afterRollback = [];
    res.locals.afterResponse = [];
    res.locals.afterFinish = [];

    res.once('finish', () => {
      runTasks(res.locals.afterFinish).catch(console.error);
    });

    try {
      session.startTransaction();

      await fn(req, res, next, session);

      await session.commitTransaction();

      await runTasks(res.locals.afterCommit);
      await runTasks(res.locals.afterResponse);
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Transaction abort failed:', abortError);
      }

      await runTasks(res.locals.afterRollback);

      return next(error);
    } finally {
      await session.endSession();
    }
  };
};
