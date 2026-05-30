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
  {
    title: "Red Dead Redemption 2",
    slug: "red-dead-redemption-2",
    description:
      "America, 1899. After a robbery gone wrong, Arthur Morgan and the Van der Linde gang must flee across a fading frontier. A sweeping tale of loyalty, survival, and the cost of outlaw life.",
    releaseYear: 2018,
    developer: "Rockstar Games",
    publisher: "Rockstar Games",
    qualityTier: "AAA",
    youtubeVideoId: "eaW0tYpxyp0",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1q1f.webp",
    genres: ["action", "adventure"],
  },
  {
    title: "God of War",
    slug: "god-of-war-2018",
    description:
      "His vengeance against the Gods of Olympus behind him, Kratos now lives among Norse gods and monsters. He must fight to survive and teach his son to do the same in a harsh, unforgiving world.",
    releaseYear: 2018,
    developer: "Santa Monica Studio",
    publisher: "Sony Interactive Entertainment",
    qualityTier: "AAA",
    youtubeVideoId: "FyIwEFXSNQk",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1tmu.webp",
    genres: ["action", "adventure"],
  },
  {
    title: "Portal 2",
    slug: "portal-2",
    description:
      "Think with portals. Portal 2 builds on its award-winning predecessor with a host of new features including a pair of new single-player campaign characters and a co-operative multiplayer mode.",
    releaseYear: 2011,
    developer: "Valve",
    publisher: "Valve",
    qualityTier: "AAA",
    youtubeVideoId: "tax4e4hBBZc",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1rs4.webp",
    genres: ["puzzle"],
  },
  {
    title: "DOOM Eternal",
    slug: "doom-eternal",
    description:
      "The ultimate combination of speed and power, DOOM Eternal sends you ripping and tearing across dimensions in a relentless fight to stop the demonic invasion of Earth.",
    releaseYear: 2020,
    developer: "id Software",
    publisher: "Bethesda Softworks",
    qualityTier: "AAA",
    youtubeVideoId: "_ofFf9hobiU",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co3p5n.webp",
    genres: ["action", "shooter"],
  },
  {
    title: "Sekiro: Shadows Die Twice",
    slug: "sekiro-shadows-die-twice",
    description:
      "Carve your own path to vengeance in this award-winning action game from FromSoftware. Master the art of the shinobi and face off against fearsome enemies in a dark re-imagining of late 1500s Japan.",
    releaseYear: 2019,
    developer: "FromSoftware",
    publisher: "Activision",
    qualityTier: "AAA",
    youtubeVideoId: "rXMX4YJ7Lks",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2a23.webp",
    genres: ["action", "adventure"],
  },
  {
    title: "Resident Evil 2",
    slug: "resident-evil-2",
    description:
      "A deadly virus engulfs Raccoon City in 1998, plunging it into chaos. Rookie cop Leon Kennedy and college student Claire Redfield must fight to survive and escape, pursued by relentless horrors.",
    releaseYear: 2019,
    developer: "Capcom",
    publisher: "Capcom",
    qualityTier: "AAA",
    youtubeVideoId: "bSMDSG8CS_4",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1ir3.webp",
    genres: ["horror", "action"],
  },
  {
    title: "Celeste",
    slug: "celeste",
    description:
      "Help Madeline survive her inner demons on her journey to the top of Celeste Mountain in this super-tight precision platformer with a touching story about mental health and perseverance.",
    releaseYear: 2018,
    developer: "Maddy Makes Games",
    publisher: "Maddy Makes Games",
    qualityTier: "indie",
    youtubeVideoId: "70d9irlxiB4",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co3byy.webp",
    genres: ["action", "puzzle"],
  },
  {
    title: "Disco Elysium",
    slug: "disco-elysium",
    description:
      "A groundbreaking open-world role-playing game. You are a detective with a unique skill system at your disposal. Interrogate unforgettable characters, crack murders or take bribes in a city falling apart.",
    releaseYear: 2019,
    developer: "ZA/UM",
    publisher: "ZA/UM",
    qualityTier: "indie",
    youtubeVideoId: "NykYH2JDCSA",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1sfj.webp",
    genres: ["rpg", "adventure"],
  },
  {
    title: "Forza Horizon 5",
    slug: "forza-horizon-5",
    description:
      "Your ultimate horizon adventure awaits. Explore the vibrant open-world landscapes of Mexico with limitless driving action in hundreds of the world's greatest cars.",
    releaseYear: 2021,
    developer: "Playground Games",
    publisher: "Xbox Game Studios",
    qualityTier: "AAA",
    youtubeVideoId: "FYH9n37B7Yw",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co3ofx.webp",
    genres: ["racing"],
  },
  {
    title: "Rocket League",
    slug: "rocket-league",
    description:
      "Soccer meets high-flying rocket-powered cars. Compete in this physics-based vehicular sport across arenas packed with aerial acrobatics, demolitions, and last-second saves.",
    releaseYear: 2015,
    developer: "Psyonix",
    publisher: "Psyonix",
    qualityTier: "AAA",
    youtubeVideoId: "obRVb0LHOGE",
    coverImageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/cobxcp.webp",
    genres: ["sports"],
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
    update: { role: "admin", emailVerified: new Date(), passwordHash: adminHash },
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
