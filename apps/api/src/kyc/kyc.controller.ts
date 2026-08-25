import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  KycDocType,
  Role,
  type CurrentUser as CurrentUserType,
} from '@golden-knot/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { KycService } from './kyc.service';

@Controller('clients/:clientId/kyc-documents')
export class KycController {
  constructor(private kycService: KycService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('clientId') clientId: string,
    @Query('docType') docType: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserType,
  ) {
    if (!file) throw new BadRequestException('file is required');
    if (!Object.values(KycDocType).includes(docType as KycDocType)) {
      throw new BadRequestException('invalid docType');
    }
    return this.kycService.uploadDocument(
      clientId,
      docType as KycDocType,
      file,
      user,
    );
  }

  @Get()
  findForClient(@Param('clientId') clientId: string) {
    return this.kycService.findForClient(clientId);
  }

  @Get(':documentId/signed-url')
  getSignedUrl(@Param('documentId') documentId: string) {
    return this.kycService.getSignedUrl(documentId).then((url) => ({ url }));
  }

  @Patch(':documentId/verify')
  @Roles(Role.ADMIN, Role.BACK_OFFICE, Role.BRANCH_MANAGER)
  verify(
    @Param('documentId') documentId: string,
    @Body('status') status: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    if (status !== 'VERIFIED' && status !== 'REJECTED') {
      throw new BadRequestException('status must be VERIFIED or REJECTED');
    }
    return this.kycService.setVerificationStatus(documentId, status, user);
  }
}
