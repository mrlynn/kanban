import nodemailer from 'nodemailer';

/**
 * Email transporter using SMTP
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const from = process.env.FROM_EMAIL || 'noreply@moltboard.com';
  
  await transporter.sendMail({
    from: `Moltboard <${from}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
  });
}

/**
 * Send board invitation email
 */
export async function sendBoardInvitationEmail({
  to,
  inviterName,
  boardName,
  role,
  acceptUrl,
}: {
  to: string;
  inviterName: string;
  boardName: string;
  role: string;
  acceptUrl: string;
}): Promise<void> {
  const subject = `${inviterName} invited you to collaborate on "${boardName}"`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: bold; color: #F97316; }
    .card { background: #f8fafc; border-radius: 12px; padding: 32px; margin-bottom: 24px; }
    .board-name { font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
    .role-badge { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 500; }
    .button { display: inline-block; background: #F97316; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .button:hover { background: #ea580c; }
    .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 32px; }
    .link { color: #F97316; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🔥 Moltboard</div>
    </div>
    
    <div class="card">
      <p style="margin-top: 0;"><strong>${inviterName}</strong> has invited you to collaborate on:</p>
      
      <div class="board-name">${boardName}</div>
      <div class="role-badge">${role.charAt(0).toUpperCase() + role.slice(1)}</div>
      
      <p>Click the button below to accept the invitation and start collaborating.</p>
      
      <a href="${acceptUrl}" class="button">Accept Invitation</a>
    </div>
    
    <p style="color: #64748b; font-size: 14px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${acceptUrl}" class="link">${acceptUrl}</a>
    </p>
    
    <div class="footer">
      <p>This invitation will expire in 7 days.</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `;
  
  await sendEmail({ to, subject, html });
}

/**
 * Send workspace/tenant invitation email
 */
export async function sendTenantInvitationEmail({
  to,
  inviterName,
  workspaceName,
  role,
  acceptUrl,
}: {
  to: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  acceptUrl: string;
}): Promise<void> {
  const subject = `${inviterName} invited you to join "${workspaceName}" on Moltboard`;
  
  const roleDescription = role === 'admin' 
    ? 'As an admin, you\'ll be able to manage team members and access all boards.'
    : 'As a member, you\'ll have access to all boards in the workspace.';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: bold; color: #F97316; }
    .card { background: #f8fafc; border-radius: 12px; padding: 32px; margin-bottom: 24px; }
    .workspace-name { font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
    .role-badge { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 500; }
    .role-badge.admin { background: #fef3c7; color: #92400e; }
    .button { display: inline-block; background: #F97316; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .button:hover { background: #ea580c; }
    .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 32px; }
    .link { color: #F97316; word-break: break-all; }
    .benefits { margin: 16px 0; padding: 0; }
    .benefits li { margin: 8px 0; color: #475569; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🔥 Moltboard</div>
    </div>
    
    <div class="card">
      <p style="margin-top: 0;"><strong>${inviterName}</strong> has invited you to join their workspace:</p>
      
      <div class="workspace-name">${workspaceName}</div>
      <div class="role-badge ${role === 'admin' ? 'admin' : ''}">${role.charAt(0).toUpperCase() + role.slice(1)}</div>
      
      <p>${roleDescription}</p>
      
      <ul class="benefits">
        <li>📋 Access all boards in the workspace</li>
        <li>✅ Create and manage tasks</li>
        <li>👥 Collaborate with your team</li>
      </ul>
      
      <a href="${acceptUrl}" class="button">Join Workspace</a>
    </div>
    
    <p style="color: #64748b; font-size: 14px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${acceptUrl}" class="link">${acceptUrl}</a>
    </p>
    
    <div class="footer">
      <p>This invitation will expire in 7 days.</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `;
  
  await sendEmail({ to, subject, html });
}

/**
 * Send notification when someone joins a board
 */
export async function sendMemberJoinedEmail({
  to,
  newMemberName,
  newMemberEmail,
  boardName,
}: {
  to: string;
  newMemberName: string;
  newMemberEmail: string;
  boardName: string;
}): Promise<void> {
  const subject = `${newMemberName} joined "${boardName}"`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #F97316; text-align: center; margin-bottom: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🔥 Moltboard</div>
    <p><strong>${newMemberName}</strong> (${newMemberEmail}) accepted your invitation and joined <strong>${boardName}</strong>.</p>
    <p>They can now view and collaborate on the board.</p>
  </div>
</body>
</html>
  `;
  
  await sendEmail({ to, subject, html });
}
