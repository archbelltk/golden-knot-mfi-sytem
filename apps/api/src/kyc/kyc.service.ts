import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  KycDocType,
  VerifiedStatus,
  type CurrentUser,
} from '@golden-knot/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { assertBranchAccess } from '../common/utils/branch-scope';

type ReviewDecision = 'VERIFIED' | 'REJECTED';

@Injectable()
export class KycService {
  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
    private auditService: AuditService,
  ) {}

  async uploadDocument(
    clientId: string,
    docType: KycDocType,
    file: Express.Multer.File,
    actor: CurrentUser,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) throw new NotFoundException('Client not found');
    assertBranchAccess(actor, client.branchId);

    const storageKey = await this.supabase.uploadKycDocument(
      clientId,
      file.originalname,
      file.buffer,
      file.mimetype,
    );

    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.kycDocument.create({
        data: { clientId, docType, storageKey, uploadedBy: actor.id },
      });

      await this.auditService.record(
        {
          entityType: 'KycDocument',
          entityId: doc.id,
          action: AuditAction.CREATE,
          actorId: actor.id,
          actorRole: actor.role,
          after: doc,
        },
        tx,
      );

      return doc;
    });
  }

  findForClient(clientId: string) {
    return this.prisma.kycDocument.findMany({
      where: { clientId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async getSignedUrl(documentId: string) {
    const doc = await this.prisma.kycDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return this.supabase.getKycDocumentSignedUrl(doc.storageKey);
  }

  async setVerificationStatus(
    documentId: string,
    status: ReviewDecision,
    actor: CurrentUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.kycDocument.findUnique({
        where: { id: documentId },
        include: { client: true },
      });
      if (!doc) throw new NotFoundException('Document not found');
      assertBranchAccess(actor, doc.client.branchId);
      if (doc.verifiedStatus !== VerifiedStatus.PENDING) {
        throw new BadRequestException(
          `Document has already been reviewed (status: ${doc.verifiedStatus})`,
        );
      }

      const updated = await tx.kycDocument.update({
        where: { id: documentId },
        data: { verifiedStatus: status },
      });

      await this.auditService.record(
        {
          entityType: 'KycDocument',
          entityId: documentId,
          action: AuditAction.UPDATE,
          actorId: actor.id,
          actorRole: actor.role,
          before: { verifiedStatus: doc.verifiedStatus },
          after: { verifiedStatus: updated.verifiedStatus },
        },
        tx,
      );

      return updated;
    });
  }
}
