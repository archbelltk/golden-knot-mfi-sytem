import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { CryptoModule } from './crypto/crypto.module';
import { AccountingPeriodsModule } from './accounting-periods/accounting-periods.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { MfaModule } from './mfa/mfa.module';
import { UsersModule } from './users/users.module';
import { BranchesModule } from './branches/branches.module';
import { ClientsModule } from './clients/clients.module';
import { KycModule } from './kyc/kyc.module';
import { ComplianceModule } from './compliance/compliance.module';
import { RegulatoryParamsModule } from './regulatory-params/regulatory-params.module';
import { LoanProductsModule } from './loan-products/loan-products.module';
import { LedgerModule } from './ledger/ledger.module';
import { LoanApplicationsModule } from './loan-applications/loan-applications.module';
import { LoanAccountsModule } from './loan-accounts/loan-accounts.module';
import { RepaymentsModule } from './repayments/repayments.module';
import { RegulatoryReturnsModule } from './regulatory-returns/regulatory-returns.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SupabaseModule,
    CryptoModule,
    AccountingPeriodsModule,
    AuditModule,
    AuthModule,
    MfaModule,
    UsersModule,
    BranchesModule,
    ClientsModule,
    KycModule,
    ComplianceModule,
    RegulatoryParamsModule,
    LoanProductsModule,
    LedgerModule,
    LoanApplicationsModule,
    LoanAccountsModule,
    RepaymentsModule,
    RegulatoryReturnsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
