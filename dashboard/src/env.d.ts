/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: import("lucia").User | null;
    session: import("lucia").Session | null;
    url: URL;
  }
}
