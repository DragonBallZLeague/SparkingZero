import React, { useState } from 'react';
import { initiateDeviceFlow, waitForAuthorization } from '../utils/githubAuth';
import { Box, Button, Typography, CircularProgress, Alert, Paper, Link } from '@mui/material';
import { Lock, Github } from 'lucide-react';

const ADMIN_CLIENT_ID = import.meta.env.VITE_ADMIN_CLIENT_ID || 'Ov23lie3nldyoWZagbG3';

function LoginPage({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deviceCode, setDeviceCode] = useState(null);
  const [userCode, setUserCode] = useState(null);
  const [verificationUri, setVerificationUri] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Initiate device flow
      const deviceData = await initiateDeviceFlow(ADMIN_CLIENT_ID);
      
      setDeviceCode(deviceData.device_code);
      setUserCode(deviceData.user_code);
      setVerificationUri(deviceData.verification_uri);

      // Open GitHub authorization page in new tab
      window.open(deviceData.verification_uri, '_blank');

      // Poll for token
      const token = await waitForAuthorization(
        ADMIN_CLIENT_ID,
        deviceData.device_code,
        deviceData.interval || 5
      );

      // Login successful
      await onLogin(token);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to authenticate');
      setLoading(false);
      setDeviceCode(null);
      setUserCode(null);
      setVerificationUri(null);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#0f1419',
        padding: 3
      }}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: 500,
          width: '100%',
          padding: 4,
          bgcolor: '#1a1f2e',
          color: '#e7e9ea'
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Lock size={48} style={{ marginBottom: 16, color: '#1d9bf0' }} />
          <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#e7e9ea' }}>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" color="#8b98a5">
            Manage data submissions for Sparking Zero Battle Results
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {!loading && !deviceCode && (
          <Box>
            <Typography variant="body2" sx={{ mb: 3, color: '#8b98a5' }}>
              Sign in with your GitHub account to verify you have contributor access to the repository.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleLogin}
              startIcon={<Github size={20} />}
              sx={{
                bgcolor: '#238636',
                '&:hover': { bgcolor: '#2ea043' },
                textTransform: 'none',
                fontSize: '1rem',
                py: 1.5
              }}
            >
              Sign in with GitHub
            </Button>
          </Box>
        )}

        {loading && deviceCode && (
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 3, color: '#1d9bf0' }} />
            <Typography variant="h6" gutterBottom sx={{ color: '#e7e9ea' }}>
              Waiting for authorization...
            </Typography>
            <Paper
              sx={{
                p: 2,
                mb: 2,
                bgcolor: '#0f1419',
                border: '1px solid #38444d'
              }}
            >
              <Typography variant="body2" color="#8b98a5" gutterBottom>
                Enter this code on GitHub:
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: 'monospace',
                  color: '#1d9bf0',
                  letterSpacing: 2,
                  my: 1
                }}
              >
                {userCode}
              </Typography>
            </Paper>
            <Typography variant="body2" color="#8b98a5" gutterBottom>
              A new tab should have opened. If not, visit:
            </Typography>
            <Link
              href={verificationUri}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: '#1d9bf0', wordBreak: 'break-all' }}
            >
              {verificationUri}
            </Link>
          </Box>
        )}

        {loading && !deviceCode && (
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress sx={{ color: '#1d9bf0' }} />
            <Typography variant="body1" sx={{ mt: 2, color: '#8b98a5' }}>
              Initializing...
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default LoginPage;
