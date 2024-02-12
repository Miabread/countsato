import { PrismaClient } from "@prisma/client";

const intervals = [
  { label: "year", seconds: 31536000 },
  { label: "month", seconds: 2592000 },
  { label: "day", seconds: 86400 },
  { label: "hour", seconds: 3600 },
  { label: "minute", seconds: 60 },
  { label: "second", seconds: 1 },
];

export const timeSince = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const interval = intervals.find((i) => i.seconds < seconds)!;
  const count = Math.floor(seconds / interval.seconds);
  return `${count} ${interval.label}${count !== 1 ? "s" : ""} ago`;
};

export const prisma = new PrismaClient().$extends({
  name: "memberEnsure",
  model: {
    member: {
      async ensure(guildId: string, userId: string) {
        return await prisma.member.upsert({
          where: {
            guildId_userId: {
              guildId,
              userId,
            },
          },
          create: {
            guild: {
              connectOrCreate: {
                where: {
                  id: guildId,
                },
                create: {
                  id: guildId,
                },
              },
            },
            user: {
              connectOrCreate: {
                where: {
                  id: userId,
                },
                create: {
                  id: userId,
                },
              },
            },
          },
          update: {},
        });
      },
    },
  },
});
