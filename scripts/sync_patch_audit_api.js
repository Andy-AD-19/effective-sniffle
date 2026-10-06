const fs = require("fs");
let code = fs.readFileSync("src/worker.ts", "utf8");

const regex =
  /if \(path === "\/audit-logs" && method === "GET"\) \{\s*return jsonResponse\(fallbackState\.auditLogs\);\s*\}/;

const newStr = `if (path === "/audit-logs" && method === "GET") {
        let list = fallbackState.auditLogs;
        if (env.DB) {
          try {
            const res = await env.DB.prepare("SELECT * FROM AuditLog ORDER BY createdAt DESC").all<any>();
            if (res.results && res.results.length > 0) list = res.results;
          } catch (e) { console.error("[D1 Error]", e); }
        }
        const enriched = list.map(log => {
          const u = fallbackState.users.find(u => u.id === (log.actorId || log.userId));
          return {
            ...log,
            actorId: log.actorId || log.userId,
            entityType: log.entityType || log.entity,
            actor: u ? { fullName: u.fullName, email: u.email } : null
          };
        });
        return jsonResponse(enriched);
      }`;

if (regex.test(code)) {
  fs.writeFileSync("src/worker.ts", code.replace(regex, newStr));
  console.log("Success audit API!");
} else {
  console.log("Not found regex");
}
