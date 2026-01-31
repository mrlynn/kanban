'use client';

import { signIn } from 'next-auth/react';
import { Box, Button, Container, Paper, Typography } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';

export default function SignIn() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            🍃 Clawd Kanban
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to access your boards
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<GitHubIcon />}
            onClick={() => signIn('github', { callbackUrl: '/' })}
            sx={{
              bgcolor: '#24292e',
              '&:hover': { bgcolor: '#1a1e22' },
            }}
          >
            Sign in with GitHub
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}
