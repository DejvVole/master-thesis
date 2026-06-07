import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink } from "better-auth/plugins";
import { db } from "../db";
import * as schema from "../db/auth-schema";
import { sendInvitationEmail } from "../services/emailService";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.CLIENT_URL || "http://localhost:3001",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    magicLink({
      sendMagicLink: async ({ email, token, url }, request) => {
        const clientUrl = process.env.CLIENT_URL;
        const inviteUrl = `${clientUrl}/accept-invite?token=${token}`;
        await sendInvitationEmail(email, inviteUrl);
      },
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      disableSignUp: false,
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minút cache
    },
  },
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://194.62.248.32",
    process.env.CLIENT_URL || "",
  ].filter(Boolean),
});
