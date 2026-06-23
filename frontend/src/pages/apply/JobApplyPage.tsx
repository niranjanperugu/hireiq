import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, Button, TextField,
  Chip, LinearProgress, CircularProgress, Alert
} from '@mui/material'
import {
  Work, LocationOn, Schedule, CloudUpload, CheckCircle,
  ErrorOutline, AttachFile
} from '@mui/icons-material'

const NAVY    = '#0B0F1A'
const NAVY_MID= '#111827'
const NAVY_LT = '#1E2D40'
const ORANGE  = '#6366F1'

interface JobInfo {
  id: string
  title: string
  description: string
  location: string
  workMode: string
  employmentType: string
  minExperience: number | null
  maxExperience: number | null
  requiredSkills: string[]
  status: string
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

const JobApplyPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>()

  const [job,    setJob]    = useState<JobInfo | null>(null)
  const [loading,setLoading]= useState(true)
  const [notFound,setNotFound]=useState(false)

  const [name,   setName]   = useState('')
  const [email,  setEmail]  = useState('')
  const [phone,  setPhone]  = useState('')
  const [file,   setFile]   = useState<File | null>(null)
  const [drag,   setDrag]   = useState(false)

  const [state,  setState]  = useState<SubmitState>('idle')
  const [result, setResult] = useState<{ atsScore: number; rating: string } | null>(null)
  const [errMsg, setErrMsg] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  // Fetch public job info (no auth)
  useEffect(() => {
    if (!jobId) return
    fetch(`/api/public/jobs/${jobId}`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json() })
      .then(data => { setJob(data); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [jobId])

  const handleFile = (f: File) => {
    const ok = ['application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'].includes(f.type) || f.name.match(/\.(pdf|docx|doc)$/i)
    if (!ok) { setErrMsg('Please upload a PDF or Word document (.pdf / .docx / .doc)'); return }
    setFile(f)
    setErrMsg('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !file || !jobId) return
    setState('submitting')
    try {
      const fd = new FormData()
      fd.append('name',   name.trim())
      fd.append('email',  email.trim())
      if (phone.trim()) fd.append('phone', phone.trim())
      fd.append('resume', file)

      const res = await fetch(`/api/public/jobs/${jobId}/apply`, { method: 'POST', body: fd })
      const data = await res.json()

      if (data.success) {
        setResult({ atsScore: data.atsScore, rating: data.rating })
        setState('success')
      } else {
        setErrMsg(data.message ?? 'Submission failed. Please try again.')
        setState('error')
      }
    } catch {
      setErrMsg('Network error. Please check your connection and try again.')
      setState('error')
    }
  }

  const scoreColor = (s: number) => s >= 80 ? '#22C55E' : s >= 60 ? '#F59E0B' : '#EF4444'

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <Box minHeight="100vh" bgcolor={NAVY} display="flex" alignItems="center" justifyContent="center">
      <CircularProgress sx={{ color: ORANGE }} />
    </Box>
  )

  if (notFound) return (
    <Box minHeight="100vh" bgcolor={NAVY} display="flex" alignItems="center" justifyContent="center">
      <Box textAlign="center">
        <ErrorOutline sx={{ fontSize: 64, color: '#334155', mb: 2 }} />
        <Typography variant="h6" sx={{ color: '#64748B' }}>Job not found or no longer available</Typography>
      </Box>
    </Box>
  )

  // ── Success screen ────────────────────────────────────────────────────────────
  if (state === 'success' && result) return (
    <Box minHeight="100vh" bgcolor={NAVY} display="flex" alignItems="center" justifyContent="center" p={2}>
      <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 3, maxWidth: 480, width: '100%', textAlign: 'center', p: 2 }}>
        <CardContent>
          <CheckCircle sx={{ fontSize: 64, color: '#22C55E', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#E2E8F0', mb: 1 }}>
            Application Submitted!
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>
            Your resume has been received and evaluated for <strong style={{ color: '#E2E8F0' }}>{job?.title}</strong>.
          </Typography>

          {/* ATS Score */}
          <Box sx={{ bgcolor: NAVY, borderRadius: 2, p: 2.5, mb: 2, border: `1px solid ${NAVY_LT}` }}>
            <Typography variant="caption" sx={{ color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Your ATS Match Score
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 800, color: scoreColor(result.atsScore), my: 0.5 }}>
              {result.atsScore}%
            </Typography>
            <LinearProgress variant="determinate" value={result.atsScore}
              sx={{ height: 8, borderRadius: 4, bgcolor: NAVY_LT,
                '& .MuiLinearProgress-bar': { bgcolor: scoreColor(result.atsScore), borderRadius: 4 } }} />
            <Chip label={result.rating} size="small" sx={{
              mt: 1.5, fontWeight: 700, bgcolor: `${scoreColor(result.atsScore)}22`, color: scoreColor(result.atsScore)
            }} />
          </Box>

          <Typography variant="caption" sx={{ color: '#475569' }}>
            The HR team will review your profile and get back to you if shortlisted.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )

  // ── Apply form ────────────────────────────────────────────────────────────────
  return (
    <Box minHeight="100vh" bgcolor={NAVY} py={4} px={2}>
      {/* Brand header */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#E2E8F0', fontFamily: '"Poppins", sans-serif' }}>
          Hire<Box component="span" sx={{ color: ORANGE }}>IQ</Box>
        </Typography>
        <Typography variant="caption" sx={{ color: '#475569' }}>Powered by Bourntec Solutions</Typography>
      </Box>

      <Box maxWidth={680} mx="auto">
        {/* Job info card */}
        <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2, mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Chip label="Now Hiring" size="small" sx={{ mb: 1.5, bgcolor: `${ORANGE}22`, color: ORANGE, fontWeight: 700 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#E2E8F0', mb: 1 }}>{job?.title}</Typography>
            <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
              {job?.location && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <LocationOn sx={{ fontSize: '0.85rem', color: '#475569' }} />
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>{job.location}</Typography>
                </Box>
              )}
              {job?.workMode && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Work sx={{ fontSize: '0.85rem', color: '#475569' }} />
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>{job.workMode.replace('_', ' ')}</Typography>
                </Box>
              )}
              {(job?.minExperience != null || job?.maxExperience != null) && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Schedule sx={{ fontSize: '0.85rem', color: '#475569' }} />
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    {job?.minExperience ?? 0}–{job?.maxExperience ?? '?'} yrs exp
                  </Typography>
                </Box>
              )}
            </Box>
            {job?.requiredSkills && job.requiredSkills.length > 0 && (
              <Box display="flex" gap={0.75} flexWrap="wrap">
                {job.requiredSkills.slice(0, 10).map(s => (
                  <Chip key={s} label={s} size="small"
                    sx={{ height: 20, fontSize: '0.65rem', bgcolor: NAVY_LT, color: '#94A3B8' }} />
                ))}
              </Box>
            )}
            {job?.description && (
              <Typography variant="body2" sx={{
                mt: 2, color: '#64748B', fontSize: '0.8rem', lineHeight: 1.65,
                display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden'
              }}>
                {job.description}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Application form */}
        <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#E2E8F0', mb: 2.5 }}>
              Apply for this position
            </Typography>

            {(state === 'error' || errMsg) && (
              <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239,68,68,0.1)', color: '#FCA5A5',
                '& .MuiAlert-icon': { color: '#EF4444' } }}>
                {errMsg}
              </Alert>
            )}

            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" gap={2}>
                <TextField label="Full Name" required size="small" fullWidth value={name}
                  onChange={e => setName(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT },
                    '& .MuiInputLabel-root': { fontSize: '0.85rem' } }} />
                <TextField label="Email" required type="email" size="small" fullWidth value={email}
                  onChange={e => setEmail(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT },
                    '& .MuiInputLabel-root': { fontSize: '0.85rem' } }} />
              </Box>
              <TextField label="Phone (optional)" size="small" value={phone}
                onChange={e => setPhone(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT },
                  '& .MuiInputLabel-root': { fontSize: '0.85rem' } }} />

              {/* Resume drop zone */}
              <Box
                onDragOver={e => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                sx={{
                  border: `2px dashed ${drag ? ORANGE : file ? '#22C55E' : NAVY_LT}`,
                  borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer',
                  bgcolor: drag ? `${ORANGE}08` : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: ORANGE, bgcolor: `${ORANGE}05` }
                }}>
                <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                {file ? (
                  <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                    <AttachFile sx={{ color: '#22C55E', fontSize: '1.25rem' }} />
                    <Box textAlign="left">
                      <Typography variant="body2" sx={{ color: '#22C55E', fontWeight: 600, fontSize: '0.85rem' }}>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#475569' }}>
                        {(file.size / 1024).toFixed(0)} KB · Click to change
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <>
                    <CloudUpload sx={{ fontSize: '2rem', color: '#334155', mb: 1 }} />
                    <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                      Drop your resume here, or click to browse
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475569' }}>
                      PDF, DOC, or DOCX · max 10 MB
                    </Typography>
                  </>
                )}
              </Box>

              <Button variant="contained" size="large" fullWidth
                disabled={!name.trim() || !email.trim() || !file || state === 'submitting'}
                onClick={handleSubmit}
                sx={{
                  bgcolor: ORANGE, '&:hover': { bgcolor: '#4338CA' },
                  fontWeight: 800, fontSize: '1rem', py: 1.5, borderRadius: 2,
                  '&.Mui-disabled': { bgcolor: NAVY_LT, color: '#334155' }
                }}>
                {state === 'submitting'
                  ? <><CircularProgress size={18} sx={{ color: 'white', mr: 1 }} /> Analyzing Resume…</>
                  : 'Submit Application'}
              </Button>

              <Typography variant="caption" textAlign="center" sx={{ color: '#334155' }}>
                Your resume will be automatically evaluated against the job requirements.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export default JobApplyPage
