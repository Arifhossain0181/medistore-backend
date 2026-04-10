import { prisma } from "./src/lib/prisma.js";
import { auth } from "./src/lib/auth.js";

const SUPER_ADMIN_EMAIL = "superadmin@gmail.com";
const SUPER_ADMIN_PASSWORD = "Passwordkhan";

async function main() {
  console.log("Starting super admin user seeding...");

  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: SUPER_ADMIN_EMAIL },
  });

  if (existingSuperAdmin) {
    // Remove legacy user records created outside Better Auth.
    await prisma.session.deleteMany({ where: { userId: existingSuperAdmin.id } });
    await prisma.account.deleteMany({ where: { userId: existingSuperAdmin.id } });
    await prisma.user.delete({ where: { id: existingSuperAdmin.id } });
    console.log("Existing super admin record replaced with Better Auth account...");
  }

  const signUpResult = await auth.api.signUpEmail({
    body: {
      name: "Super Admin",
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
    },
  });

  await prisma.user.update({
    where: { id: signUpResult.user.id },
    data: {
      name: "Super Admin",
      role: "SUPER_ADMIN",
      emailVerified: true,
      isBanned: false,
      status: "ACTIVE",
    },
  });

  const superAdmin = await prisma.user.findUnique({
    where: { id: signUpResult.user.id },
    select: {
      email: true,
      role: true,
    },
  });

  if (!superAdmin) {
    throw new Error("Failed to load seeded super admin user");
  }

  console.log("Super admin user is ready!");
  console.log("Email:", superAdmin.email);
  console.log("Role:", superAdmin.role);
  console.log("Login Email:", SUPER_ADMIN_EMAIL);
  console.log("Login Password:", SUPER_ADMIN_PASSWORD);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Error seeding super admin:", error);
  process.exit(1);
});