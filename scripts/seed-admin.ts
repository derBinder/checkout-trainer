import { auth, seedAdmin } from "../src/lib/auth";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_INITIAL_PASSWORD;
if (!email || !password) {
  console.error("ADMIN_EMAIL und ADMIN_INITIAL_PASSWORD müssen gesetzt sein.");
  process.exit(1);
}
await seedAdmin(auth, email, password);
console.log("Betreiberkonto ist angelegt.");
process.exit(0);
