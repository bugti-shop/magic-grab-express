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

  try {
    // Parse request body
    const { planType, hadTrialBefore } = await req.json();
    if (!planType || !PRICE_IDS[planType]) {
      throw new Error(`Invalid plan type: ${planType}. Must be one of: ${Object.keys(PRICE_IDS).join(", ")}`);
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Try to get authenticated user (optional)
    let userEmail: string | undefined;
    let userId: string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader !== "Bearer ") {
      try {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        );
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabaseClient.auth.getUser(token);
        userEmail = data.user?.email ?? undefined;
        userId = data.user?.id ?? undefined;
      } catch {
        // Auth failed — continue without user
      }
    }

    // Check if customer already exists (only if we have an email)
    let customerId: string | undefined;
    let customerHadTrial = false;

    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        const allSubs = await stripe.subscriptions.list({
          customer: customerId,
          limit: 100,
        });
        customerHadTrial = allSubs.data.some((sub) => sub.trial_start !== null);
      }
    }

    // Determine trial eligibility
    const shouldOfferTrial =
      TRIAL_PLANS.includes(planType) &&
      !hadTrialBefore &&
      !customerHadTrial;

    const origin = req.headers.get("origin") || "https://magic-grab-express.lovable.app";

    // Build session config — ALWAYS require credit card
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [{ price: PRICE_IDS[planType], quantity: 1 }],
      mode: "subscription",
      payment_method_collection: "always",
      success_url: `${origin}/?stripe_success=true&plan=${planType}`,
      cancel_url: `${origin}/`,
      metadata: { user_id: userId || "anonymous", plan_type: planType },
    };

    // Only add free trial if eligible (credit card still required)
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
    console.error("create-checkout error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
