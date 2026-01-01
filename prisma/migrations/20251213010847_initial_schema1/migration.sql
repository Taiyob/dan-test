-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('subscriber', 'admin', 'employee');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('stripe');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "OTPType" AS ENUM ('email_verification', 'login_verification', 'password_reset', 'two_factor');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('active', 'inactive', 'draft', 'archived');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'canceled', 'expired', 'pending');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('payment', 'refund', 'renewal', 'adjustment');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('pre_operation', 'daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'preventive_maintenance', 'corrective_maintenance', 'repair', 'safety', 'calibration', 'performance', 'load_test', 'electrical', 'structural', 'environmental', 'fire_safety', 'installation', 'post_incident', 'shutdown', 'commissioning', 'special');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('scheduled', 'not_scheduled', 'in_progress', 'completed', 'overdue', 'due_soon', 'cancelled');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'one_time');

-- CreateEnum
CREATE TYPE "NotificationMethod" AS ENUM ('sms', 'email', 'both');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('monthly', 'quarterly', 'annual', 'custom');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('ready', 'not_available');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'subscriber',
    "designation" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'pending_verification',
    "password" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "terms" BOOLEAN,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OTP" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "type" "OTPType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OTP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "status" "PlanStatus" NOT NULL DEFAULT 'active',
    "features" TEXT[],
    "limits" JSON,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "stripeCustomerID" TEXT NOT NULL DEFAULT '0000',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'pending',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paymentGateway" "PaymentGateway" DEFAULT 'stripe',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "renewalAt" TIMESTAMP(3),
    "amountPaid" DECIMAL(10,2),
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessControl" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "membershipId" UUID NOT NULL,
    "maxClients" INTEGER NOT NULL DEFAULT 25,
    "maxEmployees" INTEGER NOT NULL DEFAULT 10,
    "maxCranes" INTEGER NOT NULL DEFAULT 50,
    "maxStorageGB" INTEGER NOT NULL DEFAULT 10,
    "enableAPI" BOOLEAN NOT NULL DEFAULT false,
    "enableReports" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "membershipId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "paymentGateway" "PaymentGateway" NOT NULL DEFAULT 'stripe',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "transactionType" "TransactionType" NOT NULL DEFAULT 'payment',
    "externalId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "period" TEXT NOT NULL,
    "generated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sizeBytes" INTEGER,
    "fileUrls" JSONB,
    "status" "ReportStatus" NOT NULL DEFAULT 'not_available',
    "clientId" UUID,
    "employeeId" UUID,
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company" TEXT NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'active',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "cranes" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "additionalNote" TEXT,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "employeeId" TEXT,
    "role" TEXT,
    "additionalNotes" TEXT,
    "employerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CertificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCertification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employeeId" UUID NOT NULL,
    "certificationTemplateId" UUID NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "additionalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmployeeCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT,
    "model" TEXT,
    "description" TEXT,
    "serialNo" TEXT,
    "clientId" UUID NOT NULL,
    "location" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "inspectionType" "InspectionType" NOT NULL,
    "status" "InspectionStatus",
    "dueDate" TIMESTAMP(3),
    "lastInspected" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "location" TEXT,
    "inspectionNotes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionInspectors" (
    "inspectionId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionInspectors_pkey" PRIMARY KEY ("inspectionId","employeeId")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "notificationMethod" "NotificationMethod" NOT NULL,
    "reminderType" "ReminderType" NOT NULL,
    "reminderTemplateId" TEXT,
    "manualReminderMessage" TEXT,
    "reminderDate" TIMESTAMP(3),
    "additionalNotes" TEXT,
    "reminderStatus" TEXT DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "smsTemplateId" UUID,
    "emailTemplateId" UUID,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderInspector" (
    "reminderId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderInspector_pkey" PRIMARY KEY ("reminderId","employeeId")
);

-- CreateTable
CREATE TABLE "SMSTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSLog" (
    "id" TEXT NOT NULL,
    "messageSid" TEXT NOT NULL,
    "fromPhone" TEXT,
    "toPhone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "body" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "mailtrapId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "userId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "htmlBody" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "review" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "OTP_identifier_type_verified_idx" ON "OTP"("identifier", "type", "verified");

-- CreateIndex
CREATE INDEX "OTP_expiresAt_idx" ON "OTP"("expiresAt");

-- CreateIndex
CREATE INDEX "OTP_userId_idx" ON "OTP"("userId");

-- CreateIndex
CREATE INDEX "OTP_createdAt_idx" ON "OTP"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_key" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_planId_idx" ON "Membership"("planId");

-- CreateIndex
CREATE INDEX "Membership_subscriptionStatus_idx" ON "Membership"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "Membership_paymentStatus_idx" ON "Membership"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "AccessControl_membershipId_key" ON "AccessControl"("membershipId");

-- CreateIndex
CREATE INDEX "Transaction_membershipId_idx" ON "Transaction"("membershipId");

-- CreateIndex
CREATE INDEX "Transaction_paymentStatus_idx" ON "Transaction"("paymentStatus");

-- CreateIndex
CREATE INDEX "Transaction_paymentGateway_idx" ON "Transaction"("paymentGateway");

-- CreateIndex
CREATE INDEX "Report_clientId_idx" ON "Report"("clientId");

-- CreateIndex
CREATE INDEX "Report_employeeId_idx" ON "Report"("employeeId");

-- CreateIndex
CREATE INDEX "Report_uploadedById_idx" ON "Report"("uploadedById");

-- CreateIndex
CREATE INDEX "Report_type_idx" ON "Report"("type");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Client_ownerId_idx" ON "Client"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_employerId_idx" ON "Employee"("employerId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificationTemplate_name_key" ON "CertificationTemplate"("name");

-- CreateIndex
CREATE INDEX "CertificationTemplate_name_idx" ON "CertificationTemplate"("name");

-- CreateIndex
CREATE INDEX "EmployeeCertification_employeeId_idx" ON "EmployeeCertification"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeCertification_certificationTemplateId_idx" ON "EmployeeCertification"("certificationTemplateId");

-- CreateIndex
CREATE INDEX "EmployeeCertification_expiryDate_idx" ON "EmployeeCertification"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_serialNo_key" ON "Asset"("serialNo");

-- CreateIndex
CREATE INDEX "Asset_clientId_idx" ON "Asset"("clientId");

-- CreateIndex
CREATE INDEX "Inspection_clientId_idx" ON "Inspection"("clientId");

-- CreateIndex
CREATE INDEX "Inspection_assetId_idx" ON "Inspection"("assetId");

-- CreateIndex
CREATE INDEX "Inspection_inspectionType_idx" ON "Inspection"("inspectionType");

-- CreateIndex
CREATE INDEX "Inspection_status_idx" ON "Inspection"("status");

-- CreateIndex
CREATE INDEX "Inspection_dueDate_idx" ON "Inspection"("dueDate");

-- CreateIndex
CREATE INDEX "InspectionInspectors_employeeId_idx" ON "InspectionInspectors"("employeeId");

-- CreateIndex
CREATE INDEX "Reminder_clientId_idx" ON "Reminder"("clientId");

-- CreateIndex
CREATE INDEX "Reminder_assetId_idx" ON "Reminder"("assetId");

-- CreateIndex
CREATE INDEX "Reminder_reminderDate_idx" ON "Reminder"("reminderDate");

-- CreateIndex
CREATE INDEX "Reminder_reminderType_idx" ON "Reminder"("reminderType");

-- CreateIndex
CREATE INDEX "ReminderInspector_employeeId_idx" ON "ReminderInspector"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "SMSLog_messageSid_key" ON "SMSLog"("messageSid");

-- CreateIndex
CREATE INDEX "SMSLog_toPhone_idx" ON "SMSLog"("toPhone");

-- CreateIndex
CREATE INDEX "SMSLog_status_idx" ON "SMSLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_name_key" ON "EmailTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_mailtrapId_key" ON "EmailTemplate"("mailtrapId");

-- CreateIndex
CREATE INDEX "Testimonial_userId_idx" ON "Testimonial"("userId");

-- AddForeignKey
ALTER TABLE "OTP" ADD CONSTRAINT "OTP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessControl" ADD CONSTRAINT "AccessControl_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCertification" ADD CONSTRAINT "EmployeeCertification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCertification" ADD CONSTRAINT "EmployeeCertification_certificationTemplateId_fkey" FOREIGN KEY ("certificationTemplateId") REFERENCES "CertificationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionInspectors" ADD CONSTRAINT "InspectionInspectors_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionInspectors" ADD CONSTRAINT "InspectionInspectors_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_smsTemplateId_fkey" FOREIGN KEY ("smsTemplateId") REFERENCES "SMSTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_emailTemplateId_fkey" FOREIGN KEY ("emailTemplateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderInspector" ADD CONSTRAINT "ReminderInspector_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderInspector" ADD CONSTRAINT "ReminderInspector_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSTemplate" ADD CONSTRAINT "SMSTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
