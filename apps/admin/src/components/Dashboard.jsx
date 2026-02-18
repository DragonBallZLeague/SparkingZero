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
  InputAdornment,
  Checkbox,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { LogOut, Search, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { fetchSubmissions, approveSubmission, rejectSubmission } from '../utils/api';

function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [currentAction, setCurrentAction] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

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


  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelected(filteredSubmissions.map(sub => sub.number));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (prNumber) => {
    setSelected(prev => 
      prev.includes(prNumber) 
        ? prev.filter(num => num !== prNumber)
        : [...prev, prNumber]
    );
  };

  const handleApprove = async (prNumber, branch) => {
    setActionLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('gh_admin_token');
      await approveSubmission(token, prNumber, branch);
      setSuccessMessage(`Submission #${prNumber} approved successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadSubmissions();
      setSelected(prev => prev.filter(num => num !== prNumber));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (prNumber, branch) => {
    setCurrentAction({ prNumber, branch });
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('gh_admin_token');
      await rejectSubmission(token, currentAction.prNumber, rejectReason, currentAction.branch);
      setSuccessMessage(`Submission #${currentAction.prNumber} rejected successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setRejectDialogOpen(false);
      setRejectReason('');
      setCurrentAction(null);
      await loadSubmissions();
      setSelected(prev => prev.filter(num => num !== currentAction.prNumber));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchApprove = async (force = false) => {
    const message = force 
      ? `Force approve ${selected.length} submission(s) (bypassing status checks)?`
      : `Approve ${selected.length} submission(s)?`;
      
    if (!window.confirm(message)) return;

    setActionLoading(true);
    setError(null);
    const token = sessionStorage.getItem('gh_admin_token');
    let failedCount = 0;
    
    for (const prNumber of selected) {
      const submission = submissions.find(s => s.number === prNumber);
      if (submission) {
        try {
          await approveSubmission(token, prNumber, submission.branch, force);
        } catch (err) {
          console.error(`Failed to approve #${prNumber}:`, err);
          failedCount++;
        }
      }
    }

    if (failedCount > 0 && !force) {
      const shouldForce = window.confirm(
        `${failedCount} submission(s) failed, likely due to failing status checks.\n\nDo you want to retry with force merge (bypassing checks)?`
      );
      if (shouldForce) {
        setActionLoading(false);
        return handleBatchApprove(true);
      }
    }

    setSuccessMessage(`${selected.length - failedCount} submission(s) approved!${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
    setTimeout(() => setSuccessMessage(null), 3000);
    setSelected([]);
    await loadSubmissions();
    setActionLoading(false);
  };

  const handleBatchReject = () => {
    setCurrentAction({ batch: true });
    setRejectDialogOpen(true);
  };

  const confirmBatchReject = async () => {
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    setError(null);
    const token = sessionStorage.getItem('gh_admin_token');
    
    for (const prNumber of selected) {
      const submission = submissions.find(s => s.number === prNumber);
      if (submission) {
        try {
          await rejectSubmission(token, prNumber, rejectReason, submission.branch);
        } catch (err) {
          console.error(`Failed to reject #${prNumber}:`, err);
        }
      }
    }

    setSuccessMessage(`${selected.length} submission(s) rejected!`);
    setTimeout(() => setSuccessMessage(null), 3000);
    setRejectDialogOpen(false);
    setRejectReason('');
    setCurrentAction(null);
    setSelected([]);
    await loadSubmissions();
    setActionLoading(false);
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
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        {selected.length > 0 && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#1a1f2e', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ color: '#e7e9ea', flexGrow: 1 }}>
              {selected.length} submission(s) selected
            </Typography>
            <Button
              variant="contained"
              startIcon={<CheckCircle size={18} />}
              onClick={handleBatchApprove}
              disabled={actionLoading}
              sx={{
                bgcolor: '#00ba7c',
                '&:hover': { bgcolor: '#00a36c' }
              }}
            >
              Approve Selected
            </Button>
            <Button
              variant="contained"
              startIcon={<XCircle size={18} />}
              onClick={handleBatchReject}
              disabled={actionLoading}
              sx={{
                bgcolor: '#f91880',
                '&:hover': { bgcolor: '#dc1370' }
              }}
            >
              Reject Selected
            </Button>
          </Paper>
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
                  <TableCell padding="checkbox" sx={{ color: '#e7e9ea' }}>
                    <Checkbox
                      checked={selected.length === filteredSubmissions.length && filteredSubmissions.length > 0}
                      indeterminate={selected.length > 0 && selected.length < filteredSubmissions.length}
                      onChange={handleSelectAll}
                      sx={{
                        color: '#8b98a5',
                        '&.Mui-checked': { color: '#1d9bf0' },
                        '&.MuiCheckbox-indeterminate': { color: '#1d9bf0' }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#e7e9ea', fontWeight: 'bold' }}>Submitter</TableCell>
                  <TableCell sx={{ color: '#e7e9ea', fontWeight: 'bold' }}>Target Path</TableCell>
                  <TableCell sx={{ color: '#e7e9ea', fontWeight: 'bold' }}>Team 1</TableCell>
                  <TableCell sx={{ color: '#e7e9ea', fontWeight: 'bold' }}>Team 2</TableCell>
                  <TableCell sx={{ color: '#e7e9ea', fontWeight: 'bold' }} align="center">Files</TableCell>
                  <TableCell sx={{ color: '#e7e9ea', fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ color: '#e7e9ea', fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ color: '#e7e9ea', fontWeight: 'bold' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSubmissions.map((submission, index) => (
                  <TableRow
                    key={submission.number}
                    onClick={() => navigate(`/submission/${submission.number}`)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#0f1419' },
                      bgcolor: submission.hasConflicts 
                        ? 'rgba(249, 24, 128, 0.05)' 
                        : index % 2 === 0 
                          ? '#1a1f2e' 
                          : '#161b28'
                    }}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.includes(submission.number)}
                        onChange={() => handleSelect(submission.number)}
                        sx={{
                          color: '#8b98a5',
                          '&.Mui-checked': { color: '#1d9bf0' }
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#e7e9ea' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {submission.submitter || 'Unknown'}
                        {submission.hasConflicts && (
                          <Tooltip title="Files conflict with existing data">
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                              <AlertTriangle size={16} color="#f91880" />
                            </Box>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#8b98a5', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {submission.targetPath}
                    </TableCell>
                    <TableCell sx={{ color: '#e7e9ea' }}>
                      {submission.teams && submission.teams[0] ? submission.teams[0] : '-'}
                    </TableCell>
                    <TableCell sx={{ color: '#e7e9ea' }}>
                      {submission.teams && submission.teams[1] ? submission.teams[1] : '-'}
                    </TableCell>
                    <TableCell sx={{ color: '#e7e9ea' }} align="center">
                      <Tooltip 
                        title={
                          <Box>
                            {submission.files && submission.files.length > 0 ? (
                              submission.files.map((file, idx) => (
                                <div key={idx} style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{file}</div>
                              ))
                            ) : (
                              'No files'
                            )}
                          </Box>
                        }
                      >
                        <Chip label={submission.fileCount} size="small" sx={{ bgcolor: '#38444d', color: '#e7e9ea', cursor: 'pointer' }} />
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ color: '#8b98a5', fontSize: '0.875rem' }}>
                      {formatDate(submission.createdAt)}
                    </TableCell>
                    <TableCell>{getStatusChip(submission)}</TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Tooltip title="Approve">
                          <span>
                            <IconButton
                              onClick={() => handleApprove(submission.number, submission.branch)}
                              disabled={actionLoading}
                              sx={{ 
                                color: '#00ba7c', 
                                '&:hover': { bgcolor: 'rgba(0, 186, 124, 0.1)' },
                                padding: '10px'
                              }}
                              size="medium"
                            >
                              <CheckCircle size={24} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <span>
                            <IconButton
                              onClick={() => handleReject(submission.number, submission.branch)}
                              disabled={actionLoading}
                              sx={{ 
                                color: '#f91880', 
                                '&:hover': { bgcolor: 'rgba(249, 24, 128, 0.1)' },
                                padding: '10px'
                              }}
                              size="medium"
                            >
                              <XCircle size={24} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog
        open={rejectDialogOpen}
        onClose={() => !actionLoading && setRejectDialogOpen(false)}
        PaperProps={{
          sx: { bgcolor: '#1a1f2e', color: '#e7e9ea' }
        }}
      >
        <DialogTitle>
          {currentAction?.batch 
            ? `Reject ${selected.length} Submission(s)`
            : `Reject Submission #${currentAction?.prNumber}`
          }
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for rejection"
            fullWidth
            multiline
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={actionLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#e7e9ea',
                '& fieldset': { borderColor: '#38444d' },
                '&:hover fieldset': { borderColor: '#8b98a5' },
                '&.Mui-focused fieldset': { borderColor: '#1d9bf0' }
              },
              '& .MuiInputLabel-root': { color: '#8b98a5' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setRejectDialogOpen(false)} 
            disabled={actionLoading}
            sx={{ color: '#8b98a5' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={currentAction?.batch ? confirmBatchReject : confirmReject}
            disabled={actionLoading || !rejectReason.trim()}
            sx={{ 
              color: '#f91880',
              '&:disabled': { color: '#38444d' }
            }}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Dashboard;
