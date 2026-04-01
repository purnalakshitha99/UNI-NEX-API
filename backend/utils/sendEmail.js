import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const emailUser = process.env.EMAIL_USER;
    // Gmail app passwords are often copied with spaces; normalize to avoid auth failures.
    const emailPass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");

    if (!emailUser || !emailPass) {
      throw new Error("EMAIL_USER or EMAIL_PASS is not configured");
    }

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    const message = {
      from: emailUser,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(message);
    console.log("Email sent: ", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email could not be sent");
  }
};

export default sendEmail;