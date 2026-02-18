import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Avatar,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment
} from '@mui/material';
import { LogOut, Eye, Search, RefreshCw } from 'lucide-react';
import { fetchSubmissions } from '../utils/api';

function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = submissions.filter(sub =>
        sub.submitter?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.targetPath?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSubmissions(filtered);
    } else {
      setFilteredSubmissions(submissions);
    }
  }, [searchTerm, submissions]);

  const loadSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('gh_admin_token');
      const data = await fetchSubmissions(token);
      setSubmissions(data.submissions || []);
      setFilteredSubmissions(data.submissions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusChip = (submission) => {
    if (submission.isDraft) {
      return <Chip label="Pending Review" color="warning" size="small" />;
    }
    return <Chip label="Ready" color="success" size="small" />;
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f1419' }}>
      <AppBar position="static" sx={{ bgcolor: '#1a1f2e' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#e7e9ea' }}>
            Admin Dashboard
          </Typography>
          
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ color: '#8b98a5' }}>
                {user.username}
              </Typography>
              <Avatar
                src={user.avatarUrl}
                alt={user.username}
                sx={{ width: 32, height: 32 }}
              />
              <IconButton onClick={onLogout} sx={{ color: '#e7e9ea' }}>
                <LogOut size={20} />
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ padding: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ color: '#e7e9ea' }}>
            Data Submissions
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            onClick={loadSubmissions}
            disabled={loading}
            sx={{
              color: '#1d9bf0',
              borderColor: '#1d9bf0',
              '&:hover': { borderColor: '#1d9bf0', bgcolor: 'rgba(29, 155, 240, 0.1)' }
            }}
          >
            Refresh
          </Button>
        </Box>

        <TextField
          fullWidth
          placeholder="Search submissions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              color: '#e7e9ea',
              bgcolor: '#1a1f2e',
              '& fieldset': { borderColor: '#38444d' },
              '&:hover fieldset': { borderColor: '#8b98a5' },
              '&.Mui-focused fieldset': { borderColor: '#1d9bf0' }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={20} style={{ color: '#8b98a5' }} />
              </InputAdornment>
            )
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#1d9bf0' }} />
          </Box>
        ) : filteredSubmissions.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#1a1f2e' }}>
            <Typography variant="body1" sx={{ color: '#8b98a5' }}>
              {submissions.length === 0 ? 'No pending submissions' : 'No submissions match your search'}
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ bgcolor: '#1a1f2e' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#0f1419' }}>
                  <TableCell sx={{ color: '#e7e9ea', fontWeight: 'bold' }}>Submitter</TableCell>
                  <TableCell sx={{ color: '#e7e9ea', fontWeight: 'bold' }}>Target Path</TableCell>
                  <TableCell sx={{ color: '#e7e9ea', fontWeight: 'bold' }} align="center">Files</TableCell>
                  <TableCell sx={{ color: '#e7e9ea', fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ color: '#e7e9ea', fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ color: '#e7e9ea', fontWeight: 'bold' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSubmissions.map((submission) => (
                  <TableRow
                    key={submission.number}
                    sx={{
                      '&:hover': { bgcolor: '#0f1419' },
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/submission/${submission.number}`)}
                  >
                    <TableCell sx={{ color: '#e7e9ea' }}>{submission.submitter || 'Unknown'}</TableCell>
                    <TableCell sx={{ color: '#8b98a5', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {submission.targetPath}
                    </TableCell>
                    <TableCell sx={{ color: '#e7e9ea' }} align="center">
                      <Chip label={submission.fileCount} size="small" sx={{ bgcolor: '#38444d', color: '#e7e9ea' }} />
                    </TableCell>
                    <TableCell sx={{ color: '#8b98a5', fontSize: '0.875rem' }}>
                      {formatDate(submission.createdAt)}
                    </TableCell>
                    <TableCell>{getStatusChip(submission)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/submission/${submission.number}`);
                        }}
                        sx={{ color: '#1d9bf0' }}
                      >
                        <Eye size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}

export default Dashboard;
