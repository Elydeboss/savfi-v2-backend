import { os } from "@orpc/server";
import { z } from "zod";
import { AppContext } from "../context";
import { authMiddleware } from "../middleware/auth";

const base = os.context<AppContext>();

export const savingsRouter = base.router({
  getBalances: base
    .use(authMiddleware) // Protect this procedure
    .handler(async ({ context }) => {
      // context.user is now guaranteed to exist by TypeScript
      const userId = context.user?.userId;
      // Fetch from MongoDB...
      return { fiat: 1000, crypto: 0.5 };
    }),
});
