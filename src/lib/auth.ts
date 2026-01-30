import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    baseURL: "http://localhost:5000",
    trustedOrigins:[process.env.FRONTEND_URL || "http://localhost:3000"],
   
    advanced: {
        disableCSRFCheck: true,
    },
    user: {
       additionalFields:{
        role:{
            type: "string",
            defaultValue: "user",
        },
        status:{
            type: "string",
            defaultValue: "active",
            required: false,
        },

       }
        
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, 
        updateAge: 60 * 60 * 24, 
    },
    emailAndPassword: {
        enabled: true,
    },
})