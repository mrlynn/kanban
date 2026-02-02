'use client';

import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Paper,
  alpha,
  Chip,
  Divider,
  Link,
} from '@mui/material';
import {
  Dashboard,
  SmartToy,
  GitHub,
  AutoFixHigh,
  Speed,
  Api,
  ArrowForward,
  CheckCircle,
} from '@mui/icons-material';
import NextLink from 'next/link';

const features = [
  {
    icon: Dashboard,
    title: 'Kanban Boards',
    description: 'Drag-and-drop task management with customizable columns. See your work at a glance.',
    color: '#c5534f',
  },
  {
    icon: SmartToy,
    title: 'AI Assistant',
    description: 'Chat with your tasks. Create, move, and update tasks using natural language.',
    color: '#d8c6a3',
  },
  {
    icon: GitHub,
    title: 'GitHub Integration',
    description: 'Auto-link PRs to tasks. Move tasks when PRs merge. Keep code and tasks in sync.',
    color: '#6b707a',
  },
  {
    icon: AutoFixHigh,
    title: 'Automations',
    description: 'Create rules to automate your workflow. Trigger actions on events automatically.',
    color: '#d07a3f',
  },
];

const benefits = [
  'Unlimited tasks on free plan',
  'No credit card required',
  'API access included',
  'Dark & light themes',
];

export default function LandingPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Navigation */}
      <Box
        component="nav"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          bgcolor: (theme) => alpha(theme.palette.background.default, 0.8),
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: 'border.subtle',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                component="img"
                src="/logo.png"
                alt="Moltboard"
                sx={{ width: 36, height: 36, borderRadius: 1.5 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Moltboard
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                component={NextLink}
                href="/pricing"
                color="inherit"
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
              >
                Pricing
              </Button>
              <Button
                component={NextLink}
                href="/auth/signin"
                variant="contained"
              >
                Sign In
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box
        sx={{
          pt: { xs: 16, md: 20 },
          pb: { xs: 10, md: 14 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle gradient background */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '150%',
            height: '100%',
            background: (theme) => `radial-gradient(ellipse at center top, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />
        
        <Container maxWidth="md" sx={{ position: 'relative' }}>
          <Chip
            label="Now with AI-powered task management"
            size="small"
            sx={{
              mb: 3,
              bgcolor: (theme) => alpha(theme.palette.accent.secondary, 0.12),
              color: 'accent.secondary',
              fontWeight: 500,
            }}
          />
          
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              fontWeight: 800,
              lineHeight: 1.1,
              mb: 3,
              letterSpacing: '-0.02em',
            }}
          >
            Task management
            <br />
            <Box
              component="span"
              sx={{
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.accent.warning})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              that actually helps
            </Box>
          </Typography>
          
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{
              maxWidth: 540,
              mx: 'auto',
              mb: 5,
              fontWeight: 400,
              lineHeight: 1.6,
            }}
          >
            A calm, focused workspace for managing tasks. 
            With AI that understands what you need.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              component={NextLink}
              href="/auth/signin"
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1rem',
              }}
            >
              Get Started Free
            </Button>
            <Button
              component={NextLink}
              href="/pricing"
              variant="outlined"
              size="large"
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1rem',
              }}
            >
              View Pricing
            </Button>
          </Box>
          
          {/* Benefits list */}
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 2, md: 4 },
              justifyContent: 'center',
              flexWrap: 'wrap',
              mt: 5,
            }}
          >
            {benefits.map((benefit) => (
              <Box
                key={benefit}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} />
                <Typography variant="body2" color="text.secondary">
                  {benefit}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'surface.secondary' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
              Everything you need
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
              Simple tools that work together
            </Typography>
          </Box>
          
          <Grid container spacing={3}>
            {features.map((feature) => (
              <Grid item xs={12} sm={6} md={3} key={feature.title}>
                <Paper
                  sx={{
                    p: 3,
                    height: '100%',
                    bgcolor: 'background.paper',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: alpha(feature.color, 0.12),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <feature.icon sx={{ color: feature.color, fontSize: 24 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* API Section */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 2,
                }}
              >
                <Api sx={{ color: 'primary.main' }} />
                <Typography variant="overline" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Developer Friendly
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
                Built for automation
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Full REST API included on every plan. Integrate with your tools, 
                build custom workflows, or connect your own AI assistant.
              </Typography>
              <Button
                component={NextLink}
                href="/auth/signin"
                variant="outlined"
                endIcon={<ArrowForward />}
              >
                Get your API key
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 3,
                  bgcolor: '#1a1d23',
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  overflow: 'auto',
                }}
              >
                <Box sx={{ color: '#6b707a', mb: 1 }}>// Create a task</Box>
                <Box sx={{ color: '#e6e8eb' }}>
                  <Box component="span" sx={{ color: '#c5534f' }}>POST</Box>
                  {' /api/tasks'}
                </Box>
                <Box sx={{ color: '#d8c6a3', mt: 2 }}>{'{'}</Box>
                <Box sx={{ color: '#e6e8eb', pl: 2 }}>
                  "title": <Box component="span" sx={{ color: '#5f8f6b' }}>"Review PR #42"</Box>,
                </Box>
                <Box sx={{ color: '#e6e8eb', pl: 2 }}>
                  "boardId": <Box component="span" sx={{ color: '#5f8f6b' }}>"board_abc123"</Box>
                </Box>
                <Box sx={{ color: '#d8c6a3' }}>{'}'}</Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: { xs: 8, md: 10 },
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'border.subtle',
        }}
      >
        <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Ready to get organized?
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Start free. No credit card required.
          </Typography>
          <Button
            component={NextLink}
            href="/auth/signin"
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            sx={{ px: 4, py: 1.5 }}
          >
            Create Free Account
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 4,
          bgcolor: 'surface.secondary',
          borderTop: '1px solid',
          borderColor: 'border.subtle',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                component="img"
                src="/logo.png"
                alt="Moltboard"
                sx={{ width: 28, height: 28, borderRadius: 1, opacity: 0.8 }}
              />
              <Typography variant="body2" color="text.secondary">
                © {new Date().getFullYear()} Moltboard
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Link
                component={NextLink}
                href="/pricing"
                color="text.secondary"
                underline="hover"
                variant="body2"
              >
                Pricing
              </Link>
              <Link
                component={NextLink}
                href="/privacy"
                color="text.secondary"
                underline="hover"
                variant="body2"
              >
                Privacy
              </Link>
              <Link
                component={NextLink}
                href="/terms"
                color="text.secondary"
                underline="hover"
                variant="body2"
              >
                Terms
              </Link>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
