import { PrismaClient } from "@prisma/client";

// FIX (2026-04): Use lazy singleton pattern in ALL environments.
// The old pattern created PrismaClient eagerly in production (module-level),
// which caused 3 separate Prisma library engine instances to be loaded at
// server startup → 300–900 MB of native memory outside V8 heap → OOM.
// Now: client is created on first access, not at import time.

declare global {
  var prismaLegacy: PrismaClient | undefined;
}

function getPrisma(): PrismaClient {
  if (!globalThis.prismaLegacy) {
    globalThis.prismaLegacy = new PrismaClient();
  }
  return globalThis.prismaLegacy;
}

// Proxy ensures the instance is created only on first property access,
// not when this module is imported.
const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export { prisma };
export default prisma;
