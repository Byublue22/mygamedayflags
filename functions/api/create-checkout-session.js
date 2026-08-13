const PRICE_BY_PLAN = {
  "Early Bird — $155": 15500,
  "Regular — $175": 17500,
};

function clean(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const plan = clean(body.plan, 60);
    const amount = PRICE_BY_PLAN[plan];

    if (!amount) {
      return Response.json({ error: "Please select a valid membership plan." }, { status: 400 });
    }

    const name = clean(body.name, 100);
    const email = clean(body.email, 200);
    const phone = clean(body.phone, 50);
    const address = clean(body.address, 300);
    const team = clean(body.team, 100);
    const notes = clean(body.notes, 500);

    if (!name || !email || !phone || !address || !team) {
      return Response.json({ error: "Please complete every required field." }, { status: 400 });
    }

    const siteUrl = (context.env.SITE_URL || "https://mygamedayflags.com").replace(/\/$/, "");
    const params = new URLSearchParams();

    params.set("mode", "payment");
    params.set("success_url", `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${siteUrl}/cancel.html`);
    params.set("customer_email", email);
    params.set("client_reference_id", crypto.randomUUID());
    params.set("payment_method_types[0]", "card");

    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "usd");
    params.set("line_items[0][price_data][unit_amount]", String(amount));
    params.set("line_items[0][price_data][product_data][name]", `Game Day Flags ${plan.split(" — ")[0]} Membership`);
    params.set("line_items[0][price_data][product_data][description]", "Season membership including use of team flag and pole, installation, removal, schedule tracking, and offseason storage.");

    params.set("metadata[name]", name);
    params.set("metadata[email]", email);
    params.set("metadata[phone]", phone);
    params.set("metadata[address]", address);
    params.set("metadata[team]", team);
    params.set("metadata[plan]", plan);
    params.set("metadata[notes]", notes || "None");

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${context.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error("Stripe error:", session);
      return Response.json({ error: "Stripe checkout could not be created." }, { status: 502 });
    }

    return Response.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to start checkout." }, { status: 500 });
  }
}
