import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      emailVerified: true,
      isBanned: true,
      createdAt: true,
      deletedAt: true,
      googleId: true,
    },
    orderBy: { createdAt: "asc" },
  });
  console.table(users.map(u => ({
    username: u.username,
    email: u.email,
    role: u.role,
    emailVerified: u.emailVerified ? "yes" : "no",
    google: u.googleId ? "yes" : "no",
    banned: u.isBanned,
    deleted: u.deletedAt ? "yes" : "no",
    createdAt: u.createdAt.toISOString().slice(0, 10),
  })));
  await prisma.$disconnect();
}

main();
