export type AddEmailTemplateInput = {
  name: string;
  subject: string;
  content: string; // plain text version
  description?: string;
  category?: string;
  ctaLink?: string; // ← new: for button link
  // aro jodi lagbe: welcomeMessage, companyName etc.
};