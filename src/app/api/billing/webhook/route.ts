/**
 * Stripe Webhook Handler
 * 
 * POST /api/billing/webhook
 * Handles Stripe subscription events
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { stripe, getPlanFromPriceId } from '@/lib/stripe';
import { Tenant, PLAN_LIMITS, PlanType } from '@/types/tenant';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const body = await request.text();
  const signature = headers().get('stripe-signature');

  if (!signature || !webhookSecret) {
    console.warn('[stripe-webhook] Missing signature or webhook secret');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe-webhook] Signature verification failed:', message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = await getDb();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(db, session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(db, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(db, subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(db, invoice);
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[stripe-webhook] Handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/**
 * Handle successful checkout - upgrade tenant
 */
async function handleCheckoutComplete(
  db: Awaited<ReturnType<typeof getDb>>,
  session: Stripe.Checkout.Session
) {
  const tenantId = session.metadata?.tenantId;
  const plan = session.metadata?.plan as PlanType | undefined;

  if (!tenantId || !plan) {
    console.error('[stripe-webhook] Missing metadata in checkout session');
    return;
  }

  console.log(`[stripe-webhook] Checkout complete: tenant=${tenantId}, plan=${plan}`);

  await db.collection<Tenant>('tenants').updateOne(
    { id: tenantId },
    {
      $set: {
        plan,
        limits: PLAN_LIMITS[plan],
        stripeSubscriptionId: session.subscription as string,
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Handle subscription updates (plan changes, renewals)
 */
async function handleSubscriptionUpdate(
  db: Awaited<ReturnType<typeof getDb>>,
  subscription: Stripe.Subscription
) {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) {
    console.warn('[stripe-webhook] Subscription missing tenantId metadata');
    return;
  }

  // Get the plan from the price
  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? getPlanFromPriceId(priceId) : null;

  if (!plan) {
    console.warn(`[stripe-webhook] Unknown price ID: ${priceId}`);
    return;
  }

  const status = subscription.status;
  const isActive = ['active', 'trialing'].includes(status);

  console.log(`[stripe-webhook] Subscription update: tenant=${tenantId}, plan=${plan}, status=${status}`);

  if (isActive) {
    // Active subscription - set plan
    await db.collection<Tenant>('tenants').updateOne(
      { id: tenantId },
      {
        $set: {
          plan,
          limits: PLAN_LIMITS[plan],
          stripeSubscriptionId: subscription.id,
          planExpiresAt: (subscription as any).current_period_end
            ? new Date((subscription as any).current_period_end * 1000)
            : undefined,
          updatedAt: new Date(),
        },
      }
    );
  } else if (status === 'past_due') {
    // Payment failed but not cancelled yet - keep plan but mark as past due
    console.log(`[stripe-webhook] Subscription past due: tenant=${tenantId}`);
  }
}

/**
 * Handle subscription cancellation - downgrade to free
 */
async function handleSubscriptionCancelled(
  db: Awaited<ReturnType<typeof getDb>>,
  subscription: Stripe.Subscription
) {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) return;

  console.log(`[stripe-webhook] Subscription cancelled: tenant=${tenantId}`);

  await db.collection<Tenant>('tenants').updateOne(
    { id: tenantId },
    {
      $set: {
        plan: 'free',
        limits: PLAN_LIMITS.free,
        stripeSubscriptionId: undefined,
        planExpiresAt: undefined,
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Handle failed payment - could notify user
 */
async function handlePaymentFailed(
  db: Awaited<ReturnType<typeof getDb>>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;
  
  // Find tenant by Stripe customer ID
  const tenant = await db.collection<Tenant>('tenants').findOne({
    stripeCustomerId: customerId,
  });

  if (tenant) {
    console.log(`[stripe-webhook] Payment failed for tenant: ${tenant.id}`);
    // Could send notification, add banner, etc.
  }
}
