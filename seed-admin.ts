import { prisma } from './src/lib/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
  console.log('Starting admin user seeding...');

  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (existingAdmin) {
    console.log('Admin user already exists:', existingAdmin.email);
    return;
  }

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@medistore.com',
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: true,
      isBanned: false
    }
  });

  console.log(' Admin user created successfully!');
  console.log('Email:', admin.email);
  console.log('Password: admin123');
  console.log('Role:', admin.role);
  console.log('\n Please change the password after first login!');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error seeding admin:', error);
  process.exit(1);
});
