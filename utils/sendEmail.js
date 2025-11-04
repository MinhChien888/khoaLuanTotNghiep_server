// utils/sendEmail.js
const brevo = require("@getbrevo/brevo");

// === Cấu hình API key ===
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

// === Hàm gửi email (có retry logic) ===
async function sendEmail(to, subject, text, html, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const sendSmtpEmail = {
        sender: {
          name: "TMC Hardware",
          email: process.env.SENDER_EMAIL || "tranminhchien654.123@gmail.com",
        },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      };

      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Email sent (Attempt ${attempt})`, response.messageId || "");
      return { success: true, response };

    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);

      if (error.response) {
        console.error("📩 Brevo response data:", JSON.stringify(error.response.body, null, 2));
      } else {
        console.error("🔥 Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      }

      if (attempt === retries) {
        return { success: false, error: error.response?.body || error.message };
      }

      await new Promise(res => setTimeout(res, 2000));
    }
  }
}

module.exports = { sendEmail };
