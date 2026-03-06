import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "./env";

// Configura el adaptador de PostgreSQL utilizando la 
// URL de la base de datos desde las variables de entorno.
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

// Utiliza una variable global para mantener la instancia de Prisma en desarrollo
// y evitar agotar las conexiones a la base de datos durante el "hot reloading".
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Crea una nueva instancia de PrismaClient o reutiliza la existente si está disponible.
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

// En entornos que no son de producción, guarda la instancia de Prisma en la variable global.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { prisma };