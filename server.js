let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY);
} else {
  console.log("STRIPE_SECRET_KEY not set yet (payments disabled for now).");
}

