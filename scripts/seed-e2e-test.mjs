import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const E2E_SITE_ID = "E2E-SITE-001";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return env;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

const checklistConfig = {
  customItems: {},
  customItemsBySection: {},
  diagMonitorCounts: {},
  itemLabelsBySection: {},
  removedDefaultItemsBySection: {},
  selectedTabs: ["server"],
  setCounts: { server: 1, synapse: 1, switch: 1, storage: 1, environment: 1, diag: 1 },
  selectedItems: { server: ["System-Error LED Status", "CPU Status", "Memory Status"] }
};

const contractDetails = {
  contracts: [
    {
      contractNumber: "E2E-CON-001",
      pmCycle: "ครึ่งปี",
      visitCount: "2",
      visitMonths: ["05", "11"],
      checklistConfig
    }
  ],
  checklistConfig
};

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (usersError) {
  console.error(usersError.message);
  process.exit(1);
}

const visarut = usersData.users.find((u) => u.email === "visarut@jfav.co.th");
const owner = "visarut raengmoonpruek";

if (visarut?.id) {
  await admin.auth.admin.updateUserById(visarut.id, {
    user_metadata: {
      ...(visarut.user_metadata ?? {}),
      full_name: owner
    }
  });
}

const visitDate = todayUtc();
const visitTime = "09:00:00";

await admin.from("pm_jobs").delete().eq("site_id", E2E_SITE_ID);
await admin.from("sites").delete().eq("id", E2E_SITE_ID);

const { error: siteError } = await admin.from("sites").insert({
  id: E2E_SITE_ID,
  site: "E2E โรงพยาบาลทดสอบ",
  customer: "JF Advance Med (E2E)",
  contact: "คุณทดสอบ",
  phone: "0812345678",
  province: "กรุงเทพมหานคร",
  region: "กรุงเทพและปริมณฑล",
  owner,
  contract: "E2E-CON-001",
  contract_details: contractDetails,
  address: "123 Test Road",
  department: "IT",
  email: "e2e@jfav.co.th"
});

if (siteError) {
  console.error("SITE:", siteError.message);
  process.exit(1);
}

const pendingJobId = `PM-E2E-${crypto.randomUUID()}`;
const completedJobId = `PM-E2E-DONE-${crypto.randomUUID().slice(0, 8)}`;

const fieldValues = {
  "server|Server 1|0|Location": "Server room",
  "server|Server 1|0|Manufacturer": "Dell",
  "server|Server 1|0|Host Name": "e2e-host",
  "server|Server 1|0|Model": "R750",
  "server|Server 1|0|S/N or S/T": "SN-E2E-001",
  "server|Server 1|0|IP Address": "10.0.0.10",
  "server|Server 1|0|ESX Version": "8.0",
  "server|Server 1|0|MT": "N/A"
};

const workDetailsCompleted = {
  pmOrderNo: "26110001",
  finalStatus: "normal",
  inspector: owner,
  signerName: "ผู้รับรองทดสอบ",
  summaryNote: "E2E automated test complete",
  savedAt: new Date().toISOString(),
  startTime: "09:00",
  endTime: "10:30",
  fieldValues,
  checkResults: {
    "server|Server 1|serverChecklist|System-Error LED Status": "ok",
    "server|Server 1|serverChecklist|CPU Status": "ok",
    "server|Server 1|serverChecklist|Memory Status": "ok"
  },
  checklistByContract: {
    "0": {
      fieldValues,
      checkResults: {
        "server|Server 1|serverChecklist|System-Error LED Status": "ok",
        "server|Server 1|serverChecklist|CPU Status": "ok",
        "server|Server 1|serverChecklist|Memory Status": "ok"
      },
      checkNotes: {},
      radioValues: {},
      checklistSnapshot: []
    }
  }
};

const { error: jobsError } = await admin.from("pm_jobs").insert([
  {
    id: pendingJobId,
    site_id: E2E_SITE_ID,
    status: "pending",
    pm_cycle: "ครึ่งปี",
    visit_date: visitDate,
    visit_time: visitTime,
    owner,
    work_details: { pmOrderNo: "26110002" }
  },
  {
    id: completedJobId,
    site_id: E2E_SITE_ID,
    status: "completed",
    pm_cycle: "ครึ่งปี",
    visit_date: visitDate,
    visit_time: "13:00:00",
    owner,
    start_time: "13:00:00",
    end_time: "14:00:00",
    result: "ปกติ",
    work_details: workDetailsCompleted
  }
]);

if (jobsError) {
  console.error("JOBS:", jobsError.message);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, siteId: E2E_SITE_ID, owner, visitDate, pendingJobId, completedJobId }, null, 2));
