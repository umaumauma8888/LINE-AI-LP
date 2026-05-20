const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TO_EMAIL = "t@uma-s.com";
const FROM_EMAIL = "onboarding@resend.dev";
const DEMO_URL = "https://line-ai-crm-kappa.vercel.app/";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { company, person, email } = body;

    if (!company || !person || !email) {
      return res.status(400).json({ error: "company, person and email are required" });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "RESEND_API_KEY is not configured" });
    }

    const userPayload = {
      from: FROM_EMAIL,
      to: [email],
      subject: "【LINE AI CRM】デモURLのご案内",
      text:
` ${person} 様

無料デモへのお申し込みありがとうございます。
以下のURLからデモ画面をご確認ください。

${DEMO_URL}

会社名: ${company}
担当者名: ${person}
メールアドレス: ${email}
`
    };

    const notifyPayload = {
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject: "【LINE AI CRM】無料デモ申し込み通知",
      reply_to: email,
      text:
`無料デモ申し込みがありました。

会社名: ${company}
担当者名: ${person}
メールアドレス: ${email}
デモURL: ${DEMO_URL}`
    };

    const userResponse = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(userPayload)
    });

    if (!userResponse.ok) {
      const detail = await userResponse.text();
      return res.status(502).json({ error: "Failed to send demo email", detail });
    }

    const notifyResponse = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(notifyPayload)
    });

    if (!notifyResponse.ok) {
      const detail = await notifyResponse.text();
      return res.status(502).json({ error: "Failed to send notification email", detail });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Unexpected server error" });
  }
};
