import { prisma } from "./src/lib/prisma.js";

const SEARCHABLE_MEDICINES = [
  {
    name: "Paracetamol",
    description: "Common pain reliever and fever reducer.",
    manufacturer: "Square",
    price: 2.5,
    stock: 500,
    imageUrl: null,
    categoryName: "Pain Relief",
  },
  {
    name: "Napa",
    description: "Paracetamol brand for headache and fever.",
    manufacturer: "Beximco",
    price: 3,
    stock: 450,
    imageUrl: null,
    categoryName: "Pain Relief",
  },
  {
    name: "Ace",
    description: "Fast-acting paracetamol based analgesic.",
    manufacturer: "Square",
    price: 3,
    stock: 420,
    imageUrl: null,
    categoryName: "Pain Relief",
  },
  {
    name: "Ibuprofen",
    description: "NSAID for pain, swelling and fever relief.",
    manufacturer: "Incepta",
    price: 5,
    stock: 380,
    imageUrl: null,
    categoryName: "Pain Relief",
  },
  {
    name: "Naproxen",
    description: "Long-lasting pain relief for muscle and joint pain.",
    manufacturer: "Renata",
    price: 7,
    stock: 260,
    imageUrl: null,
    categoryName: "Pain Relief",
  },
  {
    name: "Aspirin",
    description: "Pain reliever and anti-inflammatory medicine.",
    manufacturer: "ACME",
    price: 2,
    stock: 300,
    imageUrl: null,
    categoryName: "Pain Relief",
  },
];

async function getSellerId() {
  const seller = await prisma.user.findFirst({
    where: {
      role: {
        in: ["SELLER", "ADMIN", "SUPER_ADMIN"],
      },
    },
    select: { id: true, role: true, email: true },
    orderBy: { createdAt: "asc" },
  });

  if (!seller) {
    throw new Error("No SELLER/ADMIN/SUPER_ADMIN user found. Please seed an admin or seller first.");
  }

  console.log(`Using ${seller.role} as medicine owner: ${seller.email}`);
  return seller.id;
}

async function main() {
  console.log("Seeding searchable medicines...");

  const sellerId = await getSellerId();

  for (const med of SEARCHABLE_MEDICINES) {
    const category = await prisma.category.upsert({
      where: { name: med.categoryName },
      update: {},
      create: { name: med.categoryName },
    });

    const existing = await prisma.medicine.findFirst({
      where: {
        name: {
          equals: med.name,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      await prisma.medicine.update({
        where: { id: existing.id },
        data: {
          description: med.description,
          manufacturer: med.manufacturer,
          price: med.price,
          stock: med.stock,
          categoryId: category.id,
          sellerId,
          imageUrl: med.imageUrl,
        },
      });
      console.log(`Updated medicine: ${med.name}`);
    } else {
      await prisma.medicine.create({
        data: {
          name: med.name,
          description: med.description,
          manufacturer: med.manufacturer,
          price: med.price,
          stock: med.stock,
          categoryId: category.id,
          sellerId,
          imageUrl: med.imageUrl,
        },
      });
      console.log(`Created medicine: ${med.name}`);
    }
  }

  console.log("Searchable medicine seeding complete.");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Error seeding searchable medicines:", error);
  await prisma.$disconnect();
  process.exit(1);
});
