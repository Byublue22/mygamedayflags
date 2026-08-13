function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyStripeSignature(payload, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map(item => item.split("=")));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  // Reject replayed webhook requests older than five minutes.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const expected = await hmacHex(secret, `${timestamp}.${payload}`);
  return timingSafeEqual(expected, signature);
}

function esc(value) {
  return String(value || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

async function sendEmail(env, message) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
  if (!response.ok) {
    console.error("Resend error:", await response.text());
  }
}

export async function onRequestPost(context) {
  const payload = await context.request.text();
  const signature = context.request.headers.get("stripe-signature");
  const valid = await verifyStripeSignature(payload, signature, context.env.STRIPE_WEBHOOK_SECRET);

  if (!valid) return new Response("Invalid signature", { status: 400 });

  const event = JSON.parse(payload);
  if (event.type !== "checkout.session.completed") {
    return new Response("Ignored", { status: 200 });
  }

  const session = event.data.object;
  if (session.payment_status !== "paid") {
    return new Response("Payment not completed", { status: 200 });
  }

  const m = session.metadata || {};
  const customerEmail = session.customer_details?.email || m.email;
  const amount = ((session.amount_total || 0) / 100).toFixed(2);
  const from = context.env.FROM_EMAIL || "Game Day Flags <orders@mygamedayflags.com>";
  const owner = context.env.OWNER_EMAIL || "mygamedayflags@gmail.com";

  const customerHtml = `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#0b1f3a">
    <h1 style="color:#b22234">Welcome to Game Day Flags!</h1>
    <p>Hi ${esc(m.name)},</p>
    <p>Your payment was successful and your 2026 season membership request has been received.</p>
    <table style="border-collapse:collapse;width:100%;margin:22px 0">
      <tr><td style="padding:8px;border-bottom:1px solid #ddd"><b>Plan</b></td><td style="padding:8px;border-bottom:1px solid #ddd">${esc(m.plan)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #ddd"><b>Team</b></td><td style="padding:8px;border-bottom:1px solid #ddd">${esc(m.team)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #ddd"><b>Service address</b></td><td style="padding:8px;border-bottom:1px solid #ddd">${esc(m.address)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #ddd"><b>Amount paid</b></td><td style="padding:8px;border-bottom:1px solid #ddd">$${amount}</td></tr>
    </table>
    <p>Your membership includes use of the flag and pole, installation before each regular-season game, removal afterward, schedule tracking, and offseason storage.</p>
    <p>We will contact you to confirm service availability and the safest installation location.</p>
    <p><b>Game Day Flags</b><br>801-528-8697<br>mygamedayflags@gmail.com</p>
  </div>`;

  const ownerHtml = `
  <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto">
    <h1>New Paid Membership</h1>
    <p><b>Amount:</b> $${amount}</p>
    <p><b>Name:</b> ${esc(m.name)}<br>
    <b>Email:</b> ${esc(customerEmail)}<br>
    <b>Phone:</b> ${esc(m.phone)}<br>
    <b>Address:</b> ${esc(m.address)}<br>
    <b>Team:</b> ${esc(m.team)}<br>
    <b>Plan:</b> ${esc(m.plan)}<br>
    <b>Notes:</b> ${esc(m.notes)}</p>
    <p><b>Stripe Checkout Session:</b> ${esc(session.id)}</p>
  </div>`;

  await Promise.all([
    sendEmail(context.env, {
      from,
      to: [customerEmail],
      reply_to: owner,
      subject: `Game Day Flags membership confirmed — ${m.team}`,
      html: customerHtml,
    }),
    sendEmail(context.env, {
      from,
      to: [owner],
      reply_to: customerEmail,
      subject: `New paid membership: ${m.name} — ${m.team}`,
      html: ownerHtml,
    }),
  ]);

  return new Response("OK", { status: 200 });
}
