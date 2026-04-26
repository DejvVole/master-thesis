/**
 * Skript pre vytvorenie prvého admin používateľa
 * Spusti: npx tsx src/scripts/create-admin.ts
 */

import { auth } from "../lib/auth";
import { db } from "../db";
import { user } from "../db/auth-schema";
import { eq } from "drizzle-orm";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function createAdmin() {
  console.log("=== Vytvorenie Admin Používateľa ===\n");

  // Kontrola či už existuje admin
  const existingAdmin = await db
    .select()
    .from(user)
    .where(eq(user.role, "admin"))
    .limit(1);

  if (existingAdmin.length > 0) {
    console.log("⚠️  Admin používateľ už existuje:");
    console.log(`   Email: ${existingAdmin[0].email}`);
    console.log(`   Meno: ${existingAdmin[0].name}`);

    const continueCreate = await question(
      "\nChcete vytvoriť ďalšieho admina? (y/n): ",
    );
    if (continueCreate.toLowerCase() !== "y") {
      rl.close();
      process.exit(0);
    }
  }

  const name = await question("Meno: ");
  const email = await question("Email: ");
  const password = await question("Heslo (min. 8 znakov): ");

  if (password.length < 8) {
    console.error("❌ Heslo musí mať minimálne 8 znakov");
    rl.close();
    process.exit(1);
  }

  try {
    // Vytvorenie používateľa cez Better Auth API
    const result = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });

    if (!result.user) {
      throw new Error("Nepodarilo sa vytvoriť používateľa");
    }

    // Aktualizácia role na admin
    await db
      .update(user)
      .set({ role: "admin" })
      .where(eq(user.id, result.user.id));

    console.log("\n✅ Admin používateľ úspešne vytvorený!");
    console.log(`   ID: ${result.user.id}`);
    console.log(`   Email: ${email}`);
    console.log(`   Meno: ${name}`);
    console.log(`   Rola: admin`);
  } catch (error) {
    console.error("❌ Chyba pri vytváraní admina:", error);
    process.exit(1);
  }

  rl.close();
  process.exit(0);
}

createAdmin();
