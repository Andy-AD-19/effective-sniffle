import { PrismaClient } from "@prisma/client";
import { configureSqliteDatabaseUrl } from "../apps/api/src/modules/prisma/sqlite-url";

configureSqliteDatabaseUrl();
const prisma = new PrismaClient();

async function main() {
  const [total, manual, smoke] = await Promise.all([
    prisma.item.count(),
    prisma.item.count({ where: { category: { name: "Manual Inventory Import" } } }),
    prisma.item.count({ where: { OR: [{ code: { startsWith: "SQL-" } }, { description: { contains: "SQLite smoke" } }, { description: { contains: "smoke item" } }] } })
  ]);
  console.log(JSON.stringify({ total, manual, smoke }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
