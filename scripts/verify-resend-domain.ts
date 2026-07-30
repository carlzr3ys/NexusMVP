import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv();

async function main() {
  const key = process.env.RESEND_API_KEY!;
  const list = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = (await list.json()) as {
    data: Array<{ id: string; name: string; status: string }>;
  };
  console.log("domains:", data.data);

  const airee = data.data.find((d) => d.name === "airee.online");
  if (!airee) {
    console.log("airee.online not found");
    return;
  }

  console.log("Triggering verify for", airee.id);
  const res = await fetch(`https://api.resend.com/domains/${airee.id}/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
  });
  console.log("verify:", res.status, await res.text());

  await new Promise((r) => setTimeout(r, 3000));
  const get = await fetch(`https://api.resend.com/domains/${airee.id}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  console.log("status after:", await get.text());
}

main().catch(console.error);
