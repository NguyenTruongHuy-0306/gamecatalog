import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      emailVerified: Date | null;
      isBanned: boolean;
      username: string;
      needsSetup: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    emailVerified?: Date | null;
    isBanned?: boolean;
    username?: string;
    needsSetup?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    emailVerified: Date | null;
    isBanned: boolean;
    username: string;
    needsSetup: boolean;
  }
}
