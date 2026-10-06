const fs = require('fs');
let c = fs.readFileSync('src/worker.ts', 'utf8');
const search = \      let reportRows = [];
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
      }\;
const replace = \      let reportRows = [];
      
      if (env.DB) {
        try {
          if (type === "receipt" || type === "grn") {
            const notes = await env.DB.prepare("SELECT * FROM GoodsReceivingNote ORDER BY createdAt DESC").all();
            reportRows = (notes.results || []).filter(r => filterByDate(r.createdAt || r.receivedAt)).map(enrichReceipt);
          } else if (type === "issue" || type === "store-issue-voucher") {
            const issues = await env.DB.prepare("SELECT * FROM StockIssueVoucher ORDER BY createdAt DESC").all();
            reportRows = (issues.results || []).filter(r => filterByDate(r.createdAt)).map(enrichIssue);
          } else if (type === "physical-count") {
            const counts = await env.DB.prepare("SELECT * FROM PhysicalCount ORDER BY createdAt DESC").all();
            reportRows = (counts.results || []).filter(r => filterByDate(r.createdAt));
          } else if (type === "disposal") {
            const disposals = await env.DB.prepare("SELECT * FROM StockDisposal ORDER BY createdAt DESC").all();
            reportRows = (disposals.results || []).filter(r => filterByDate(r.createdAt)).map(enrichDisposal);
          } else {
            // stock-status, valuation, etc.
            const itemsRes = await env.DB.prepare("SELECT * FROM Item").all();
            const ledgerRes = await env.DB.prepare("SELECT * FROM StockLedgerEntry ORDER BY createdAt ASC").all();
            const allLedger = ledgerRes.results || [];
            reportRows = (itemsRes.results || []).map(i => {
              const itemLedger = allLedger.filter(l => l.itemId === i.id || l.itemId === i.code).filter(r => filterByDate(r.createdAt));
              let currentStock = 0;
              for (const m of itemLedger) {
                const qtyIn = Number(m.quantityIn || (m.entryType === "RECEIPT" || m.quantity > 0 ? Math.abs(Number(m.quantity || 0)) : 0));
                const qtyOut = Number(m.quantityOut || (m.entryType === "ISSUE" || m.quantity < 0 ? Math.abs(Number(m.quantity || 0)) : 0));
                currentStock += (qtyIn > 0 ? qtyIn : -qtyOut);
              }
              const enriched = enrichItem(i);
              return { ...enriched, currentStock };
            });
          }
        } catch(e) { console.error("[D1 Error]", e); }
      }
      
      if (reportRows.length === 0) {
        if (type === "receipt" || type === "grn") {
          reportRows = fallbackState.receipts.map(enrichReceipt).filter(r => filterByDate(r.createdAt || r.receivedAt));
        } else if (type === "issue" || type === "store-issue-voucher") {
          reportRows = fallbackState.issues.map(enrichIssue).filter(r => filterByDate(r.createdAt));
        } else if (type === "physical-count") {
          reportRows = (fallbackState.counts || []).filter(r => filterByDate(r.createdAt));
        } else if (type === "disposal") {
          reportRows = fallbackState.disposals.map(enrichDisposal).filter(r => filterByDate(r.createdAt));
        } else {
          reportRows = fallbackState.items.map(i => {
            const itemLedger = fallbackState.ledger.filter(l => l.itemId === i.id || (i.code && l.itemId === i.code)).filter(r => filterByDate(r.createdAt));
            let currentStock = 0;
            for (const m of itemLedger) {
              const qtyIn = Number(m.quantityIn || (m.entryType === "RECEIPT" || m.quantity > 0 ? Math.abs(Number(m.quantity || 0)) : 0));
              const qtyOut = Number(m.quantityOut || (m.entryType === "ISSUE" || m.quantity < 0 ? Math.abs(Number(m.quantity || 0)) : 0));
              currentStock += (qtyIn > 0 ? qtyIn : -qtyOut);
            }
            const enriched = enrichItem(i);
            return { ...enriched, currentStock };
          });
        }
      }
\
c = c.replace(search, replace);
fs.writeFileSync('src/worker.ts', c);
