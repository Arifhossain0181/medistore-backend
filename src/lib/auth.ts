import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";

const googleClientId =
    process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
const googleClientSecret =
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
    process.env.GOOGLE_SECRET;

const socialProviders = googleClientId && googleClientSecret
    ? {
            google: {
                clientId: googleClientId,
                clientSecret: googleClientSecret,
            },
        }
    : undefined;

const isGoogleOAuthConfigured = Boolean(googleClientId && googleClientSecret);

console.log("[Auth] Google credentials:", {
  clientId: googleClientId ? "✓ present" : "✗ missing",
  clientSecret: googleClientSecret ? "✓ present" : "✗ missing",
});

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    // Use BETTER_AUTH_URL first (for production), then BACKEND_URL, then local default
    baseURL: process.env.BETTER_AUTH_URL || process.env.BACKEND_URL || "http://localhost:5000",
    socialProviders,
    trustedOrigins: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "https://medistore-frontend-ten.vercel.app"
    ],
   
    advanced: {
        disableCSRFCheck: true,
    },
    user: {
       additionalFields:{
        name:{
            type: "string",
            defaultValue: "",
            required: false,
        },
        role:{
            type: "string",
            defaultValue: "CUSTOMER",
            required: false,
        },
        status:{
            type: "string",
            defaultValue: "ACTIVE",
            required: false,
        },
        isBanned:{
            type: "boolean",
            defaultValue: false,
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
    }
    
}

);

// Debug: Log the actual auth structure
console.log("[Auth] Better Auth initialized");
console.log("[Auth] auth keys:", Object.keys(auth).slice(0, 10));
console.log("[Auth] socialProviders check:", {
  hasOptions: !!auth.options,
  optionsKeys: auth.options ? Object.keys(auth.options).slice(0, 10) : "no options",
    googleOAuthConfigured: isGoogleOAuthConfigured,
});