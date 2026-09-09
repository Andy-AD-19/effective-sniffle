import { BadRequestException, Injectable, NotFoundException, StreamableFile } from "@nestjs/common";
import { createReadStream, existsSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

@Injectable()
export class FileUploadService {
  private readonly uploadRoot = process.env.FMOH_UPLOAD_ROOT ?? join(process.cwd(), "uploads");

  constructor(private readonly prisma: PrismaService) {
    if (!existsSync(this.uploadRoot)) mkdirSync(this.uploadRoot, { recursive: true });
  }

  async save(actorId: string, file: any, category: string) {
    if (!file) throw new BadRequestException("Upload a file before saving.");
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) throw new BadRequestException("Unsupported file type. Use an image, PDF, or Word document.");
    if (file.size > MAX_UPLOAD_BYTES) throw new BadRequestException("File is too large. Maximum upload size is 5 MB.");
    const safeExt = extname(file.originalname || "").toLowerCase();
    const storedName = `${randomUUID()}${safeExt}`;
    const destination = join(this.uploadRoot, storedName);
    renameSync(file.path, destination);
    return this.prisma.uploadedFile.create({
      data: {
        originalName: basename(file.originalname || storedName),
        storedName,
        mimeType: file.mimetype,
        size: file.size,
        path: destination,
        category,
        uploadedById: actorId
      }
    });
  }

  async stream(id: string) {
    const file = await this.prisma.uploadedFile.findUnique({ where: { id } });
    if (!file || !existsSync(file.path)) throw new NotFoundException("Uploaded file not found");
    return {
      file,
      stream: new StreamableFile(createReadStream(file.path), {
        type: file.mimeType,
        disposition: `inline; filename="${file.originalName.replaceAll("\"", "")}"`
      })
    };
  }

  cleanupTemp(file: any) {
    if (file?.path && existsSync(file.path)) unlinkSync(file.path);
  }
}
