import { Router } from "express";
import { db } from "../db";
import { invitation, user, verification } from "../db/auth-schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { z } from "zod";
import { auth } from "../lib/auth";

const router = Router();

const createInvitationSchema = z.object({
  email: z.string().email("Neplatný email"),
  role: z.enum(["user", "admin"]).default("user"),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token je povinný"),
  name: z.string().min(2, "Meno musí mať aspoň 2 znaky"),
  password: z.string().min(8, "Heslo musí mať aspoň 8 znakov"),
});

router.post("/", async (req, res) => {
  try {
    const validation = createInvitationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.issues[0].message,
      });
    }

    const { email, role } = validation.data;
    const invitedBy = (req as any).user?.id;

    if (!invitedBy) {
      return res.status(401).json({ error: "Neautorizovaný prístup" });
    }

    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(400).json({
        error: "Používateľ s týmto emailom už existuje",
      });
    }

    const existingInvitation = await db
      .select()
      .from(invitation)
      .where(and(eq(invitation.email, email), isNull(invitation.acceptedAt)))
      .limit(1);

    if (existingInvitation.length > 0) {
      return res.status(400).json({
        error: "Pre tento email už existuje aktívna pozvánka",
      });
    }

    const result = await auth.api.signInMagicLink({
      body: {
        email,
        callbackURL: "/accept-invite",
      },
      headers: new Headers({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
      }),
    });

    if (!result) {
      throw new Error("Failed to send magic link");
    }

    await db.insert(invitation).values({
      email,
      role,
      invitedBy,
    });

    res.json({
      success: true,
      message: `Pozvánka bola odoslaná na ${email}`,
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    res.status(500).json({ error: "Nepodarilo sa vytvoriť pozvánku" });
  }
});

// Verify invitation token handler
const verifyTokenHandler = async (req: any, res: any) => {
  try {
    const { token } = req.params;

    const ver = await db
      .select()
      .from(verification)
      .where(eq(verification.identifier, token))
      .limit(1);

    if (ver.length === 0) {
      return res.status(404).json({
        valid: false,
        error: "Pozvánka nebola nájdená alebo je neplatná",
      });
    }

    const verRecord = ver[0];

    if (new Date() > verRecord.expiresAt) {
      return res.status(400).json({
        valid: false,
        error: "Táto pozvánka vypršala",
      });
    }

    let email: string;
    try {
      const parsed = JSON.parse(verRecord.value);
      email = parsed.email;
    } catch {
      return res.status(400).json({
        valid: false,
        error: "Neplatný formát pozvánky",
      });
    }

    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(400).json({
        valid: false,
        error: "Účet s týmto emailom už existuje",
      });
    }

    const inv = await db
      .select()
      .from(invitation)
      .where(eq(invitation.email, email))
      .orderBy(desc(invitation.createdAt))
      .limit(1);

    res.json({
      valid: true,
      email,
      role: inv.length > 0 ? inv[0].role : "user",
    });
  } catch (error) {
    console.error("Error verifying invitation:", error);
    res.status(500).json({ error: "Nepodarilo sa overiť pozvánku" });
  }
};

router.get("/verify/:token", verifyTokenHandler);

const acceptInvitationHandler = async (req: any, res: any) => {
  try {
    const validation = acceptInvitationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.issues[0].message,
      });
    }

    const { token, name, password } = validation.data;

    const ver = await db
      .select()
      .from(verification)
      .where(eq(verification.identifier, token))
      .limit(1);

    if (ver.length === 0) {
      return res.status(404).json({ error: "Pozvánka nebola nájdená" });
    }

    const verRecord = ver[0];

    if (new Date() > verRecord.expiresAt) {
      return res.status(400).json({ error: "Táto pozvánka vypršala" });
    }

    let email: string;
    try {
      const parsed = JSON.parse(verRecord.value);
      email = parsed.email;
    } catch {
      return res.status(400).json({ error: "Neplatný formát pozvánky" });
    }

    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(400).json({
        error: "Používateľ s týmto emailom už existuje",
      });
    }

    const inv = await db
      .select()
      .from(invitation)
      .where(eq(invitation.email, email))
      .orderBy(desc(invitation.createdAt))
      .limit(1);

    const role = inv.length > 0 ? inv[0].role : "user";

    const signUpResult = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (!signUpResult || !signUpResult.user) {
      throw new Error("Failed to create user");
    }

    if (role === "admin") {
      await db
        .update(user)
        .set({ role: "admin" })
        .where(eq(user.id, signUpResult.user.id));
    }

    await db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.id, signUpResult.user.id));

    if (inv.length > 0) {
      await db
        .update(invitation)
        .set({ acceptedAt: new Date() })
        .where(eq(invitation.id, inv[0].id));
    }

    await db.delete(verification).where(eq(verification.id, verRecord.id));

    res.json({
      success: true,
      message: "Účet bol úspešne vytvorený. Môžete sa prihlásiť.",
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    res.status(500).json({ error: "Nepodarilo sa vytvoriť účet" });
  }
};

router.post("/accept", acceptInvitationHandler);

// GET /api/invitation/list
router.get("/list", async (req, res) => {
  try {
    const invitations = await db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        acceptedAt: invitation.acceptedAt,
        createdAt: invitation.createdAt,
      })
      .from(invitation)
      .orderBy(desc(invitation.createdAt));

    res.json(invitations);
  } catch (error) {
    console.error("Error listing invitations:", error);
    res.status(500).json({ error: "Nepodarilo sa načítať pozvánky" });
  }
});

// DELETE /api/invitation/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Neplatné ID" });
    }

    await db.delete(invitation).where(eq(invitation.id, id));

    res.json({ success: true, message: "Pozvánka bola zmazaná" });
  } catch (error) {
    console.error("Error deleting invitation:", error);
    res.status(500).json({ error: "Nepodarilo sa zmazať pozvánku" });
  }
});

export default router;

export { verifyTokenHandler, acceptInvitationHandler };
