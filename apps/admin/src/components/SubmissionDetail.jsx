import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Paper,
  Chip,
  IconButton,
  Avatar,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ArrowLeft,
  LogOut,
  CheckCircle,
  XCircle,
  Download,
  ExternalLink,
  ChevronDown,
  FileJson,
  AlertTriangle
} from 'lucide-react';
import { fetchSubmissionDetails, approveSubmission, rejectSubmission } from '../utils/api';

function SubmissionDetail({ user, onLogout }) {
  const { prNumber } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadSubmissionDetails();
  }, [prNumber]);

  const loadSubmissionDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('gh_admin_token');
      const data = await fetchSubmissionDetails(token, prNumber);
      setSubmission(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve and merge this submission?')) {
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('gh_admin_token');
      await approveSubmission(token, prNumber, submission.pr.branch);
      setSuccessMessage('Submission approved and merged successfully!');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('gh_admin_token');
      await rejectSubmission(token, prNumber, rejectReason, submission.pr.branch);
      setSuccessMessage('Submission rejected and closed.');
      setRejectDialogOpen(false);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const downloadFile = (filename, content) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#0f1419', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress sx={{ color: '#1d9bf0' }} />
      </Box>
    );
  }

  if (error && !submission) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#0f1419', p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>Back to Dashboard</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f1419' }}>
      <AppBar position="static" sx={{ bgcolor: '#1a1f2e' }}>
        <Toolbar>
          <IconButton onClick={() => navigate('/')} sx={{ mr: 2, color: '#e7e9ea' }}>
            <ArrowLeft size={20} />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#e7e9ea' }}>
            Submission Details
          </Typography>
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ color: '#8b98a5' }}>
                {user.username}
              </Typography>
              <Avatar src={user.avatarUrl} alt={user.username} sx={{ width: 32, height: 32 }} />
              <IconButton onClick={onLogout} sx={{ color: '#e7e9ea' }}>
                <LogOut size={20} />
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ padding: 3, maxWidth: 1400, margin: '0 auto' }}>
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>{successMessage}</Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        {/* Conflict Warning */}
        {submission.files && submission.files.some(f => f.exists) && (
          <Alert 
            severity="warning" 
            icon={<AlertTriangle size={20} />}
            sx={{ mb: 3 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              File Conflicts Detected
            </Typography>
            <Typography variant="body2">
              Some files in this submission already exist in the target branch and will be overwritten if approved:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
              {submission.files.filter(f => f.exists).map((file, idx) => (
                <li key={idx}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {file.filename}
                  </Typography>
                </li>
              ))}
            </Box>
          </Alert>
        )}

        {/* PR Info Card */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#1a1f2e' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ color: '#e7e9ea', mb: 1 }}>
                {submission.pr.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label={`PR #${submission.pr.number}`}
                  size="small"
                  sx={{ bgcolor: '#38444d', color: '#e7e9ea' }}
                />
                {submission.pr.isDraft && (
                  <Chip label="Draft" color="warning" size="small" />
                )}
              </Box>
            </Box>
            <IconButton
              href={submission.pr.url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: '#1d9bf0' }}
            >
              <ExternalLink size={20} />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2, bgcolor: '#38444d' }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ color: '#8b98a5', mb: 0.5 }}>
                Submitter
              </Typography>
              <Typography variant="body1" sx={{ color: '#e7e9ea' }}>
                {submission.metadata.submitter}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#8b98a5', mb: 0.5 }}>
                Target Path
              </Typography>
              <Typography variant="body1" sx={{ color: '#e7e9ea', fontFamily: 'monospace' }}>
                {submission.metadata.targetPath}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#8b98a5', mb: 0.5 }}>
                Submitted
              </Typography>
              <Typography variant="body1" sx={{ color: '#e7e9ea' }}>
                {formatDate(submission.pr.createdAt)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#8b98a5', mb: 0.5 }}>
                Branch
              </Typography>
              <Typography variant="body1" sx={{ color: '#e7e9ea', fontFamily: 'monospace' }}>
                {submission.pr.branch}
              </Typography>
            </Box>
          </Box>

          {submission.metadata.comments && submission.metadata.comments !== 'n/a' && (
            <>
              <Divider sx={{ my: 2, bgcolor: '#38444d' }} />
              <Box>
                <Typography variant="body2" sx={{ color: '#8b98a5', mb: 0.5 }}>
                  Comments
                </Typography>
                <Typography variant="body1" sx={{ color: '#e7e9ea' }}>
                  {submission.metadata.comments}
                </Typography>
              </Box>
            </>
          )}
        </Paper>

        {/* Files */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#1a1f2e' }}>
          <Typography variant="h6" sx={{ color: '#e7e9ea', mb: 2 }}>
            Files ({submission.files.length})
          </Typography>

          {submission.files.map((file, index) => (
            <Accordion
              key={index}
              sx={{
                bgcolor: '#0f1419',
                color: '#e7e9ea',
                mb: 1,
                '&:before': { display: 'none' }
              }}
            >
              <AccordionSummary
                expandIcon={<ChevronDown style={{ color: '#8b98a5' }} />}
                sx={{ '&:hover': { bgcolor: '#1a1f2e' } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <FileJson size={20} style={{ color: '#1d9bf0' }} />
                  <Typography sx={{ flexGrow: 1, fontFamily: 'monospace' }}>
                    {file.filename.split('/').pop()}
                  </Typography>
                  {file.exists && (
                    <Chip
                      label="Conflicts"
                      size="small"
                      icon={<AlertTriangle size={14} />}
                      sx={{ bgcolor: '#f91880', color: '#fff' }}
                    />
                  )}
                  {file.teamData?.hasTeamData && (
                    <Chip
                      label="Has Team Data"
                      size="small"
                      sx={{ bgcolor: '#238636', color: '#fff' }}
                    />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ bgcolor: '#0f1419' }}>
                {file.error ? (
                  <Alert severity="error">{file.error}</Alert>
                ) : (
                  <>
                    {/* Team Data Section */}
                    {file.teamData?.hasTeamData && (
                      <Card sx={{ mb: 2, bgcolor: '#1a1f2e' }}>
                        <CardContent>
                          <Typography variant="subtitle2" sx={{ color: '#1d9bf0', mb: 1 }}>
                            Team Data
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                            {file.teamData.team && (
                              <Box>
                                <Typography variant="caption" sx={{ color: '#8b98a5' }}>
                                  Team
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#e7e9ea' }}>
                                  {file.teamData.team}
                                </Typography>
                              </Box>
                            )}
                            {file.teamData.event && (
                              <Box>
                                <Typography variant="caption" sx={{ color: '#8b98a5' }}>
                                  Event
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#e7e9ea' }}>
                                  {file.teamData.event}
                                </Typography>
                              </Box>
                            )}
                            {file.teamData.season && (
                              <Box>
                                <Typography variant="caption" sx={{ color: '#8b98a5' }}>
                                  Season
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#e7e9ea' }}>
                                  {file.teamData.season}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    )}

                    {/* JSON Preview */}
                    {file.content && (
                      <>
                        <Typography variant="subtitle2" sx={{ color: '#8b98a5', mb: 1 }}>
                          JSON Preview
                        </Typography>
                        <Box
                          sx={{
                            bgcolor: '#000',
                            p: 2,
                            borderRadius: 1,
                            overflow: 'auto',
                            maxHeight: 400,
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            color: '#e7e9ea',
                            mb: 2
                          }}
                        >
                          <pre style={{ margin: 0 }}>
                            {JSON.stringify(JSON.parse(file.content), null, 2)}
                          </pre>
                        </Box>

                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Download size={16} />}
                          onClick={() => downloadFile(file.filename.split('/').pop(), file.content)}
                          sx={{
                            color: '#1d9bf0',
                            borderColor: '#1d9bf0',
                            '&:hover': { borderColor: '#1d9bf0', bgcolor: 'rgba(29, 155, 240, 0.1)' }
                          }}
                        >
                          Download File
                        </Button>
                      </>
                    )}
                  </>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>

        {/* Actions */}
        <Paper sx={{ p: 3, bgcolor: '#1a1f2e' }}>
          <Typography variant="h6" sx={{ color: '#e7e9ea', mb: 2 }}>
            Actions
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CheckCircle size={20} />}
              onClick={handleApprove}
              disabled={actionLoading || submission.pr.state !== 'open'}
              sx={{
                bgcolor: '#238636',
                '&:hover': { bgcolor: '#2ea043' },
                flex: 1
              }}
            >
              Approve & Merge
            </Button>
            <Button
              variant="contained"
              size="large"
              startIcon={<XCircle size={20} />}
              onClick={() => setRejectDialogOpen(true)}
              disabled={actionLoading || submission.pr.state !== 'open'}
              sx={{
                bgcolor: '#da3633',
                '&:hover': { bgcolor: '#b62324' },
                flex: 1
              }}
            >
              Reject
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => !actionLoading && setRejectDialogOpen(false)}
        PaperProps={{ sx: { bgcolor: '#1a1f2e', color: '#e7e9ea' } }}
      >
        <DialogTitle>Reject Submission</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#8b98a5', mb: 2 }}>
            Please provide a reason for rejecting this submission. This will be posted as a comment on the PR.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#e7e9ea',
                bgcolor: '#0f1419',
                '& fieldset': { borderColor: '#38444d' },
                '&:hover fieldset': { borderColor: '#8b98a5' },
                '&.Mui-focused fieldset': { borderColor: '#1d9bf0' }
              }
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
            onClick={handleReject}
            disabled={actionLoading || !rejectReason.trim()}
            sx={{ color: '#da3633' }}
          >
            {actionLoading ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SubmissionDetail;
