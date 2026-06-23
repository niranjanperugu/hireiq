import React, { useState } from 'react'
import {
  Box, Typography, Paper, TextField, Button, Chip, Grid,
  Card, CardContent, CardActions, Skeleton, Alert, Switch,
  FormControlLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, Snackbar, Tooltip, IconButton, Divider
} from '@mui/material'
import {
  PersonSearch, WorkOutlined, LocationOnOutlined,
  OpenInNew, PersonAdd, CalendarToday,
  Search as SearchIcon, Wifi
} from '@mui/icons-material'
import apiClient from '@services/apiClient'
import { uid, loadPipeline, savePipeline, DEFAULT_STAGES } from '@utils/pipelineStorage'
import { useAppSelector } from '@hooks/redux'

const ORANGE = '#6366F1'
const NAVY   = '#0B0F1A'

interface SourcingResult {
  jobTitle: string
  employerName: string
  jobCity: string
  jobCountry: string
  jobDescription: string
  jobApplyLink: string
  inferredSkills: string[]
  postedAt: string
  isRemote: boolean
}

interface SourcingResponse {
  apiKeyMissing: boolean
  results: SourcingResult[]
  query?: string
  error?: string
}

interface ImportForm {
  name: string
  email: string
  phone: string
  role: string
  atsScore: number
}

export default function SourcingPage() {
  const jobs = useAppSelector(s => s.jobs.jobs)

  const [jobTitle,  setJobTitle]  = useState('')
  const [keywords,  setKeywords]  = useState('')
  const [location,  setLocation]  = useState('')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [response,  setResponse]  = useState<SourcingResponse | null>(null)

  const [importOpen, setImportOpen]       = useState(false)
  const [selectedJob, setSelectedJob]     = useState<SourcingResult | null>(null)
  const [importForm, setImportForm]       = useState<ImportForm>({ name: '', email: '', phone: '', role: '', atsScore: 65 })
  const [targetJobId, setTargetJobId]     = useState('')
  const [toast, setToast]                 = useState<string | null>(null)

  const handleSearch = async () => {
    if (!jobTitle.trim()) return
    setLoading(true)
    setResponse(null)
    try {
      const res = await apiClient.post('/sourcing/search', {
        jobTitle: jobTitle.trim(),
        keywords: keywords.trim(),
        location: location.trim(),
        remoteOnly: String(remoteOnly),
      })
      setResponse(res.data)
    } catch {
      setResponse({ apiKeyMissing: false, results: [], error: 'Search failed. Check your connection.' })
    } finally {
      setLoading(false)
    }
  }

  const openImport = (job: SourcingResult) => {
    setSelectedJob(job)
    setImportForm({ name: '', email: '', phone: '', role: job.jobTitle, atsScore: 65 })
    setTargetJobId(jobs[0]?.id || '')
    setImportOpen(true)
  }

  const handleImport = () => {
    if (!targetJobId || !importForm.name || !importForm.email) return
    const targetJob = jobs.find(j => j.id === targetJobId)
    const pipeline = loadPipeline(targetJobId)
    const stages = pipeline.stages.length > 0 ? pipeline.stages : DEFAULT_STAGES

    const candidateId = `sourced_${uid()}`
    pipeline.candidates.push({
      id: candidateId,
      name: importForm.name,
      role: importForm.role,
      email: importForm.email,
      phone: importForm.phone,
      atsScore: importForm.atsScore,
      experience: 0,
      education: '',
      matchedSkills: selectedJob?.inferredSkills.slice(0, 5) || [],
      addedAt: new Date().toISOString(),
      source: 'manual',
    })
    pipeline.stageMap[candidateId] = stages[0]?.id || 'shortlisted'
    savePipeline(targetJobId, pipeline)

    setToast(`${importForm.name} added to pipeline for "${targetJob?.title}"`)
    setImportOpen(false)
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: ORANGE + '15' }}>
          <PersonSearch sx={{ color: ORANGE, fontSize: 28 }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color={NAVY}>Source Candidates</Typography>
          <Typography variant="body2" color="text.secondary">
            Search job boards for relevant positions and import candidates into your pipeline
          </Typography>
        </Box>
      </Box>

      {/* Search Bar */}
      <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E2E8F0', borderRadius: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth size="small"
              label="Job Title / Role"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. React Developer"
              InputProps={{ startAdornment: <WorkOutlined sx={{ mr: 1, color: '#94A3B8', fontSize: 18 }} /> }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth size="small"
              label="Keywords"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="e.g. Spring Boot, AWS"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth size="small"
              label="Location (optional)"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. New York"
              InputProps={{ startAdornment: <LocationOnOutlined sx={{ mr: 1, color: '#94A3B8', fontSize: 18 }} /> }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={remoteOnly}
                  onChange={e => setRemoteOnly(e.target.checked)}
                  size="small"
                  sx={{ '& .Mui-checked': { color: ORANGE }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: ORANGE } }}
                />
              }
              label={<Typography variant="body2">Remote only</Typography>}
              sx={{ ml: 0 }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={loading || !jobTitle.trim()}
              startIcon={<SearchIcon />}
              sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#c43d1f' }, px: 3 }}
            >
              {loading ? 'Searching…' : 'Search Job Boards'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* API Key missing banner */}
      {response?.apiKeyMissing && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>RAPIDAPI_KEY not configured.</strong> Add your RapidAPI key to <code>.env.docker</code> and rebuild the backend to enable live job board search.
          Get a free key at{' '}
          <a href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch" target="_blank" rel="noreferrer" style={{ color: ORANGE }}>
            rapidapi.com/jsearch
          </a>.
        </Alert>
      )}

      {response?.error && !response.apiKeyMissing && (
        <Alert severity="error" sx={{ mb: 3 }}>{response.error}</Alert>
      )}

      {/* Skeleton loading */}
      {loading && (
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Results */}
      {!loading && response && response.results.length > 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Found <strong>{response.results.length}</strong> results for "{response.query}"
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {response.results.map((job, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700} color={NAVY} sx={{ lineHeight: 1.3 }}>
                        {job.jobTitle}
                      </Typography>
                      {job.isRemote && (
                        <Chip label="Remote" size="small" icon={<Wifi />}
                          sx={{ bgcolor: '#DCFCE7', color: '#16A34A', height: 22, fontSize: 11 }} />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" fontWeight={600} mb={0.5}>
                      {job.employerName}
                    </Typography>
                    {(job.jobCity || job.jobCountry) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <LocationOnOutlined sx={{ fontSize: 14, color: '#94A3B8' }} />
                        <Typography variant="caption" color="text.secondary">
                          {[job.jobCity, job.jobCountry].filter(Boolean).join(', ')}
                        </Typography>
                      </Box>
                    )}
                    {job.postedAt && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                        <CalendarToday sx={{ fontSize: 12, color: '#94A3B8' }} />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(job.postedAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    )}
                    {job.inferredSkills.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {job.inferredSkills.slice(0, 6).map(skill => (
                          <Chip key={skill} label={skill} size="small"
                            sx={{ height: 20, fontSize: 11, bgcolor: '#F1F5F9', color: '#475569' }} />
                        ))}
                        {job.inferredSkills.length > 6 && (
                          <Chip label={`+${job.inferredSkills.length - 6}`} size="small"
                            sx={{ height: 20, fontSize: 11, bgcolor: '#F1F5F9', color: '#94A3B8' }} />
                        )}
                      </Box>
                    )}
                  </CardContent>

                  <Divider />
                  <CardActions sx={{ px: 2, py: 1, gap: 1 }}>
                    {job.jobApplyLink && (
                      <Tooltip title="View job posting">
                        <IconButton size="small" component="a" href={job.jobApplyLink} target="_blank" rel="noreferrer">
                          <OpenInNew fontSize="small" sx={{ color: '#64748B' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PersonAdd />}
                      onClick={() => openImport(job)}
                      sx={{
                        borderColor: ORANGE, color: ORANGE, fontSize: 12,
                        '&:hover': { borderColor: ORANGE, bgcolor: ORANGE + '10' },
                        ml: 'auto'
                      }}
                    >
                      Add as Candidate
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {!loading && response && response.results.length === 0 && !response.apiKeyMissing && !response.error && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <PersonSearch sx={{ fontSize: 64, color: '#CBD5E1', mb: 2 }} />
          <Typography color="text.secondary">No results found. Try different keywords or broaden your search.</Typography>
        </Box>
      )}

      {/* Import Dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: NAVY }}>Add Candidate to Pipeline</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {selectedJob && (
              <Alert severity="info" sx={{ mb: 1 }}>
                Sourced from: <strong>{selectedJob.jobTitle}</strong> at {selectedJob.employerName}
              </Alert>
            )}
            <TextField
              label="Candidate Name *"
              value={importForm.name}
              onChange={e => setImportForm(p => ({ ...p, name: e.target.value }))}
              size="small" fullWidth
            />
            <TextField
              label="Email *"
              type="email"
              value={importForm.email}
              onChange={e => setImportForm(p => ({ ...p, email: e.target.value }))}
              size="small" fullWidth
            />
            <TextField
              label="Phone"
              value={importForm.phone}
              onChange={e => setImportForm(p => ({ ...p, phone: e.target.value }))}
              size="small" fullWidth
            />
            <TextField
              label="Role / Title"
              value={importForm.role}
              onChange={e => setImportForm(p => ({ ...p, role: e.target.value }))}
              size="small" fullWidth
            />
            <TextField
              select
              label="Add to Job Pipeline *"
              value={targetJobId}
              onChange={e => setTargetJobId(e.target.value)}
              size="small" fullWidth
              SelectProps={{ native: true }}
            >
              <option value="">Select a job…</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setImportOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            disabled={!importForm.name || !importForm.email || !targetJobId}
            onClick={handleImport}
            sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#c43d1f' } }}
          >
            Add to Pipeline
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="success" onClose={() => setToast(null)}>{toast}</Alert>
      </Snackbar>
    </Box>
  )
}
