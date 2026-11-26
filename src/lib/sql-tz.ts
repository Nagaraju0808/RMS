import { Prisma } from "@prisma/client";
// Prisma stores DateTime as UTC "timestamp without time zone". Business hours and days must be bucketed in the
// restaurant's local time, so SQL that groups by hour/day converts first.
const TZ = /^[A-Za-z_]+\/[A-Za-z_]+$/.test(process.env.APP_TZ || "") ? process.env.APP_TZ! : "Asia/Kolkata";
export const localTs = (col: string) => Prisma.raw(`(${col} AT TIME ZONE 'UTC' AT TIME ZONE '${TZ}')`);
