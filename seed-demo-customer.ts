import { prisma } from "./src/lib/prisma.js";
import bcrypt from "bcryptjs";

async function seedDemoCustomer() {
  try {
    // Check if demo customer already exists
    const existingCustomer = await prisma.user.findUnique({
      where: { email: "arif1@gmail.com" },
    });

    if (existingCustomer) {
      console.log("✓ Demo customer already exists");
      console.log(`  Email: arif1@gmail.com`);
      console.log(`  Password: 0123456admin`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("0123456admin", 10);

    // Create demo customer
    const customer = await prisma.user.create({
      data: {
        email: "arif1@gmail.com",
        name: "Arif Demo Customer",
        password: hashedPassword,
        role: "CUSTOMER",
        emailVerified: true,
        status: "ACTIVE",
        isBanned: false,
      },
    });

    console.log("✓ Demo customer created successfully!");
    console.log(`\n📧 Login Credentials:`);
    console.log(`   Email: arif1@gmail.com`);
    console.log(`   Password: 0123456admin`);
    console.log(`\n🧪 Test Flow:`);
    console.log(`   1. Go to http://localhost:3000/login`);
    console.log(`   2. Enter email: arif1@gmail.com`);
    console.log(`   3. Enter password: 0123456admin`);
    console.log(`   4. Click "Login Now"`);
    console.log(`\n💡 Use this to test locally while fixing Google OAuth.\n`);
  } catch (error) {
    console.error("Error seeding demo customer:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDemoCustomer();
