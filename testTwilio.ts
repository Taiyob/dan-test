// import { TwilioSMSService } from './src/services/';

// // TwilioSMSService instance
// const smsService = new TwilioSMSService({
//   fromNumber: '+1234567890', 
// });

// async function main() {
//   // sendBulkSMS test
//   const bulkResult = await smsService.sendBulkSMS(
//     ['+8801829049164', '+8801911113956'],
//     'Hello! This is a bulk SMS test'
//   );
//   console.log('Bulk SMS result:', bulkResult);

//   // sendTemplatedSMS test
//   const templatedResult = await smsService.sendTemplatedSMS(
//     ['+8801829049164', '+8801911113956'], 
//     'Hello {{name}}, your OTP is {{otp}}',
//     { name: 'John', otp: '123456' }
//   );
//   console.log('Templated SMS result:', templatedResult);
// }

// main().catch(console.error);
