'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Button, CircularProgress, Container, Paper, Typography } from '@mui/material';
import Link from 'next/link';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    AccessDenied: 'You are not authorized to access this application.',
    Configuration: 'There is a problem with the server configuration.',
    Verification: 'The verification link may have expired or already been used.',
    Default: 'An error occurred during authentication.',
  };

  const message = errorMessages[error || ''] || errorMessages.Default;

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom color="error">
        Authentication Error
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {message}
      </Typography>
      <Button component={Link} href="/auth/signin" variant="contained">
        Try Again
      </Button>
    </>
  );
}

export default function AuthError() {
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
          <Suspense fallback={<CircularProgress />}>
            <ErrorContent />
          </Suspense>
        </Paper>
      </Box>
    </Container>
  );
}
