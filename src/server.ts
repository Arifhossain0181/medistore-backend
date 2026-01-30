import { prisma } from "./lib/prisma.js";
import app from "./app.js";

const PORT =process.env.PORT || 5000
async function main(){
    try{
        await prisma.$connect();
        console.log("Database connected successfully.");
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