const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEMO_URL = "https://line-ai-crm-kappa.vercel.app/";

// Vercel 環境変数（ドメイン認証後に設定）
// RESEND_API_KEY   … Resend の API キー
// RESEND_FROM_EMAIL … 例: "LINE AI CRM <noreply@uma-s.com>"（Resendで認証済みドメインのみ）
// NOTIFY_EMAIL     … 例: t@uma-s.com
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "t@uma-s.com";
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || NOTIFY_EMAIL;

const EMAIL_FOOTER = `
---------
【お問い合わせ先】
合同会社UMA
担当：園田
メール: t@uma-s.com
WEB: https://www.uma-s.com
---------`;

function buildUserEmailText(person, company, email) {
  return `${person} 様

無料デモへのお申し込みありがとうございます。
以下のURLからデモ画面をご確認ください。

${DEMO_URL}

会社名: ${company}
担当者名: ${person}
メールアドレス: ${email}
${EMAIL_FOOTER}`;
}

async function sendEmail(apiKey, payload) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text();
    return { ok: false, status: response.status, detail };
  }

  return { ok: true };
}

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

    const notifyPayload = {
      from: FROM_EMAIL,
      to: [NOTIFY_EMAIL],
      subject: "【LINE AI CRM】無料デモ申し込み通知",
      reply_to: email,
      text: `無料デモ申し込みがありました。

会社名: ${company}
担当者名: ${person}
メールアドレス: ${email}
デモURL: ${DEMO_URL}`
    };

    const userPayload = {
      from: FROM_EMAIL,
      to: [email],
      reply_to: REPLY_TO_EMAIL,
      subject: "【LINE AI CRM】デモURLのご案内",
      text: buildUserEmailText(person, company, email)
    };

    const notifyResult = await sendEmail(apiKey, notifyPayload);
    if (!notifyResult.ok) {
      return res.status(502).json({
        error: "Failed to send notification email",
        step: "notify",
        status: notifyResult.status,
        detail: notifyResult.detail,
        hint:
          FROM_EMAIL.includes("resend.dev")
            ? "onboarding@resend.dev では Resend登録メール以外に送れません。uma-s.com を Resend で認証し、RESEND_FROM_EMAIL を設定してください。"
            : "RESEND_FROM_EMAIL が Resend で認証済みか確認してください。"
      });
    }

    const userResult = await sendEmail(apiKey, userPayload);
    if (!userResult.ok) {
      return res.status(502).json({
        error: "Failed to send demo email",
        step: "user",
        status: userResult.status,
        detail: userResult.detail
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Unexpected server error" });
  }
};
