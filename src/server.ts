import { prisma } from "./lib/prisma.js";
import app from "./app.js";

const PORT =process.env.PORT || 5000
async function seedDefaultDeliveryCoverage() {
    const coverageRows = [
        { division: "Dhaka", district: "Dhaka", thana: "Dhanmondi", deliveryMode: "OWN_DELIVERY", fee: 60, etaDays: 1 },
        { division: "Dhaka", district: "Dhaka", thana: "Uttara", deliveryMode: "OWN_DELIVERY", fee: 70, etaDays: 1 },
        { division: "Dhaka", district: "Dhaka", thana: "Mirpur", deliveryMode: "OWN_DELIVERY", fee: 70, etaDays: 1 },
        { division: "Dhaka", district: "Gazipur", thana: "Tongi", deliveryMode: "COURIER", fee: 120, etaDays: 2 },
        { division: "Dhaka", district: "Gazipur", thana: "Joydebpur", deliveryMode: "COURIER", fee: 120, etaDays: 2 },
        { division: "Dhaka", district: "Narayanganj", thana: "Siddhirganj", deliveryMode: "COURIER", fee: 130, etaDays: 2 },
        { division: "Dhaka", district: "Narayanganj", thana: "Narayanganj Sadar", deliveryMode: "COURIER", fee: 130, etaDays: 2 },
        { division: "Chattogram", district: "Chattogram", thana: "Pahartali", deliveryMode: "COURIER", fee: 180, etaDays: 3 },
        { division: "Chattogram", district: "Chattogram", thana: "Kotwali", deliveryMode: "COURIER", fee: 180, etaDays: 3 },
        { division: "Chattogram", district: "Cox's Bazar", thana: "Cox's Bazar Sadar", deliveryMode: "COURIER", fee: 220, etaDays: 4 },
        { division: "Chattogram", district: "Cox's Bazar", thana: "Teknaf", deliveryMode: "COURIER", fee: 250, etaDays: 4 },
        { division: "Khulna", district: "Khulna", thana: "Sonadanga", deliveryMode: "COURIER", fee: 160, etaDays: 3 },
        { division: "Khulna", district: "Khulna", thana: "Khulna Sadar", deliveryMode: "COURIER", fee: 160, etaDays: 3 },
        { division: "Khulna", district: "Jashore", thana: "Jashore Sadar", deliveryMode: "COURIER", fee: 170, etaDays: 3 },
        { division: "Khulna", district: "Jashore", thana: "Bagharpara", deliveryMode: "COURIER", fee: 170, etaDays: 3 },
        { division: "Rajshahi", district: "Rajshahi", thana: "Boalia", deliveryMode: "COURIER", fee: 150, etaDays: 3 },
        { division: "Rajshahi", district: "Rajshahi", thana: "Motihar", deliveryMode: "COURIER", fee: 150, etaDays: 3 },
        { division: "Rajshahi", district: "Bogura", thana: "Bogura Sadar", deliveryMode: "COURIER", fee: 180, etaDays: 3 },
        { division: "Rajshahi", district: "Bogura", thana: "Shibganj", deliveryMode: "COURIER", fee: 180, etaDays: 3 },
    ] as const;

    for (const row of coverageRows) {
        await prisma.deliveryCoverage.upsert({
            where: {
                division_district_thana: {
                    division: row.division,
                    district: row.district,
                    thana: row.thana,
                },
            },
            update: {
                deliveryMode: row.deliveryMode,
                fee: row.fee,
                etaDays: row.etaDays,
                active: true,
            },
            create: {
                division: row.division,
                district: row.district,
                thana: row.thana,
                deliveryMode: row.deliveryMode,
                fee: row.fee,
                etaDays: row.etaDays,
                active: true,
            },
        });
    }
}

async function main(){
    try{
        await prisma.$connect();
        console.log("Database connected successfully.");
        await seedDefaultDeliveryCoverage();
        // Additional server setup code can go here
        app.listen(PORT, () => {
           console.log(`server is running on http://localhost:${PORT}`)
        })
    }
    catch(error){
        console.error("Error during main execution:", error);
        await prisma.$disconnect()
        process.exit(1)
    }
}

main();