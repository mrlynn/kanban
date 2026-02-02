/**
 * Stripe Checkout API
 * 
 * POST /api/billing/checkout
 * Creates a Stripe Checkout session for upgrading
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getDb } from '@/lib/mongodb';
import { stripe, STRIPE_PRICES, isStripeEnabled } from '@/lib/stripe';
import { Tenant } from '@/types/tenant';

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!isStripeEnabled() || !stripe) {
      return NextResponse.json(
        { error: 'Billing is not configured' },
        { status: 503 }
      );
    }

    // Verify session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user as { id: string; email: string; name?: string | null };

    const { plan, interval = 'monthly' } = await request.json();

    // Validate plan
    if (!['pro', 'team'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get price ID
    const priceKey = `${plan}_${interval}` as keyof typeof STRIPE_PRICES;
    const priceId = STRIPE_PRICES[priceKey];
    
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price not configured' },
        { status: 400 }
      );
    }

    // Get tenant
    const db = await getDb();
    const tenant = await db.collection<Tenant>('tenants').findOne({
      ownerId: user.id,
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // If tenant already has a Stripe customer, use it
    let customerId = tenant.stripeCustomerId;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          tenantId: tenant.id,
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to tenant
      await db.collection<Tenant>('tenants').updateOne(
        { id: tenant.id },
        { $set: { stripeCustomerId: customerId, updatedAt: new Date() } }
      );
    }

    // Create checkout session
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/settings?upgraded=true`,
      cancel_url: `${baseUrl}/pricing?cancelled=true`,
      metadata: {
        tenantId: tenant.id,
        plan,
      },
      subscription_data: {
        metadata: {
          tenantId: tenant.id,
          plan,
        },
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address for tax
      billing_address_collection: 'auto',
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('[billing/checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
