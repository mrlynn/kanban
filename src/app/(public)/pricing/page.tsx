'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  alpha,
  Divider,
} from '@mui/material';
import {
  Check,
  GitHub,
  SmartToy,
  Api,
  Storage,
  Group,
  AutoFixHigh,
} from '@mui/icons-material';

interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: PlanFeature[];
  popular?: boolean;
  current?: boolean;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For personal projects and getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      { text: '3 boards', included: true },
      { text: '50 tasks per board', included: true },
      { text: '1 API key', included: true },
      { text: 'Basic automations (2 rules)', included: true },
      { text: 'GitHub integration', included: false },
      { text: 'OpenClaw AI integration', included: false },
      { text: 'AI chat (bring your own)', included: true },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For power users who want more',
    monthlyPrice: 12,
    yearlyPrice: 120,
    popular: true,
    features: [
      { text: '20 boards', included: true },
      { text: '500 tasks per board', included: true },
      { text: '5 API keys', included: true },
      { text: 'Automations (20 rules)', included: true },
      { text: 'GitHub integration', included: true, highlight: true },
      { text: 'OpenClaw AI integration', included: true, highlight: true },
      { text: '3,000 AI messages/month', included: true },
      { text: '1GB storage', included: true },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    description: 'For teams working together',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      { text: 'Unlimited boards', included: true },
      { text: 'Unlimited tasks', included: true },
      { text: '20 API keys', included: true },
      { text: 'Unlimited automations', included: true },
      { text: 'GitHub integration', included: true },
      { text: 'OpenClaw AI integration', included: true },
      { text: 'Unlimited AI messages', included: true, highlight: true },
      { text: '10GB storage', included: true },
      { text: 'Up to 10 team members', included: true, highlight: true },
    ],
  },
];

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get('cancelled');
  
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') return;
    
    setLoading(planId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          interval: annual ? 'yearly' : 'monthly',
        }),
      });

      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Failed to start checkout:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Simple, honest pricing
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: 600, mx: 'auto' }}>
          Start free, upgrade when you're ready. No hidden fees, no surprises.
        </Typography>
        
        {/* Billing toggle */}
        <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Typography color={!annual ? 'text.primary' : 'text.secondary'}>Monthly</Typography>
          <Switch
            checked={annual}
            onChange={(e) => setAnnual(e.target.checked)}
            color="primary"
          />
          <Typography color={annual ? 'text.primary' : 'text.secondary'}>
            Annual
            <Chip
              label="Save 17%"
              size="small"
              color="success"
              sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
            />
          </Typography>
        </Box>
      </Box>

      {/* Cancelled alert */}
      {cancelled && (
        <Alert severity="info" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
          No worries! Your checkout was cancelled. Feel free to explore more or come back anytime.
        </Alert>
      )}

      {/* Plans */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        {plans.map((plan) => {
          const price = annual ? plan.yearlyPrice : plan.monthlyPrice;
          const period = annual ? '/year' : '/month';
          
          return (
            <Paper
              key={plan.id}
              sx={{
                p: 4,
                position: 'relative',
                border: plan.popular ? '2px solid' : '1px solid',
                borderColor: plan.popular ? 'primary.main' : 'border.subtle',
                bgcolor: plan.popular ? (theme) => alpha(theme.palette.primary.main, 0.02) : 'background.paper',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <Chip
                  label="Most Popular"
                  color="primary"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                />
              )}

              {/* Plan header */}
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {plan.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40 }}>
                {plan.description}
              </Typography>

              {/* Price */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  component="span"
                  sx={{ fontSize: '2.5rem', fontWeight: 700 }}
                >
                  ${price}
                </Typography>
                {price > 0 && (
                  <Typography component="span" color="text.secondary">
                    {period}
                  </Typography>
                )}
                {plan.id === 'free' && (
                  <Typography variant="body2" color="text.secondary">
                    Free forever
                  </Typography>
                )}
              </Box>

              {/* CTA Button */}
              <Button
                variant={plan.popular ? 'contained' : 'outlined'}
                fullWidth
                size="large"
                disabled={plan.id === 'free' || loading !== null}
                onClick={() => handleUpgrade(plan.id)}
                sx={{ mb: 3 }}
              >
                {loading === plan.id ? (
                  <CircularProgress size={20} />
                ) : plan.id === 'free' ? (
                  'Current Plan'
                ) : (
                  `Upgrade to ${plan.name}`
                )}
              </Button>

              <Divider sx={{ mb: 3 }} />

              {/* Features */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {plan.features.map((feature, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      opacity: feature.included ? 1 : 0.5,
                    }}
                  >
                    <Check
                      sx={{
                        fontSize: 18,
                        color: feature.included
                          ? feature.highlight
                            ? 'primary.main'
                            : 'success.main'
                          : 'text.disabled',
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: feature.highlight ? 600 : 400,
                        color: feature.highlight ? 'text.primary' : 'text.secondary',
                      }}
                    >
                      {feature.text}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Footer note */}
      <Box sx={{ textAlign: 'center', mt: 6 }}>
        <Typography variant="body2" color="text.secondary">
          All plans include core features: kanban boards, task management, activity feed, and API access.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Questions? Reach out anytime.
        </Typography>
      </Box>
    </Box>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<Box sx={{ p: 4 }}>Loading...</Box>}>
      <PricingContent />
    </Suspense>
  );
}
