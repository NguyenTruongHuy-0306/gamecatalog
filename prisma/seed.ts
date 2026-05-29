import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const genres = [
  { name: "Action", slug: "action" },
  { name: "Adventure", slug: "adventure" },
  { name: "RPG", slug: "rpg" },
  { name: "Strategy", slug: "strategy" },
  { name: "Sports", slug: "sports" },
  { name: "Racing", slug: "racing" },
  { name: "Shooter", slug: "shooter" },
  { name: "Simulation", slug: "simulation" },
  { name: "Horror", slug: "horror" },
  { name: "Puzzle", slug: "puzzle" },
];

const games = [
  {
    title: "The Witcher 3: Wild Hunt",
    slug: "the-witcher-3-wild-hunt",
    description:
      "An epic open-world RPG where you play as Geralt of Rivia, a monster hunter in a vast fantasy world filled with meaningful choices and stunning visuals.",
    releaseYear: 2015,
    developer: "CD Projekt Red",
    publisher: "CD Projekt",
    qualityTier: "AAA",
    youtubeVideoId: "c0i88t0Kacs",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.webp",
    genres: ["rpg", "adventure"],
  },
  {
    title: "Elden Ring",
    slug: "elden-ring",
    description:
      "A critically acclaimed action RPG set in the Lands Between, featuring challenging combat, deep lore, and a massive open world designed with FromSoftware's signature style.",
    releaseYear: 2022,
    developer: "FromSoftware",
    publisher: "Bandai Namco",
    qualityTier: "AAA",
    youtubeVideoId: "E3Huy2cdih0",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.webp",
    genres: ["action", "rpg"],
  },
  {
    title: "Hollow Knight",
    slug: "hollow-knight",
    description:
      "A challenging 2D action adventure through a vast underground kingdom of insects and heroes. Forge your own path in a huge underground world.",
    releaseYear: 2017,
    developer: "Team Cherry",
    publisher: "Team Cherry",
    qualityTier: "indie",
    youtubeVideoId: "UAO2urG23S4",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2xt9.webp",
    genres: ["action", "adventure"],
  },
  {
    title: "Civilization VI",
    slug: "civilization-vi",
    description:
      "Build an empire to stand the test of time. Explore a new land, research technology, conquer your enemies, and go head-to-head with history's greatest leaders.",
    releaseYear: 2016,
    developer: "Firaxis Games",
    publisher: "2K Games",
    qualityTier: "AAA",
    youtubeVideoId: "5KdE0p2joJw",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyf.webp",
    genres: ["strategy", "simulation"],
  },
  {
    title: "Stardew Valley",
    slug: "stardew-valley",
    description:
      "You've inherited your grandfather's old farm plot. Armed with hand-me-down tools and a few coins, you set out to begin your new life in Pelican Town.",
    releaseYear: 2016,
    developer: "ConcernedApe",
    publisher: "ConcernedApe",
    qualityTier: "indie",
    youtubeVideoId: "ot7uXNQskhs",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/xrpmydnu9rpxvxfjkiu7.webp",
    genres: ["simulation", "rpg"],
  },
  {
    title: "Hades",
    slug: "hades",
    description:
      "Defy the god of the dead as you hack and slash your way out of the Underworld in this rogue-like dungeon crawler from the creators of Bastion.",
    releaseYear: 2020,
    developer: "Supergiant Games",
    publisher: "Supergiant Games",
    qualityTier: "indie",
    youtubeVideoId: "91t0ha9x0AE",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2gk9.webp",
    genres: ["action", "rpg"],
  },
];

async function main() {
  console.log("Seeding genres...");
  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: {},
      create: genre,
    });
  }

  console.log("Seeding admin user...");
  const adminHash = await bcrypt.hash("Admin@123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@gamecatalog.dev" },
    update: {},
    create: {
      email: "admin@gamecatalog.dev",
      username: "admin",
      passwordHash: adminHash,
      emailVerified: new Date(),
      role: "admin",
      bio: "GameCatalog site administrator.",
    },
  });

  console.log("Seeding test user...");
  const testHash = await bcrypt.hash("Test@123!", 12);
  const existingTest = await prisma.user.findFirst({
    where: {
      OR: [
        { email: "testuser@gamecatalog.dev" },
        { username: { equals: "testuser", mode: "insensitive" } },
      ],
    },
  });
  if (existingTest) {
    await prisma.user.update({
      where: { id: existingTest.id },
      data: {
        email: "testuser@gamecatalog.dev",
        username: "testuser",
        passwordHash: testHash,
        emailVerified: new Date(),
        role: "user",
        bio: "Just a regular gamer testing things out.",
      },
    });
  } else {
    await prisma.user.create({
      data: {
        email: "testuser@gamecatalog.dev",
        username: "testuser",
        passwordHash: testHash,
        emailVerified: new Date(),
        role: "user",
        bio: "Just a regular gamer testing things out.",
      },
    });
  }

  console.log("Seeding games...");
  for (const game of games) {
    const { genres: gameGenres, ...gameData } = game;
    const createdGame = await prisma.game.upsert({
      where: { slug: gameData.slug },
      update: {},
      create: {
        ...gameData,
        isPublished: true,
        createdById: admin.id,
      },
    });

    for (const genreSlug of gameGenres) {
      const genre = await prisma.genre.findUnique({ where: { slug: genreSlug } });
      if (genre) {
        await prisma.gameGenre.upsert({
          where: { gameId_genreId: { gameId: createdGame.id, genreId: genre.id } },
          update: {},
          create: { gameId: createdGame.id, genreId: genre.id },
        });
      }
    }

    await prisma.gameVersion.create({
      data: {
        gameId: createdGame.id,
        versionLabel: "v1.0.0",
        releaseDate: new Date(`${gameData.releaseYear}-01-01`),
        notes: "Initial release",
        createdById: admin.id,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Admin credentials:    admin@gamecatalog.dev / Admin@123!");
  console.log("Test user credentials: testuser@gamecatalog.dev / Test@123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
