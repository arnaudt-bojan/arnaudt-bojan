'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Box,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Mail, Key } from '@mui/icons-material';

type UserType = 'seller' | 'buyer';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [userType, setUserType] = useState<UserType>('seller');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/email/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          loginContext: userType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code');
      }

      setSuccess('Verification code sent! Check your email (including spam folder).');
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/email/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          code,
          loginContext: userType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      setSuccess('Login successful! Redirecting...');
      
      // Redirect to dashboard after successful login
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
    setError('');
    setSuccess('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Card elevation={3}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h3" component="h1" gutterBottom>
                Welcome to Upfirst
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sign in with your email - no password needed
              </Typography>
            </Box>

            {/* User Type Toggle */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
              <ToggleButtonGroup
                value={userType}
                exclusive
                onChange={(_, newType) => {
                  if (newType !== null) {
                    setUserType(newType);
                    setError('');
                  }
                }}
                aria-label="user type"
                disabled={loading}
                data-testid="toggle-user-type"
              >
                <ToggleButton value="seller" aria-label="seller" data-testid="toggle-seller">
                  Seller
                </ToggleButton>
                <ToggleButton value="buyer" aria-label="buyer" data-testid="toggle-buyer">
                  Buyer
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }} data-testid="alert-error">
                {error}
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert severity="success" sx={{ mb: 3 }} data-testid="alert-success">
                {success}
              </Alert>
            )}

            {/* Step 1: Email Input */}
            {step === 'email' && (
              <form onSubmit={handleSendCode}>
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                    InputProps={{
                      startAdornment: <Mail sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    data-testid="input-email"
                  />
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading || !email}
                  data-testid="button-send-code"
                  sx={{ mb: 2 }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Sending Code...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                  We&apos;ll send a 6-digit code to your email
                </Typography>
              </form>
            )}

            {/* Step 2: Code Verification */}
            {step === 'code' && (
              <form onSubmit={handleVerifyCode}>
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Verification Code"
                    type="text"
                    value={code}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setCode(value);
                    }}
                    placeholder="000000"
                    required
                    disabled={loading}
                    inputProps={{
                      maxLength: 6,
                      style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' },
                    }}
                    InputProps={{
                      startAdornment: <Key sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    data-testid="input-code"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                    Enter the 6-digit code sent to {email}
                  </Typography>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading || code.length !== 6}
                  data-testid="button-verify-code"
                  sx={{ mb: 2 }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Sign In'
                  )}
                </Button>

                <Button
                  variant="text"
                  fullWidth
                  onClick={handleBackToEmail}
                  disabled={loading}
                  data-testid="button-back"
                >
                  ← Back to Email
                </Button>
              </form>
            )}

            {/* Test Credentials Hint (Development Only) */}
            {process.env.NODE_ENV === 'development' && step === 'email' && (
              <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Test Credentials:
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Email: mirtorabi+seller1@gmail.com
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Code: 111111
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Type: Seller
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
