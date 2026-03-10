import "dotenv/config"; // Carga las variables de entorno desde el archivo .env.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";

import {
  PrismaClient,
  type VoiceCategory,
} from "../src/generated/prisma/client";

import { CANONICAL_SYSTEM_VOICE_NAMES } from "../src/features/voices/data/voice-scoping";

// Define el directorio donde se encuentran los archivos de audio de las voces del sistema.
const SYSTEM_VOICES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "system-voices",
);

// Define el esquema para validar las variables de entorno necesarias.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
});

const env = envSchema.parse(process.env);                             // Valida y parsea las variables de entorno.

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL }); // Crea un adaptador de Prisma para PostgreSQL.
const prisma = new PrismaClient({ adapter });                         // Inicializa el cliente de Prisma con el adaptador.

// Configura el cliente S3 para interactuar 
// con el almacenamiento de objetos de Cloudflare R2.
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

// Define la estructura para los metadatos de cada voz.
interface VoiceMetadata {
  description: string;
  category: VoiceCategory;
  language: string;
}

// Almacena los metadatos específicos para cada voz del sistema.
const systemVoiceMetadata: Record<string, VoiceMetadata> = {
  Aaron: {
    description: "Soothing and calm, like a self-help audiobook narrator",
    category: "AUDIOBOOK",
    language: "en-US",
  },
  Abigail: {
    description: "Friendly and conversational with a warm, approachable tone",
    category: "CONVERSATIONAL",
    language: "en-GB",
  },
  Anaya: {
    description: "Polite and professional, suited for customer service",
    category: "CUSTOMER_SERVICE",
    language: "en-IN",
  },
  Andy: {
    description: "Versatile and clear, a reliable all-purpose narrator",
    category: "GENERAL",
    language: "en-US",
  },
  Archer: {
    description: "Laid-back and reflective with a steady, storytelling pace",
    category: "NARRATIVE",
    language: "en-US",
  },
  Brian: {
    description: "Professional and helpful with a clear customer support tone",
    category: "CUSTOMER_SERVICE",
    language: "en-US",
  },
  Chloe: {
    description: "Bright and bubbly with a cheerful, outgoing personality",
    category: "CORPORATE",
    language: "en-AU",
  },
  Dylan: {
    description:
      "Thoughtful and intimate, like a quiet late-night conversation",
    category: "GENERAL",
    language: "en-US",
  },
  Emmanuel: {
    description: "Nasally and distinctive with a quirky, cartoon-like quality",
    category: "CHARACTERS",
    language: "en-US",
  },
  Ethan: {
    description: "Polished and warm with crisp, studio-quality delivery",
    category: "VOICEOVER",
    language: "en-US",
  },
  Evelyn: {
    description: "Warm Southern charm with a heartfelt, down-to-earth feel",
    category: "CONVERSATIONAL",
    language: "en-US",
  },
  Gavin: {
    description: "Calm and reassuring with a smooth, natural flow",
    category: "MEDITATION",
    language: "en-US",
  },
  Gordon: {
    description: "Warm and encouraging with an uplifting, motivational tone",
    category: "MOTIVATIONAL",
    language: "en-US",
  },
  Ivan: {
    description: "Deep and cinematic with a dramatic, movie-character presence",
    category: "CHARACTERS",
    language: "ru-RU",
  },
  Laura: {
    description: "Authentic and warm with a conversational Midwestern tone",
    category: "CONVERSATIONAL",
    language: "en-US",
  },
  Lucy: {
    description: "Direct and composed with a professional phone manner",
    category: "CUSTOMER_SERVICE",
    language: "en-US",
  },
  Madison: {
    description: "Energetic and unfiltered with a casual, chatty vibe",
    category: "PODCAST",
    language: "en-US",
  },
  Marisol: {
    description: "Confident and polished with a persuasive, ad-ready delivery",
    category: "ADVERTISING",
    language: "en-US",
  },
  Meera: {
    description: "Friendly and helpful with a clear, service-oriented tone",
    category: "CUSTOMER_SERVICE",
    language: "en-IN",
  },
  Walter: {
    description: "Old and raspy with deep gravitas, like a wise grandfather",
    category: "NARRATIVE",
    language: "en-US",
  },
};

// Lee el archivo de audio de una voz específica 
// desde el sistema de archivos.
async function readSystemVoiceAudio(name: string) {
  const filePath = path.join(SYSTEM_VOICES_DIR, `${name}.wav`); // Construye la ruta completa al archivo .wav.
  const buffer = Buffer.from(await fs.readFile(filePath));      // Lee el archivo y lo carga en un buffer.
  return { buffer, contentType: "audio/wav" };                  // Devuelve el buffer y el tipo de contenido.
}

// Sube el buffer de audio al bucket de R2.
async function uploadSystemVoiceAudio({
  key,
  buffer,
  contentType,
}: {
  key: string;
  buffer: Buffer;
  contentType: string;
}) {
  const commandInput: PutObjectCommandInput = {
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  };

  await r2.send(new PutObjectCommand(commandInput));                    // Envía la petición para subir el objeto.
}

// Función principal para una voz: la busca, 
// y si no existe la crea, o si existe la actualiza.
async function seedSystemVoice(name: string) {
  const { buffer, contentType } = await readSystemVoiceAudio(name);     // Lee el audio de la voz desde el disco.

  // Comprueba si la voz ya existe en la base de datos 
  // para evitar duplicados.
  const existingSystemVoice = await prisma.voice.findFirst({
    where: {
      variant: "SYSTEM",
      name,
    },
    select: { id: true },
  });

  if (existingSystemVoice) {
    const r2ObjectKey = `voices/system/${existingSystemVoice.id}`;       // Genera la clave para el objeto en R2.
    const meta = systemVoiceMetadata[name];                              // Obtiene los metadatos para esta voz.

    // Sube el archivo de audio a R2, 
    // actualizando el existente si es necesario.
    await uploadSystemVoiceAudio({
      key: r2ObjectKey,
      buffer,
      contentType,
    });
    // Actualiza los datos de la voz en la base de datos.
    await prisma.voice.update({
      where: { id: existingSystemVoice.id },
      data: {
        r2ObjectKey,
        ...(meta && {
          description: meta.description,
          category: meta.category,
          language: meta.language,
        }),
      },
    });
    return; // Finaliza la función si la voz ya existía.
  }

  const meta = systemVoiceMetadata[name];                               // Obtiene los metadatos si la voz es nueva.

  // Crea un nuevo registro de voz en la base de datos.
  const voice = await prisma.voice.create({
    data: {
      name,
      variant: "SYSTEM",
      orgId: null,
      ...(meta && {
        description: meta.description,
        category: meta.category,
        language: meta.language,
      }),
    },
    select: {
      id: true,
    },
  });

  const r2ObjectKey = `voices/system/${voice.id}`;                     // Crea la clave de R2 usando el ID de la nueva voz.

  try {
    // Sube el archivo de audio a R2.
    await uploadSystemVoiceAudio({
      key: r2ObjectKey,
      buffer,
      contentType,
    });

    // Actualiza el registro de la voz para añadir la clave del objeto de R2.
    await prisma.voice.update({
      where: {
        id: voice.id,
      },
      data: {
        r2ObjectKey,
      },
    });
  } catch (error) {
    // Si algo falla, elimina el registro de la voz para mantener la consistencia.
    await prisma.voice
      .delete({
        where: {
          id: voice.id,
        },
      })
      .catch(() => { }); // Ignora errores si la eliminación falla.

    throw error; // Relanza el error para detener el script.
  }
};

async function main() {
  console.log(
    `Seeding ${CANONICAL_SYSTEM_VOICE_NAMES.length} system voices...`,
  );

  // Itera sobre cada nombre de voz definido y lo procesa.
  for (const name of CANONICAL_SYSTEM_VOICE_NAMES) {
    console.log(`- ${name}`);                               // Muestra en consola la voz que se está procesando.
    await seedSystemVoice(name);                            // Llama a la función de seeding para esa voz.
  }

  console.log("System voice seed completed.");
}

// Ejecuta la función principal 
// y maneja cualquier error que pueda ocurrir.
main()
  .catch((error) => {
    console.error("Failed to seed system voices:", error);
    process.exitCode = 1;                                   // Finaliza el proceso con un código de error si algo falla.
  })
  .finally(async () => {
    await prisma.$disconnect();                             // Se asegura de cerrar la conexión a la base de datos.
  });