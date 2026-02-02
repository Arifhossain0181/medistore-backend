import { prisma } from './src/lib/prisma.js';

async function main() {
  // Check existing medicines
  console.log('Checking existing medicines...');
  const existingMedicines = await prisma.medicine.findMany({
    include: { category: true, seller: true }
  });
  
  if (existingMedicines.length > 0) {
    console.log('\n=== EXISTING MEDICINES ===');
    existingMedicines.forEach(med => {
      console.log(`\nID: ${med.id}`);
      console.log(`Name: ${med.name}`);
      console.log(`Category: ${med.category.name}`);
      console.log(`Seller: ${med.seller.name} (${med.sellerId})`);
      console.log(`Price: ${med.price}, Stock: ${med.stock}`);
    });
  } else {
    console.log('No medicines found in database.');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
