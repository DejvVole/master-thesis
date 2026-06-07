import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendInvitationEmail(
  email: string,
  inviteUrl: string,
): Promise<void> {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error(
      "SMTP credentials nie sú nastavené. Nastavte SMTP_USER a SMTP_PASS environment variables.",
    );
  }

  const mailOptions = {
    from: `"${appName}" <${fromEmail}>`,
    to: email,
    subject: `Pozvánka do systému ${appName}`,
    text: `
Boli ste pozvaní do systému ${appName}.

Pre dokončenie registrácie kliknite na nasledujúci odkaz:
${inviteUrl}

Tento odkaz je platný 7 dní.

Ak ste o túto pozvánku nežiadali, ignorujte tento email.
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #4F46E5; color: white !important; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .button:hover { background: #4338CA; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">${appName}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Pozvánka do systému</p>
    </div>
    <div class="content">
      <h2>Dobrý deň,</h2>
      <p>Boli ste pozvaní do systému <strong>${appName}</strong>.</p>
      <p>Pre dokončenie registrácie a vytvorenie vášho účtu kliknite na tlačidlo nižšie:</p>
      
      <div style="text-align: center;">
        <a href="${inviteUrl}" class="button">Dokončiť registráciu</a>
      </div>
      
      <div class="warning">
        <strong>Platnosť:</strong> Tento odkaz je platný 7 dní od odoslania.
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        Ak tlačidlo nefunguje, skopírujte tento odkaz do prehliadača:<br>
        <a href="${inviteUrl}" style="color: #4F46E5; word-break: break-all;">${inviteUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>Ak ste o túto pozvánku nežiadali, ignorujte tento email.</p>
      <p>&copy; ${new Date().getFullYear()} ${appName}</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`❌ Failed to send invitation email to ${email}:`, error);
    throw new Error("Nepodarilo sa odoslať email s pozvánkou");
  }
}
