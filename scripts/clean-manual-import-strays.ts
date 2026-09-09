import { PrismaClient } from "@prisma/client";
import { configureSqliteDatabaseUrl } from "../apps/api/src/modules/prisma/sqlite-url";

configureSqliteDatabaseUrl();
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.item.findMany({
    where: { category: { name: "Manual Inventory Import" } },
    select: { id: true, code: true, description: true }
  });
  const strayRows = rows.filter((row) => /committee|ፊርማ|ቆጠራ ኮሚቴ|signature/i.test(row.description) || row.code === "ፊርማ");
  const deleted = await prisma.item.deleteMany({ where: { id: { in: strayRows.map((row) => row.id) } } });
  console.log(JSON.stringify({ strays: strayRows, deleted: deleted.count }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
