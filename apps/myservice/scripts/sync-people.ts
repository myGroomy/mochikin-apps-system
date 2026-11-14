import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { hashPin } from "../src/lib/auth";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sb = createClient(supabaseUrl, supabaseServiceKey);

async function sync() {
  console.log("Fetching branches...");
  const { data: branches, error: bErr } = await sb.from("branches").select("id, code, name");
  if (bErr || !branches) {
    console.error("Error fetching branches:", bErr);
    process.exit(1);
  }

  const branchMap = new Map(branches.map((b) => [b.code, b.id]));
  console.log("Found branches:", Object.fromEntries(branchMap));

  const bdgId = branchMap.get("CBG01BDG") || branchMap.get("BJ01")!;
  const cmhId = branchMap.get("CBG02CMH") || bdgId;
  const bksId = branchMap.get("CBGBSK03") || bdgId;

  const systemUser = "00000000-0000-0000-0000-000000000001";

  // 1. Deactivate dummy accounts (crew, viewer)
  console.log("Deactivating dummy crew and viewer accounts...");
  const { error: deactErr } = await sb
    .from("people")
    .update({ status: "inactive" })
    .in("username", ["crew", "viewer"]);
  if (deactErr) {
    console.warn("Could not deactivate crew/viewer:", deactErr.message);
  } else {
    console.log("✓ Deactivated dummy accounts (crew, viewer)");
  }

  // 2. Exact people dataset matching Stokis registry
  const peopleData = [
    {
      username: "admin",
      name: "Admin Mochikin",
      email: "admin@mochikin.id",
      pin: "778899",
      role: "role_admin",
      branch_id: bdgId,
    },
    {
      username: "dea",
      name: "Dea",
      email: "dea@mochikin.id",
      pin: "778899",
      role: "role_admin",
      branch_id: bdgId,
    },
    {
      username: "candra",
      name: "Candra",
      email: "candra@mochikin.id",
      pin: "808080",
      role: "branch_manager",
      branch_id: bdgId,
    },
    {
      username: "luthfia",
      name: "Luthfia",
      email: "luthfia@mochikin.id",
      pin: "333777",
      role: "staff",
      branch_id: bdgId,
    },
    {
      username: "nurul",
      name: "Nurul Hilma",
      email: "nurul.hilma@mochikin.id",
      pin: "333888",
      role: "staff",
      branch_id: bdgId,
    },
    {
      username: "prita",
      name: "Prita",
      email: "prita@mochikin.id",
      pin: "777222",
      role: "branch_manager",
      branch_id: cmhId,
    },
    {
      username: "rifah",
      name: "Rifah",
      email: "rifah@mochikin.id",
      pin: "676767",
      role: "staff",
      branch_id: cmhId,
    },
    {
      username: "sabat",
      name: "Sabat",
      email: "sabat@mochikin.id",
      pin: "100101",
      role: "branch_manager",
      branch_id: bksId,
    },
    {
      username: "alisha",
      name: "Alisha",
      email: "alisha@mochikin.id",
      pin: "222666",
      role: "staff",
      branch_id: bksId,
    },
    {
      username: "taufik",
      name: "Taufik Alwan",
      email: "taufik@mochikin.id",
      pin: "565678",
      role: "staff",
      branch_id: bksId,
    },
  ];

  console.log("Upserting synchronized accounts into people table...");
  for (const person of peopleData) {
    const pinHash = hashPin(person.pin);
    const { error: upsertErr } = await sb.from("people").upsert(
      {
        username: person.username,
        name: person.name,
        email: person.email,
        pin_hash: pinHash,
        role: person.role,
        branch_id: person.branch_id,
        status: "active",
        failed_attempts: 0,
        locked_until: null,
        created_by: systemUser,
      },
      { onConflict: "username" }
    );

    if (upsertErr) {
      console.error(`Failed to upsert ${person.username}:`, upsertErr.message);
    } else {
      console.log(`✓ Synchronized ${person.username} (${person.name}) -> PIN: ${person.pin}`);
    }
  }

  console.log("All accounts synchronized successfully!");
}

sync();
