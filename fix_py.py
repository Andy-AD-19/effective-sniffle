import re

with open('src/worker.ts', 'r', encoding='utf-8') as f:
    c = f.read()

s1 = '      let reportRows = [];'
s2 = '      if (type === "receipt" || type === "grn") {'
s3 = '        reportRows = fallbackState.items.map(enrichItem);'

start = c.find(s1)
if start != -1:
    end = c.find(s3, start) + len(s3)
    end = c.find('}', end) + 1
    
    rep = '''      let reportRows = [];
      if (env.DB) {
        try {
          if (type === "receipt" || type === "grn") {
            const notes = await env.DB.prepare("SELECT * FROM GoodsReceivingNote ORDER BY createdAt DESC").all<any>();
            reportRows = (notes.results || []).filter((r: any) => filterByDate(r.createdAt || r.receivedAt)).map(enrichReceipt);
          } else if (type === "issue" || type === "store-issue-voucher") {
            const issues = await env.DB.prepare("SELECT * FROM StockIssueVoucher ORDER BY createdAt DESC").all<any>();
            reportRows = (issues.results || []).filter((r: any) => filterByDate(r.createdAt)).map(enrichIssue);
          } else if (type === "physical-count") {
            const counts = await env.DB.prepare("SELECT * FROM PhysicalCount ORDER BY createdAt DESC").all<any>();
            reportRows = (counts.results || []).filter((r: any) => filterByDate(r.createdAt));
          } else if (type === "disposal") {
            const disposals = await env.DB.prepare("SELECT * FROM StockDisposal ORDER BY createdAt DESC").all<any>();
            reportRows = (disposals.results || []).filter((r: any) => filterByDate(r.createdAt)).map(enrichDisposal);
          } else {
            const itemsRes = await env.DB.prepare("SELECT * FROM Item").all<any>();
            const ledgerRes = await env.DB.prepare("SELECT * FROM StockLedgerEntry ORDER BY createdAt ASC").all<any>();
            const allLedger = ledgerRes.results || [];
            reportRows = (itemsRes.results || []).map((i: any) => {
              const itemLedger = allLedger.filter((l: any) => l.itemId === i.id || l.itemId === i.code).filter((r: any) => filterByDate(r.createdAt));
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
        } catch(e) {}
      } 
      if (reportRows.length === 0) {
        if (type === "receipt" || type === "grn") {
          reportRows = fallbackState.receipts.map(enrichReceipt).filter((r: any) => filterByDate(r.createdAt || r.receivedAt));
        } else if (type === "issue" || type === "store-issue-voucher") {
          reportRows = fallbackState.issues.map(enrichIssue).filter((r: any) => filterByDate(r.createdAt));
        } else if (type === "physical-count") {
          reportRows = (fallbackState.counts || []).filter((r: any) => filterByDate(r.createdAt));
        } else if (type === "disposal") {
          reportRows = fallbackState.disposals.map(enrichDisposal).filter((r: any) => filterByDate(r.createdAt));
        } else {
          reportRows = fallbackState.items.map((i: any) => {
            const itemLedger = fallbackState.ledger.filter((l: any) => l.itemId === i.id || (i.code && l.itemId === i.code)).filter((r: any) => filterByDate(r.createdAt));
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
      }'''

    c = c[:start] + rep + c[end:]
    with open('src/worker.ts', 'w', encoding='utf-8') as f:
        f.write(c)

