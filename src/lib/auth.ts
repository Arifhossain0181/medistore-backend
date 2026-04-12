import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";

const googleClientId =
    process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
const googleClientSecret =
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
    process.env.GOOGLE_SECRET;

const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, "");

const isLocalhostUrl = (url: string) => /^http:\/\/localhost(?::\d+)?(\/|$)/i.test(url.trim());

const rawConfiguredBaseURL =
    process.env.BETTER_AUTH_URL || process.env.BACKEND_URL;
const vercelBaseURL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined;

const resolvedBaseURL = (() => {
    const configuredBaseURL = rawConfiguredBaseURL
        ? normalizeUrl(rawConfiguredBaseURL)
        : undefined;

    // On production, never use localhost callback URL if env is misconfigured.
    if (configuredBaseURL) {
        if (isLocalhostUrl(configuredBaseURL) && vercelBaseURL) {
            if (vercelBaseURL) {
                return normalizeUrl(vercelBaseURL);
            }
        } else {
            return configuredBaseURL;
        }
    }

    if (vercelBaseURL) {
        return normalizeUrl(vercelBaseURL);
    }

    return "http://localhost:5000";
})();

const trustedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_APP_URL,
    "http://localhost:3000",
    "https://medistore-frontend-ten.vercel.app",
    "https://medistore-frontend-nu.vercel.app",
].filter((origin): origin is string => Boolean(origin && origin.trim()));

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
    // Resolve to deployment URL in production to avoid localhost redirect_uri mismatches.
    baseURL: resolvedBaseURL,
    socialProviders,
    trustedOrigins,
   
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