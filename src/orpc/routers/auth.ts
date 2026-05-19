import { os } from "@orpc/server";
import { z } from "zod";
import { AppContext } from "../context";

const base = os.context<AppContext>();

export const authRouter = base.router({
  login: base
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      // Your login logic (checking MongoDB, comparing passwords)
      return { token: "generated_jwt_here" };
    }),
});
