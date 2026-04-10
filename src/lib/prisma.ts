import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client.js'

const rawDatabaseUrl = `${process.env.DATABASE_URL ?? ""}`;

function withExplicitSslMode(url: string): string {
	if (!url) return url;

	try {
		const parsed = new URL(url);
		const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();
		if (!sslMode || sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
			parsed.searchParams.set("sslmode", "verify-full");
		}
		return parsed.toString();
	} catch {
		// Keep original string if URL parsing fails.
		return url;
	}
}

const connectionString = withExplicitSslMode(rawDatabaseUrl);

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export { prisma }