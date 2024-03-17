import { PrismaClient } from '@prisma/client';

export const useTry = <T>(body: () => T): [null, T] | [unknown, null] => {
    try {
        return [null, body()];
    } catch (e) {
        return [e, null];
    }
};

export const prisma = new PrismaClient().$extends({
    name: 'memberEnsure',
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
