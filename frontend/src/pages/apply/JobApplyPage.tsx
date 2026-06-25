import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box, Typography, Button, TextField, Chip, LinearProgress,
  CircularProgress, Alert, Divider,
} from '@mui/material'
import {
  WorkOutlined, LocationOnOutlined, ScheduleOutlined,
  CloudUpload, CheckCircle, ErrorOutline, AttachFile,
  PersonOutlined, EmailOutlined, PhoneOutlined, MyLocation,
} from '@mui/icons-material'

const NAVY    = '#0B0F1A'
const NAVY_MID= '#111827'
const NAVY_LT = '#1A2535'
const NAVY_BD = '#1E2D40'
const ORANGE  = '#6366F1'
const TEXT_PRI= '#E2E8F0'
const TEXT_SEC= '#94A3B8'
const TEXT_MUT= '#475569'

// ── Styled dark-mode input ─────────────────────────────────────────────────────
const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: NAVY,
    borderRadius: 1.5,
    fontSize: '0.875rem',
    color: TEXT_PRI,
    '& fieldset': { borderColor: NAVY_BD },
    '&:hover fieldset': { borderColor: ORANGE + '80' },
    '&.Mui-focused fieldset': { borderColor: ORANGE },
  },
  '& .MuiInputLabel-root': {
    color: TEXT_MUT,
    fontSize: '0.875rem',
    '&.Mui-focused': { color: ORANGE },
  },
  '& .MuiInputAdornment-root svg': { color: TEXT_MUT, fontSize: '1.1rem' },
}

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

  const [job,      setJob]      = useState<JobInfo | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [location, setLocation] = useState('')
  const [file,     setFile]     = useState<File | null>(null)
  const [drag,     setDrag]     = useState(false)

  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [result,      setResult]      = useState<{ atsScore: number; rating: string } | null>(null)
  const [errMsg,      setErrMsg]      = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

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
      'application/msword'].includes(f.type) || /\.(pdf|docx|doc)$/i.test(f.name)
    if (!ok) { setErrMsg('Please upload a PDF or Word document (.pdf / .docx / .doc)'); return }
    if (f.size > 10 * 1024 * 1024) { setErrMsg('File size must be under 10 MB'); return }
    setFile(f); setErrMsg('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !file || !jobId) return
    setSubmitState('submitting')
    try {
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('email', email.trim())
      if (phone.trim())    fd.append('phone', phone.trim())
      if (location.trim()) fd.append('location', location.trim())
      fd.append('resume', file)

      const res  = await fetch(`/api/public/jobs/${jobId}/apply`, { method: 'POST', body: fd })
      const data = await res.json()

      if (data.success) {
        setResult({ atsScore: data.atsScore, rating: data.rating })
        setSubmitState('success')
      } else {
        setErrMsg(data.message ?? 'Submission failed. Please try again.')
        setSubmitState('error')
      }
    } catch {
      setErrMsg('Network error. Please check your connection and try again.')
      setSubmitState('error')
    }
  }

  const scoreColor = (s: number) => s >= 80 ? '#22C55E' : s >= 60 ? '#F59E0B' : '#EF4444'
  const canSubmit  = name.trim() && email.trim() && file && submitState !== 'submitting'

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <Box minHeight="100vh" bgcolor={NAVY} display="flex" alignItems="center" justifyContent="center">
      <CircularProgress sx={{ color: ORANGE }} />
    </Box>
  )

  if (notFound) return (
    <Box minHeight="100vh" bgcolor={NAVY} display="flex" alignItems="center" justifyContent="center" flexDirection="column" gap={2}>
      <ErrorOutline sx={{ fontSize: 72, color: '#1E2D40' }} />
      <Typography sx={{ color: TEXT_SEC, fontSize: 16 }}>Job not found or no longer available</Typography>
    </Box>
  )

  // ── Success screen ─────────────────────────────────────────────────────────────
  if (submitState === 'success' && result) return (
    <Box minHeight="100vh" bgcolor={NAVY}
      sx={{ background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${ORANGE}18 0%, ${NAVY} 70%)` }}
      display="flex" alignItems="center" justifyContent="center" p={2}>
      <Box sx={{
        bgcolor: NAVY_MID, border: `1px solid ${NAVY_BD}`, borderRadius: 3,
        maxWidth: 460, width: '100%', textAlign: 'center', p: 4,
        boxShadow: `0 24px 64px ${ORANGE}10`,
      }}>
        <Box sx={{
          width: 72, height: 72, borderRadius: '50%', bgcolor: '#22C55E15',
          border: '2px solid #22C55E40', display: 'flex', alignItems: 'center',
          justifyContent: 'center', mx: 'auto', mb: 2.5,
        }}>
          <CheckCircle sx={{ fontSize: 38, color: '#22C55E' }} />
        </Box>

        <Typography sx={{ fontWeight: 800, color: TEXT_PRI, fontSize: 22, mb: 1 }}>
          Application Submitted!
        </Typography>
        <Typography sx={{ color: TEXT_SEC, fontSize: 13, mb: 3.5, lineHeight: 1.65 }}>
          Your resume has been received and evaluated for{' '}
          <Box component="span" sx={{ color: TEXT_PRI, fontWeight: 600 }}>{job?.title}</Box>.
        </Typography>

        <Box sx={{
          bgcolor: NAVY, borderRadius: 2, p: 3, mb: 3,
          border: `1px solid ${NAVY_BD}`,
        }}>
          <Typography sx={{ color: TEXT_MUT, fontSize: 10, textTransform: 'uppercase',
            letterSpacing: '0.1em', fontWeight: 700, mb: 1 }}>
            ATS Match Score
          </Typography>
          <Typography sx={{ fontWeight: 900, color: scoreColor(result.atsScore), fontSize: 52, lineHeight: 1, mb: 1 }}>
            {result.atsScore}%
          </Typography>
          <LinearProgress variant="determinate" value={result.atsScore}
            sx={{ height: 6, borderRadius: 3, bgcolor: NAVY_BD,
              '& .MuiLinearProgress-bar': { bgcolor: scoreColor(result.atsScore), borderRadius: 3 } }} />
          <Chip label={result.rating} size="small" sx={{
            mt: 2, fontWeight: 700, fontSize: 11,
            bgcolor: `${scoreColor(result.atsScore)}18`, color: scoreColor(result.atsScore),
            border: `1px solid ${scoreColor(result.atsScore)}40`,
          }} />
        </Box>

        <Typography sx={{ color: TEXT_MUT, fontSize: 12 }}>
          The HR team will review your profile and reach out if shortlisted.
        </Typography>
      </Box>
    </Box>
  )

  // ── Apply form ────────────────────────────────────────────────────────────────
  return (
    <Box minHeight="100vh" bgcolor={NAVY}
      sx={{ background: `radial-gradient(ellipse 80% 50% at 50% -5%, ${ORANGE}15 0%, ${NAVY} 65%)` }}
      py={5} px={2}>

      {/* ── Brand header ──────────────────────────────────────────────────────── */}
      <Box textAlign="center" mb={5}>
        <Typography sx={{
          fontWeight: 900, fontSize: 28, fontFamily: '"Poppins", sans-serif',
          color: TEXT_PRI, letterSpacing: '-0.5px', lineHeight: 1,
        }}>
          Hire<Box component="span" sx={{
            background: `linear-gradient(135deg, ${ORANGE}, #818CF8)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>IQ</Box>
        </Typography>
        <Typography sx={{ color: TEXT_MUT, fontSize: 12, mt: 0.5 }}>Powered by Bourntec Solutions</Typography>
      </Box>

      <Box maxWidth={660} mx="auto">

        {/* ── Job info card ─────────────────────────────────────────────────────── */}
        <Box sx={{
          bgcolor: NAVY_MID, border: `1px solid ${NAVY_BD}`, borderRadius: 2.5,
          p: 3, mb: 2.5, position: 'relative', overflow: 'hidden',
        }}>
          {/* Subtle gradient accent bar */}
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${ORANGE}, #818CF8)`,
            borderRadius: '10px 10px 0 0',
          }} />

          <Chip label="Now Hiring" size="small" sx={{
            mb: 1.75, bgcolor: `${ORANGE}18`, color: ORANGE, fontWeight: 700,
            fontSize: 11, border: `1px solid ${ORANGE}35`,
          }} />

          <Typography sx={{ fontWeight: 800, color: TEXT_PRI, fontSize: 22, mb: 1.5, lineHeight: 1.25 }}>
            {job?.title}
          </Typography>

          <Box display="flex" gap={2.5} flexWrap="wrap" mb={2}>
            {job?.location && (
              <Box display="flex" alignItems="center" gap={0.75}>
                <LocationOnOutlined sx={{ fontSize: 15, color: TEXT_MUT }} />
                <Typography sx={{ color: TEXT_SEC, fontSize: 13 }}>{job.location}</Typography>
              </Box>
            )}
            {job?.workMode && (
              <Box display="flex" alignItems="center" gap={0.75}>
                <WorkOutlined sx={{ fontSize: 15, color: TEXT_MUT }} />
                <Typography sx={{ color: TEXT_SEC, fontSize: 13 }}>
                  {job.workMode.replace(/_/g, ' ')}
                </Typography>
              </Box>
            )}
            {(job?.minExperience != null || job?.maxExperience != null) && (
              <Box display="flex" alignItems="center" gap={0.75}>
                <ScheduleOutlined sx={{ fontSize: 15, color: TEXT_MUT }} />
                <Typography sx={{ color: TEXT_SEC, fontSize: 13 }}>
                  {job?.minExperience ?? 0}–{job?.maxExperience ?? '?'} yrs experience
                </Typography>
              </Box>
            )}
          </Box>

          {job?.requiredSkills && job.requiredSkills.length > 0 && (
            <Box display="flex" gap={0.75} flexWrap="wrap" mb={2}>
              {job.requiredSkills.slice(0, 12).map(s => (
                <Chip key={s} label={s} size="small" sx={{
                  height: 22, fontSize: 11, bgcolor: NAVY_LT,
                  color: TEXT_SEC, border: `1px solid ${NAVY_BD}`,
                }} />
              ))}
            </Box>
          )}

          {job?.description && (
            <>
              <Divider sx={{ borderColor: NAVY_BD, mb: 2 }} />
              <Typography sx={{
                color: TEXT_MUT, fontSize: 13, lineHeight: 1.7,
                display: '-webkit-box', WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {job.description}
              </Typography>
            </>
          )}
        </Box>

        {/* ── Application form card ──────────────────────────────────────────────── */}
        <Box sx={{
          bgcolor: NAVY_MID, border: `1px solid ${NAVY_BD}`, borderRadius: 2.5, p: 3,
          boxShadow: `0 16px 48px ${NAVY}80`,
        }}>
          <Typography sx={{ fontWeight: 700, color: TEXT_PRI, fontSize: 16, mb: 0.5 }}>
            Apply for this position
          </Typography>
          <Typography sx={{ color: TEXT_MUT, fontSize: 12, mb: 3 }}>
            Fill in your details and upload your resume to apply instantly.
          </Typography>

          {(submitState === 'error' || errMsg) && (
            <Alert severity="error" sx={{
              mb: 2.5, bgcolor: 'rgba(239,68,68,0.08)', color: '#FCA5A5', fontSize: 13,
              border: '1px solid rgba(239,68,68,0.2)',
              '& .MuiAlert-icon': { color: '#EF4444' },
            }}>
              {errMsg}
            </Alert>
          )}

          <Box display="flex" flexDirection="column" gap={2}>

            {/* Row 1: Name + Email */}
            <Box display="flex" gap={2} sx={{ flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField label="Full Name" required size="small" fullWidth value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                InputProps={{ startAdornment: <PersonOutlined sx={{ mr: 0.75 }} /> }}
                sx={fieldSx} />
              <TextField label="Email Address" required type="email" size="small" fullWidth value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. rahul@gmail.com"
                InputProps={{ startAdornment: <EmailOutlined sx={{ mr: 0.75 }} /> }}
                sx={fieldSx} />
            </Box>

            {/* Row 2: Phone + Location */}
            <Box display="flex" gap={2} sx={{ flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField label="Phone Number" size="small" fullWidth value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                InputProps={{ startAdornment: <PhoneOutlined sx={{ mr: 0.75 }} /> }}
                sx={fieldSx} />
              <TextField label="Current Location" size="small" fullWidth value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Bangalore, Karnataka"
                InputProps={{ startAdornment: <MyLocation sx={{ mr: 0.75 }} /> }}
                sx={fieldSx} />
            </Box>

            {/* Resume drop zone */}
            <Box
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              sx={{
                border: `2px dashed ${drag ? ORANGE : file ? '#22C55E55' : NAVY_BD}`,
                borderRadius: 2, p: 3.5, textAlign: 'center', cursor: 'pointer',
                bgcolor: drag ? `${ORANGE}08` : file ? '#22C55E06' : NAVY,
                transition: 'all 0.2s',
                '&:hover': { borderColor: ORANGE + '80', bgcolor: `${ORANGE}06` },
              }}>
              <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {file ? (
                <Box display="flex" alignItems="center" justifyContent="center" gap={1.5}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 1.5, bgcolor: '#22C55E18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <AttachFile sx={{ color: '#22C55E', fontSize: 18 }} />
                  </Box>
                  <Box textAlign="left">
                    <Typography sx={{ color: '#22C55E', fontWeight: 600, fontSize: 13 }}>
                      {file.name}
                    </Typography>
                    <Typography sx={{ color: TEXT_MUT, fontSize: 11 }}>
                      {(file.size / 1024).toFixed(0)} KB · Click to replace
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <>
                  <Box sx={{
                    width: 44, height: 44, borderRadius: 2, bgcolor: NAVY_LT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5,
                  }}>
                    <CloudUpload sx={{ fontSize: 22, color: TEXT_MUT }} />
                  </Box>
                  <Typography sx={{ color: TEXT_SEC, fontWeight: 600, fontSize: 14, mb: 0.5 }}>
                    Drop your resume here, or{' '}
                    <Box component="span" sx={{ color: ORANGE }}>browse</Box>
                  </Typography>
                  <Typography sx={{ color: TEXT_MUT, fontSize: 12 }}>
                    PDF, DOC, or DOCX · Max 10 MB
                  </Typography>
                </>
              )}
            </Box>

            {/* Submit */}
            <Button variant="contained" size="large" fullWidth
              disabled={!canSubmit}
              onClick={handleSubmit}
              sx={{
                background: canSubmit
                  ? `linear-gradient(135deg, ${ORANGE}, #4338CA)`
                  : NAVY_LT,
                color: canSubmit ? '#fff' : TEXT_MUT,
                fontWeight: 700, fontSize: 15, py: 1.6, borderRadius: 2,
                textTransform: 'none', letterSpacing: 0.2,
                boxShadow: canSubmit ? `0 8px 24px ${ORANGE}40` : 'none',
                '&:hover': { background: `linear-gradient(135deg, #4F52D4, #3730A3)` },
                '&.Mui-disabled': { background: NAVY_LT, color: TEXT_MUT },
                transition: 'all 0.2s',
              }}>
              {submitState === 'submitting'
                ? <><CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.7)', mr: 1.25 }} />Analyzing Resume…</>
                : 'Submit Application'}
            </Button>

            <Typography textAlign="center" sx={{ color: TEXT_MUT, fontSize: 12 }}>
              Your resume will be automatically scored against the job requirements.
            </Typography>
          </Box>
        </Box>

        {/* Footer */}
        <Typography textAlign="center" sx={{ color: NAVY_BD, fontSize: 11, mt: 3 }}>
          © {new Date().getFullYear()} HireIQ · Bourntec Solutions
        </Typography>
      </Box>
    </Box>
  )
}

export default JobApplyPage
