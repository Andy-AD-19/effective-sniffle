import { PrismaClient } from "@prisma/client";
import { configureSqliteDatabaseUrl } from "../apps/api/src/modules/prisma/sqlite-url";

configureSqliteDatabaseUrl();
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.item.findMany({
    where: {
      category: { name: "Manual Inventory Import" },
      OR: [
        { description: { contains: "ስም" } },
        { description: { contains: "ቀን" } },
        { description: { contains: "ፊርማ" } },
        { code: { contains: "MIHRET-0669" } },
        { code: { contains: "SIGN" } }
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { code: true, description: true, maximumStock: true, createdAt: true }
  });
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
