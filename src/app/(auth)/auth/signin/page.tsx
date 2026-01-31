'use client';

import { useState, useEffect } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import { 
  Box, 
  Button, 
  Container, 
  Paper, 
  Typography, 
  TextField,
  Divider,
  alpha,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import CodeIcon from '@mui/icons-material/Code';

export default function SignIn() {
  const [devUsername, setDevUsername] = useState('mike');
  const [isLoading, setIsLoading] = useState(false);
  const [hasDevLogin, setHasDevLogin] = useState(false);

  // Check if dev-login provider is available
  useEffect(() => {
    getProviders().then((providers) => {
      setHasDevLogin(!!providers?.['dev-login']);
    });
  }, []);

  const handleDevLogin = async () => {
    setIsLoading(true);
    await signIn('dev-login', { 
      username: devUsername,
      callbackUrl: '/' 
    });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#0A0F1C',
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={8}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            bgcolor: alpha('#ffffff', 0.03),
            border: '1px solid',
            borderColor: alpha('#ffffff', 0.1),
          }}
        >
          {/* Logo */}
          <Box
            component="img"
            src="/logo.png"
            alt="Moltboard"
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              objectFit: 'cover',
              mx: 'auto',
              mb: 2,
            }}
          />

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Moltboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to access your boards
          </Typography>

          {/* GitHub Login */}
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<GitHubIcon />}
            onClick={() => signIn('github', { callbackUrl: '/' })}
            sx={{
              bgcolor: '#24292e',
              py: 1.5,
              '&:hover': { bgcolor: '#1a1e22' },
            }}
          >
            Sign in with GitHub
          </Button>

          {/* Dev Login - only shown if provider exists (dev mode) */}
          {hasDevLogin && (
            <>
              <Divider sx={{ my: 3, color: 'text.secondary' }}>
                <Typography variant="caption" color="text.secondary">
                  DEV MODE
                </Typography>
              </Divider>

              <TextField
                fullWidth
                size="small"
                label="Username"
                value={devUsername}
                onChange={(e) => setDevUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDevLogin()}
                sx={{ mb: 2 }}
              />

              <Button
                variant="outlined"
                size="large"
                fullWidth
                startIcon={<CodeIcon />}
                onClick={handleDevLogin}
                disabled={!devUsername.trim() || isLoading}
                sx={{
                  borderColor: '#00ED64',
                  color: '#00ED64',
                  py: 1.5,
                  '&:hover': { 
                    borderColor: '#00ED64',
                    bgcolor: alpha('#00ED64', 0.1),
                  },
                }}
              >
                {isLoading ? 'Signing in...' : 'Dev Login'}
              </Button>

              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ display: 'block', mt: 2 }}
              >
                Dev login bypasses GitHub OAuth for local testing
              </Typography>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
