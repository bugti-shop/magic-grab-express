import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Stripe Price IDs
const PRICE_IDS: Record<string, string> = {
  weekly: "price_1THRuxFAPtKh08jGJAJyGPSS",
  monthly: "price_1THRyrFAPtKh08jGj5rZr1CB",
  yearly: "price_1THRzxFAPtKh08jGoDkVIric",
};

// Plans eligible for free trial
const TRIAL_PLANS = ["monthly", "yearly"];
const TRIAL_DAYS = 8;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Parse request body
    const { planType, hadTrialBefore } = await req.json();
    if (!planType || !PRICE_IDS[planType]) {
      throw new Error(`Invalid plan type: ${planType}. Must be one of: ${Object.keys(PRICE_IDS).join(", ")}`);
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    let customerHadTrial = false;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;

      // Check if this customer ever had a trialing subscription (any status)
      const allSubs = await stripe.subscriptions.list({
        customer: customerId,
        limit: 100,
      });
      customerHadTrial = allSubs.data.some(
        (sub) => sub.trial_start !== null
      );
    }

    // Determine if trial should be offered:
    // - Plan must be eligible for trial
    // - Device must not have used trial before (hadTrialBefore from frontend)
    // - Customer must not have had a trial on Stripe before
    const shouldOfferTrial =
      TRIAL_PLANS.includes(planType) &&
      !hadTrialBefore &&
      !customerHadTrial;

    // Build session config
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: PRICE_IDS[planType], quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/`,
      cancel_url: `${req.headers.get("origin")}/`,
      metadata: { user_id: user.id, plan_type: planType },
    };

    // Only add free trial if eligible
    if (shouldOfferTrial) {
      sessionConfig.subscription_data = {
        trial_period_days: TRIAL_DAYS,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
