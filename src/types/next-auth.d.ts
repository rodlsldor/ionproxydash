// src/types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";
import "@auth/core/jwt";

import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      image?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    picture?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    picture?: string | null;
  }
}
