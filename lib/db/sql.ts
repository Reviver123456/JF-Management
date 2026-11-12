import postgres from "postgres";
import { getDatabaseUrl } from "@/lib/db/env";

type Sql = ReturnType<typeof postgres>;

let client: Sql | undefined;

export function getSql(): Sql {
  if (!client) {
    client = postgres(getDatabaseUrl(), {
      connect_timeout: 10,
      idle_timeout: 20,
      max: 10,
      prepare: false
    });
  }

  return client;
}
