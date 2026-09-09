import { PrismaClient } from "@prisma/client";
import { configureSqliteDatabaseUrl } from "../apps/api/src/modules/prisma/sqlite-url";

configureSqliteDatabaseUrl();
const prisma = new PrismaClient();

async function main() {
  const manualItems = await prisma.item.findMany({
    where: { category: { name: "Manual Inventory Import" } },
    select: { id: true }
  });
  const itemIds = manualItems.map((item) => item.id);
  const result = await prisma.item.deleteMany({ where: { id: { in: itemIds } } });
  await prisma.auditLog.deleteMany({ where: { action: { in: ["manual_inventory.import_item", "manual_inventory.seed_item"] } } });
  console.log(JSON.stringify({ deletedManualItems: result.count }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
