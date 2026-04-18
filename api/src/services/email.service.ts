/**
 * Email Service
 * Handles sending emails via Resend for collaboration invitations
 */

import { Resend } from 'resend';
import he from 'he';
import { config } from '../config/index.js';
import { AppError } from '../middleware/error-handler.js';

// Format DATE strings (YYYY-MM-DD) without timezone shifts
function formatDateNoTimezone(
  dateString: string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
): string {
  if (!dateString.includes('T')) {
    const [y, m, d] = dateString.split('-').map((v) => Number(v));
    if (y && m && d) {
      return new Date(y, m - 1, d).toLocaleDateString('en-US', options);
    }
  }
  return new Date(dateString).toLocaleDateString('en-US', options);
}

// Initialize Resend client
const resend = config.resend.apiKey ? new Resend(config.resend.apiKey) : null;

if (!resend) {
  console.warn('⚠️  Resend API key not configured. Email sending will be disabled.');
}

/**
 * Collaboration type for email templates
 */
type CollaborationType = 'recommendation' | 'essayReview' | 'guidance';

/**
 * Parameters for sending a collaboration invite email
 */
export interface SendCollaborationInviteParams {
  collaboratorEmail: string;
  collaboratorName: string;
  collaborationType: CollaborationType;
  studentName: string;
  applicationName?: string; // Scholarship/application name
  inviteToken: string;
  dueDate?: string; // Optional due date for the collaboration
  notes?: string; // Optional notes/instructions
}

/**
 * Generate email subject based on collaboration type
 * Note: Email subjects are typically plain text, but we escape for safety
 */
function getEmailSubject(collaborationType: CollaborationType, studentName: string): string {
  const escapedName = he.encode(studentName);
  switch (collaborationType) {
    case 'recommendation':
      return `${escapedName} has requested a recommendation letter`;
    case 'essayReview':
      return `${escapedName} has requested essay review assistance`;
    case 'guidance':
      return `${escapedName} has requested your guidance`;
    default:
      return `${escapedName} has requested your assistance`;
  }
}

/**
 * Generate email HTML content based on collaboration type
 */
function generateEmailContent(params: SendCollaborationInviteParams): string {
  const { collaboratorName, collaborationType, studentName, applicationName, inviteToken, dueDate, notes } = params;
  
  // Escape all user-provided data to prevent XSS
  const escapedCollaboratorName = he.encode(collaboratorName);
  const escapedStudentName = he.encode(studentName);
  const escapedApplicationName = applicationName ? he.encode(applicationName) : undefined;
  
  // URL-encode the invite link for href attributes
  const inviteLink = `${config.app.url}/collaborate/invite/${encodeURIComponent(inviteToken)}`;

  let actionDescription = '';

  switch (collaborationType) {
    case 'recommendation':
      actionDescription = 'You\'ve been asked to write a recommendation letter';
      break;
    case 'essayReview':
      actionDescription = 'You\'ve been invited to review an essay';
      break;
    case 'guidance':
      actionDescription = 'You\'ve been invited to provide guidance';
      break;
  }

  const applicationInfo = escapedApplicationName
    ? `<p><strong>Application:</strong> ${escapedApplicationName}</p>`
    : '';

  const dueDateInfo = dueDate
    ? `<p><strong>Due Date:</strong> ${he.encode(formatDateNoTimezone(dueDate))}</p>`
    : '';

  // Escape notes first, then replace newlines with <br> tags
  const notesInfo = notes
    ? `<div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
         <p><strong>Additional Notes:</strong></p>
         <p>${he.encode(notes).replace(/\n/g, '<br>')}</p>
       </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Collaboration Invitation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px;">
    <h1 style="color: #2563eb; margin-top: 0;">Collaboration Invitation</h1>
    
    <p>Hello ${escapedCollaboratorName},</p>
    
    <p>${actionDescription} for <strong>${escapedStudentName}</strong>.</p>
    
    ${applicationInfo}
    ${dueDateInfo}
    
    <p>Please click the button below to view the invitation and accept or decline:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteLink}" 
         style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        View Invitation
      </a>
    </div>
    
    <p style="font-size: 12px; color: #666;">
      Or copy and paste this link into your browser:<br>
      <a href="${inviteLink}" style="color: #2563eb; word-break: break-all;">${he.encode(inviteLink)}</a>
    </p>
    
    ${notesInfo}
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #666;">
      This invitation will expire in 7 days. If you have any questions, please contact ${escapedStudentName} directly.
    </p>
    
    <p style="font-size: 12px; color: #666; margin-top: 20px;">
      Best regards,<br>
      ScholarshipHub Team
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send a collaboration invitation email via Resend
 * 
 * @param params - Parameters for the invitation email
 * @returns Resend email ID for tracking
 * @throws AppError if email sending fails
 */
export async function sendCollaborationInvite(
  params: SendCollaborationInviteParams
): Promise<string> {
  if (!resend) {
    throw new AppError('Email service is not configured. Please set RESEND_API_KEY.', 500);
  }

  const { collaboratorEmail, studentName, collaborationType } = params;

  try {
    const subject = getEmailSubject(collaborationType, studentName);
    const html = generateEmailContent(params);

    // Get "from" email - use Resend's default or configured domain
    // In production, this should be from your verified domain
    const fromEmail = `${config.resend.fromName} <${config.resend.fromEmail}>`;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [collaboratorEmail],
      subject,
      html,
    });

    if (error) {
      console.error('[email.service] Resend error:', error);
      throw new AppError(`Failed to send email: ${error.message}`, 500);
    }

    if (!data?.id) {
      throw new AppError('Email sent but no ID returned from Resend', 500);
    }

    console.log(`[email.service] Invitation email sent to ${collaboratorEmail}, Resend ID: ${data.id}`);
    return data.id;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    console.error('[email.service] Unexpected error sending email:', err);
    throw new AppError('Failed to send invitation email', 500);
  }
}

/**
 * Send a test email (for development/testing)
 */
export async function sendTestEmail(to: string): Promise<string> {
  if (!resend) {
    throw new AppError('Email service is not configured. Please set RESEND_API_KEY.', 500);
  }

  const fromEmail = `${config.resend.fromName} <${config.resend.fromEmail}>`;

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: 'Test Email from ScholarshipHub',
    html: '<p>This is a test email from ScholarshipHub.</p>',
  });

  if (error) {
    throw new AppError(`Failed to send test email: ${error.message}`, 500);
  }

  if (!data?.id) {
    throw new AppError('Email sent but no ID returned from Resend', 500);
  }

  return data.id;
}

// ============================================================================
// REMINDER EMAILS
// ============================================================================

/**
 * Parameters for sending application reminder emails
 */
export interface SendApplicationReminderParams {
  studentEmail: string;
  studentName: string;
  scholarshipName: string;
  dueDate: string;
  daysUntilDue: number; // Positive = days until due, Negative = days overdue
  applicationId: number;
}

/**
 * Parameters for sending collaboration reminder emails
 */
export interface SendCollaborationReminderParams {
  recipientEmail: string;
  recipientName: string;
  collaborationType: CollaborationType;
  studentName?: string; // For collaborator reminders
  dueDate: string;
  daysUntilDue: number; // Positive = days until due, Negative = days overdue
  applicationName?: string;
  collaborationId: number;
}

/**
 * Generate HTML for application due soon reminder
 */
function generateApplicationDueSoonEmail(params: SendApplicationReminderParams): string {
  const { studentName, scholarshipName, dueDate, daysUntilDue, applicationId } = params;

  const escapedName = he.encode(studentName);
  const escapedScholarship = he.encode(scholarshipName);
  const formattedDate = he.encode(formatDateNoTimezone(dueDate));

  const urgencyColor = daysUntilDue <= 1 ? '#dc2626' : daysUntilDue <= 3 ? '#ea580c' : '#2563eb';
  const urgencyText = daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`;

  const applicationLink = `${config.app.url}/applications/${applicationId}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Due Soon</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px;">
    <h1 style="color: ${urgencyColor}; margin-top: 0;">⏰ Application Reminder</h1>

    <p>Hello ${escapedName},</p>

    <p>This is a friendly reminder that your application for <strong>${escapedScholarship}</strong> is due <strong>${urgencyText}</strong>.</p>

    <div style="background-color: #f5f5f5; border-left: 4px solid ${urgencyColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>Due Date:</strong> ${formattedDate}</p>
      <p style="margin: 10px 0 0 0;"><strong>Days Remaining:</strong> ${daysUntilDue}</p>
    </div>

    <p>Don't miss this opportunity! Make sure to complete and submit your application before the deadline.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${applicationLink}"
         style="display: inline-block; background-color: ${urgencyColor}; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        View Application
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="font-size: 12px; color: #666; margin-top: 20px;">
      Best regards,<br>
      ScholarshipHub Team
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML for application overdue reminder
 */
function generateApplicationOverdueEmail(params: SendApplicationReminderParams): string {
  const { studentName, scholarshipName, dueDate, daysUntilDue, applicationId } = params;

  const escapedName = he.encode(studentName);
  const escapedScholarship = he.encode(scholarshipName);
  const formattedDate = he.encode(formatDateNoTimezone(dueDate));

  const daysOverdue = Math.abs(daysUntilDue);
  const overdueText = daysOverdue === 1 ? '1 day ago' : `${daysOverdue} days ago`;

  const applicationLink = `${config.app.url}/applications/${applicationId}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Overdue</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px;">
    <h1 style="color: #dc2626; margin-top: 0;">⚠️ Application Overdue</h1>

    <p>Hello ${escapedName},</p>

    <p>Your application for <strong>${escapedScholarship}</strong> was due <strong>${overdueText}</strong>.</p>

    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>Due Date:</strong> ${formattedDate}</p>
      <p style="margin: 10px 0 0 0;"><strong>Days Overdue:</strong> ${daysOverdue}</p>
    </div>

    <p>If the scholarship is still accepting late submissions, please submit as soon as possible. Some scholarships may have extended deadlines or accept late applications.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${applicationLink}"
         style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        View Application
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="font-size: 12px; color: #666; margin-top: 20px;">
      Best regards,<br>
      ScholarshipHub Team
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML for collaborator reminder (due soon)
 */
function generateCollaboratorDueSoonEmail(params: SendCollaborationReminderParams): string {
  const { recipientName, studentName, collaborationType, dueDate, daysUntilDue, applicationName } = params;

  const escapedRecipient = he.encode(recipientName);
  const escapedStudent = studentName ? he.encode(studentName) : 'a student';
  const escapedApplication = applicationName ? he.encode(applicationName) : '';

  const formattedDate = he.encode(formatDateNoTimezone(dueDate));

  const urgencyColor = daysUntilDue <= 1 ? '#dc2626' : daysUntilDue <= 3 ? '#ea580c' : '#2563eb';
  const urgencyText = daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`;

  let typeDescription = '';
  switch (collaborationType) {
    case 'recommendation':
      typeDescription = 'recommendation letter';
      break;
    case 'essayReview':
      typeDescription = 'essay review';
      break;
    case 'guidance':
      typeDescription = 'guidance session';
      break;
  }

  const dashboardLink = `${config.app.url}/collaborator/dashboard`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Collaboration Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px;">
    <h1 style="color: ${urgencyColor}; margin-top: 0;">⏰ Collaboration Reminder</h1>

    <p>Hello ${escapedRecipient},</p>

    <p>This is a friendly reminder that <strong>${escapedStudent}</strong> needs your <strong>${typeDescription}</strong> ${urgencyText}.</p>

    ${escapedApplication ? `<p><strong>Application:</strong> ${escapedApplication}</p>` : ''}

    <div style="background-color: #f5f5f5; border-left: 4px solid ${urgencyColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>Due Date:</strong> ${formattedDate}</p>
      <p style="margin: 10px 0 0 0;"><strong>Days Remaining:</strong> ${daysUntilDue}</p>
    </div>

    <p>Your contribution is important! Please complete this ${typeDescription} before the deadline.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardLink}"
         style="display: inline-block; background-color: ${urgencyColor}; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        View Collaboration
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="font-size: 12px; color: #666; margin-top: 20px;">
      Best regards,<br>
      ScholarshipHub Team
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML for collaborator reminder (overdue)
 */
function generateCollaboratorOverdueEmail(params: SendCollaborationReminderParams): string {
  const { recipientName, studentName, collaborationType, dueDate, daysUntilDue, applicationName } = params;

  const escapedRecipient = he.encode(recipientName);
  const escapedStudent = studentName ? he.encode(studentName) : 'a student';
  const escapedApplication = applicationName ? he.encode(applicationName) : '';

  const formattedDate = he.encode(
    new Date(dueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  );

  const daysOverdue = Math.abs(daysUntilDue);
  const overdueText = daysOverdue === 1 ? '1 day ago' : `${daysOverdue} days ago`;

  let typeDescription = '';
  switch (collaborationType) {
    case 'recommendation':
      typeDescription = 'recommendation letter';
      break;
    case 'essayReview':
      typeDescription = 'essay review';
      break;
    case 'guidance':
      typeDescription = 'guidance session';
      break;
  }

  const dashboardLink = `${config.app.url}/collaborator/dashboard`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Collaboration Overdue</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px;">
    <h1 style="color: #dc2626; margin-top: 0;">⚠️ Collaboration Overdue</h1>

    <p>Hello ${escapedRecipient},</p>

    <p>Your <strong>${typeDescription}</strong> for <strong>${escapedStudent}</strong> was due <strong>${overdueText}</strong>.</p>

    ${escapedApplication ? `<p><strong>Application:</strong> ${escapedApplication}</p>` : ''}

    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>Due Date:</strong> ${formattedDate}</p>
      <p style="margin: 10px 0 0 0;"><strong>Days Overdue:</strong> ${daysOverdue}</p>
    </div>

    <p>Please complete this ${typeDescription} as soon as possible. ${escapedStudent} is counting on your support!</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardLink}"
         style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        View Collaboration
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="font-size: 12px; color: #666; margin-top: 20px;">
      Best regards,<br>
      ScholarshipHub Team
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send application reminder email (due soon or overdue)
 */
export async function sendApplicationReminder(
  params: SendApplicationReminderParams
): Promise<string | null> {
  if (!resend) {
    console.warn('[email.service] Email service not configured, skipping application reminder');
    return null;
  }

  const { studentEmail, scholarshipName, daysUntilDue } = params;

  try {
    const isOverdue = daysUntilDue < 0;
    const subject = isOverdue
      ? `Reminder: ${scholarshipName} application was due ${Math.abs(daysUntilDue)} day(s) ago`
      : `Reminder: ${scholarshipName} application due in ${daysUntilDue} day(s)`;

    const html = isOverdue
      ? generateApplicationOverdueEmail(params)
      : generateApplicationDueSoonEmail(params);

    const fromEmail = `${config.resend.fromName} <${config.resend.fromEmail}>`;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [studentEmail],
      subject,
      html,
    });

    if (error) {
      console.error('[email.service] Error sending application reminder:', error);
      return null;
    }

    if (!data?.id) {
      console.warn('[email.service] No email ID returned for application reminder');
      return null;
    }

    console.log(`[email.service] Application reminder sent to ${studentEmail}, Resend ID: ${data.id}`);
    return data.id;
  } catch (err) {
    console.error('[email.service] Unexpected error sending application reminder:', err);
    return null;
  }
}

/**
 * Send collaboration reminder email (due soon or overdue)
 */
export async function sendCollaborationReminder(
  params: SendCollaborationReminderParams
): Promise<string | null> {
  if (!resend) {
    console.warn('[email.service] Email service not configured, skipping collaboration reminder');
    return null;
  }

  const { recipientEmail, collaborationType, studentName, daysUntilDue } = params;

  try {
    const isOverdue = daysUntilDue < 0;

    let typeLabel = '';
    switch (collaborationType) {
      case 'recommendation':
        typeLabel = 'recommendation';
        break;
      case 'essayReview':
        typeLabel = 'essay review';
        break;
      case 'guidance':
        typeLabel = 'guidance';
        break;
    }

    const subject = isOverdue
      ? `Reminder: ${typeLabel} for ${studentName || 'student'} was due ${Math.abs(daysUntilDue)} day(s) ago`
      : `Reminder: ${typeLabel} for ${studentName || 'student'} due in ${daysUntilDue} day(s)`;

    const html = isOverdue
      ? generateCollaboratorOverdueEmail(params)
      : generateCollaboratorDueSoonEmail(params);

    const fromEmail = `${config.resend.fromName} <${config.resend.fromEmail}>`;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [recipientEmail],
      subject,
      html,
    });

    if (error) {
      console.error('[email.service] Error sending collaboration reminder:', error);
      return null;
    }

    if (!data?.id) {
      console.warn('[email.service] No email ID returned for collaboration reminder');
      return null;
    }

    console.log(`[email.service] Collaboration reminder sent to ${recipientEmail}, Resend ID: ${data.id}`);
    return data.id;
  } catch (err) {
    console.error('[email.service] Unexpected error sending collaboration reminder:', err);
    return null;
  }
}

