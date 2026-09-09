import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";

const models = ["category", "unitOfMeasure", "fundingSource", "storeLocation", "department", "supplierDonor", "disposalReason"] as const;
type MasterModel = (typeof models)[number];

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  list(model: MasterModel) {
    this.assertModel(model);
    return (this.prisma[model] as any).findMany({ orderBy: { name: "asc" } });
  }

  async create(actorId: string, model: MasterModel, input: any) {
    this.assertModel(model);
    const data = this.normalize(model, input);
    const row = await (this.prisma[model] as any).create({ data });
    await this.audit.record({ actorId, action: `master.${model}.create`, entityType: model, entityId: row.id, after: row });
    return row;
  }

  async update(actorId: string, model: MasterModel, id: string, input: any) {
    this.assertModel(model);
    const before = await (this.prisma[model] as any).findUniqueOrThrow({ where: { id } });
    const row = await (this.prisma[model] as any).update({ where: { id }, data: this.normalize(model, input, true) });
    await this.audit.record({ actorId, action: `master.${model}.update`, entityType: model, entityId: id, before, after: row });
    return row;
  }

  async deleteMany(actorId: string, model: MasterModel, ids: string[]) {
    this.assertModel(model);
    const uniqueIds = [...new Set((ids ?? []).filter(Boolean))];
    if (!uniqueIds.length) throw new BadRequestException("No records selected for deletion");
    const before = await (this.prisma[model] as any).findMany({ where: { id: { in: uniqueIds } } });
    if (!before.length) throw new BadRequestException("The selected records were not found");
    try {
      const result = await (this.prisma[model] as any).deleteMany({ where: { id: { in: uniqueIds } } });
      await this.audit.record({ actorId, action: `master.${model}.deleteMany`, entityType: model, entityId: uniqueIds.join(","), before, after: result });
      return { deletedCount: result.count };
    } catch (error) {
      const code = (error as any)?.code;
      if (code === "P2003") {
        throw new BadRequestException("This record cannot be deleted because it is already used in an inventory transaction. Deactivate it instead to remove it from normal use.");
      }
      throw error;
    }
  }

  private assertModel(model: string): asserts model is MasterModel {
    if (!models.includes(model as MasterModel)) throw new BadRequestException("Unknown master-data model");
  }

  private normalize(model: MasterModel, input: any, partial = false) {
    if (model === "unitOfMeasure") return { name: input.name, symbol: input.symbol ?? input.name?.slice(0, 4), active: input.active };
    if (model === "storeLocation" || model === "department") return { name: input.name, code: input.code ?? input.name?.slice(0, 4).toUpperCase(), active: input.active };
    if (model === "supplierDonor") return { name: input.name, type: input.type ?? "PROCUREMENT", contact: input.contact, active: input.active };
    if (model === "disposalReason") return { name: input.name, description: input.description, active: input.active };
    if (!partial && !input.name) throw new BadRequestException("Name is required");
    return { name: input.name, description: input.description, active: input.active };
  }
}
