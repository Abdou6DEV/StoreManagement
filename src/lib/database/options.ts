import { prisma } from "../prismaClient";

export async function getOption(key: string): Promise<string | null> {
  const option = await prisma.option.findUnique({ where: { key } });
  return option ? option.value : null;
}

export async function setOption(key: string, value: string): Promise<void> {
  await prisma.option.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
