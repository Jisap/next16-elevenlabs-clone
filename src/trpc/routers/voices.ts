import { prisma } from "@/lib/db";
import { deleteAudio } from "@/lib/r2";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { createTRPCRouter, orgProcedure } from "../init";


export const voicesRouter = createTRPCRouter({})




