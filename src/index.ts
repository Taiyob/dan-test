import { IgnitorApp } from "./core/IgnitorApp";
import { config } from "./core/config";
import { AppLogger } from "./core/logging/logger";
import { AccessControlModule } from "./modules/AccessControl/accessControlModule";
import { AssetModule } from "./modules/Asset/assetModule";
import { AuthModule } from "./modules/Auth/AuthModule";
import { CertificationTemplateModule } from "./modules/CertificationTemplate/certificationTemplateModule";
import { ClientModule } from "./modules/Client/ClientModule";
import { EmailTemplateModule } from "./modules/EmailTemplate/emailTemplateModule";
import { EmployeeModule } from "./modules/Employee/employeeModule";
import { startInspectionCronJob } from "./modules/Inspection/inspection.cron";
import { InspectionModule } from "./modules/Inspection/inspectionModule";
import { ReminderModule } from "./modules/Reminder/reminderModule";
import { ReportModule } from "./modules/Report/reportModule";
import { SMSTemplateModule } from "./modules/SmsTemplate/smsTemplateModule";
import { StatsModule } from "./modules/Stats/statsModule";
import { TestimonialModule } from "./modules/Testimonial/testimonialModule";
import { UserModule } from "./modules/User/UserModule";
import { MembershipModule } from "./modules/membership/membershipModule";
import { PlanModule } from "./modules/Plan/planModule";
import { PaymentModule } from "./modules/Payment/paymentModule";

// Main application bootstrap function
async function bootstrap() {
  try {
    AppLogger.info("📦 Starting application bootstrap");
    startInspectionCronJob();

    // Initialize the Ignitor application
    const app = new IgnitorApp();

    AppLogger.info("🔧 Registering modules...");

    // Register application modules
    app.registerModule(new UserModule());
    app.registerModule(new AuthModule());
    app.registerModule(new ClientModule());
    app.registerModule(new EmployeeModule());
    app.registerModule(new AssetModule());
    app.registerModule(new InspectionModule());
    app.registerModule(new SMSTemplateModule());
    app.registerModule(new EmailTemplateModule());
    app.registerModule(new ReminderModule());
    app.registerModule(new AccessControlModule());
    app.registerModule(new TestimonialModule());
    app.registerModule(new MembershipModule());
    app.registerModule(new PlanModule());
    app.registerModule(new PaymentModule());
    app.registerModule(new CertificationTemplateModule());
    app.registerModule(new ReportModule());
    app.registerModule(new StatsModule());

    AppLogger.info("✅ All modules registered successfully");

    // Start the server
    await app.spark(config.server.port);

    // Handle shutdown gracefully
    process.on("SIGTERM", () => shutdown(app));
    process.on("SIGINT", () => shutdown(app));

    AppLogger.info("💥 Ignitor sparked successfully");
  } catch (error) {
    AppLogger.error("❌ Bootstrap error details:", error);

    AppLogger.error("🔴 Failed to initialize application:", {
      error: error instanceof Error ? error : new Error(String(error)),
      context: "application-initialization",
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Graceful shutdown handler
async function shutdown(app: IgnitorApp) {
  AppLogger.info("Received shutdown signal, shutting down gracefully...");

  try {
    await app.shutdown();
    AppLogger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    AppLogger.error("❌ Shutdown error details:", error);

    AppLogger.error("Error during graceful shutdown:", {
      error: error instanceof Error ? error : new Error(String(error)),
      context: "graceful-shutdown",
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}


// TwilioSMSService instance
// const smsService = new TwilioSMSService({
//   fromNumber: '+15677437917', 
// });

// async function main() {
//   // sendBulkSMS test
//   console.log("Starting SMS tests...");
//   const bulkResult = await smsService.sendBulkSMS(
//     ['+18777804236', '+18777804236'],
//     'Hello! This is a bulk SMS test'
//   );
//   console.log('Bulk SMS result:', bulkResult);

//   // sendTemplatedSMS test
//   const templatedResult = await smsService.sendTemplatedSMS(
//     ['+18777804236', '+18777804236'], 
//     'Hello {{name}}, your OTP is {{otp}}',
//     { name: 'John', otp: '123456' }
//   );
//   console.log('Templated SMS result:', templatedResult);
// }

// main().catch(console.error);


// Start the application
bootstrap().catch((err) => {
  AppLogger.error("❌ Unhandled bootstrap error:", err);
  AppLogger.error("Bootstrap error:", {
    error: err instanceof Error ? err : new Error(String(err)),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});

