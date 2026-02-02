import { prisma } from './src/lib/prisma.js';

async function main() {
  // Check existing categories
  console.log('Checking existing categories...');
  const existingCategories = await prisma.category.findMany();
  console.log('Existing categories:', JSON.stringify(existingCategories, null, 2));

  // Create default categories if none exist
  if (existingCategories.length === 0) {
    console.log('\nCreating default categories...');
    
    const categories = [
      { name: 'Pain Relief' },
      { name: 'Antibiotics' },
      { name: 'Vitamins' },
      { name: 'Cold & Flu' },
      { name: 'Digestive Health' },
    ];

    for (const cat of categories) {
      const created = await prisma.category.create({ data: cat });
      console.log(`Created: ${created.name} (${created.id})`);
    }
  }

  // Show all categories
  const allCategories = await prisma.category.findMany();
  console.log('\n=== ALL CATEGORIES ===');
  allCategories.forEach(cat => {
    console.log(`${cat.name}: ${cat.id}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
