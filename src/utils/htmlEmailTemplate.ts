export const htmlEmailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{WELCOME TEMPLATE}}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    table {
      border-spacing: 0;
      border-collapse: collapse;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
      color: white;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 40px 50px;
      color: #333333;
      line-height: 1.6;
    }
    .content h2 {
      color: #2d3748;
      font-size: 24px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .content p {
      margin: 0 0 20px;
      font-size: 16px;
    }
    .highlight {
      background-color: #f0f7ff;
      border-left: 4px solid #4299e1;
      padding: 20px;
      margin: 25px 0;
      border-radius: 0 6px 6px 0;
    }
    .btn {
      display: inline-block;
      background-color: #667eea;
      color: white !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
      transition: all 0.3s;
    }
    .btn:hover {
      background-color: #5a6fd8;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }
    .footer {
      background-color: #1a202c;
      color: #a0aec0;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      border-radius: 0 0 8px 8px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .header {
        padding: 30px 20px;
      }
      .header h1 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body style="margin:0; padding:40px 0; background:#f4f4f4;">
  <center>
    <table role="presentation" width="100%" style="max-width:600px; margin:0 auto;">
      <!-- Header -->
      <tr>
        <td class="header">
          <h1>Welcome to {{companyName}}</h1>
        </td>
      </tr>

      <!-- Main Content -->
      <tr>
        <td class="content">
          <h2>Hello {{name}},</h2>
          
          <p>Thank you for choosing <strong>{{companyName}}</strong>. We're excited to have you on board and help you achieve your goals.</p>

          <div class="highlight">
            <strong>What's next?</strong><br /><br />
            Your account has been successfully created. You can now access all features and start using our platform right away.
          </div>

          <p>Here are a few things you can do now:</p>
          <ul style="padding-left:20px; margin:20px 0;">
            <li>Complete your profile setup</li>
            <li>Explore the dashboard</li>
            <li>Invite your team members</li>
            <li>Contact our support if you need help</li>
          </ul>

          <p style="text-align:center;">
            <a href="{{cta_link}}" class="btn" target="_blank">
              Get Started Now
            </a>
          </p>

          <p>If you have any questions, feel free to reply to this email or contact our support team.</p>

          <p>Best regards,<br />
          <strong>The {{companyName}} Team</strong></p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td class="footer">
          <p style="margin:0 0 10px;">
            © {{year}} {{companyName}}. All rights reserved.
          </p>
          <p>
            <a href="{{website}}">{{website}}</a> • 
            <a href="{{unsubscribe}}">Unsubscribe</a>
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
`;