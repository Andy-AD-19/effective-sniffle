const fs = require("fs");
let code = fs.readFileSync("src/worker.ts", "utf8");

const startIndex = code.indexOf("    // 16. Reports (JSON, Excel, PDF)");
const endIndex = code.indexOf(
  "    // 17. Uploads Mock & Retrieval",
  startIndex,
);

const newStr = `    // 16. Reports (JSON, Excel, PDF)
    if (path.startsWith("/reports/")) {
      const url = new URL(request.url);
      const cleanPath = path.replace(/^\\/reports\\//, "");
      const isXlsx = cleanPath.endsWith(".xlsx");
      const isPdf = cleanPath.endsWith(".pdf");
      const type = cleanPath.replace(/\\.(xlsx|pdf)$/, "");

      const dateFrom = url.searchParams.get("dateFrom");
      const dateTo = url.searchParams.get("dateTo");

      const filterByDate = (dateStr) => {
        if (!dateStr) return true;
        const d = new Date(dateStr);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo) {
          const dt = new Date(dateTo);
          dt.setHours(23, 59, 59, 999);
          if (d > dt) return false;
        }
        return true;
      };

      let reportRows = [];
      if (type === "receipt" || type === "grn") {
        reportRows = fallbackState.receipts.map(enrichReceipt).filter(r => filterByDate(r.createdAt || r.receivedAt));
      } else if (type === "issue" || type === "store-issue-voucher") {
        reportRows = fallbackState.issues.map(enrichIssue).filter(r => filterByDate(r.createdAt));
      } else if (type === "physical-count") {
        reportRows = (fallbackState.counts || []).filter(r => filterByDate(r.createdAt));
      } else if (type === "disposal") {
        reportRows = fallbackState.disposals.map(enrichDisposal).filter(r => filterByDate(r.createdAt));
      } else {
        // stock-status, valuation, balance, fast-moving, etc
        reportRows = fallbackState.items.map(enrichItem);
      }

      if (isXlsx) {
        const csvRows = ["Code,Data\\n"];
        reportRows.forEach(r => csvRows.push(JSON.stringify(r.id || r.code)));
        return new Response(csvRows.join("\\n"), {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": \`attachment; filename="\${type}-report.xlsx"\`,
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      if (isPdf) {
        return new Response("FMOH INVENTORY REPORT\\n" + JSON.stringify(reportRows.map(r => r.id || r.code)), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": \`attachment; filename="\${type}-report.pdf"\`,
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      return jsonResponse(reportRows);
    }

`;

fs.writeFileSync(
  "src/worker.ts",
  code.substring(0, startIndex) + newStr + code.substring(endIndex),
);
console.log("Success reports");
