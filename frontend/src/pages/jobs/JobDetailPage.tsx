import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@hooks/redux'
import { getJobById } from '@store/jobsSlice'
import {
  Box, Typography, Card, CardContent, Grid, Button, CircularProgress, Chip,
  Tabs, Tab, Avatar, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogContent, DialogTitle, IconButton, TextField, InputAdornment,
  LinearProgress, Divider, Tooltip, Alert, Badge
} from '@mui/material'
import {
  ArrowBack, AccountTree as PipelineIcon, Close, Search,
  CheckCircle, Cancel, Work, School, Schedule,
  PersonAddAlt1, VerifiedUser, Psychology, AssignmentTurnedIn,
  ContentCopy, Launch, TrendingUp, SmartToy as SmartToyIcon
} from '@mui/icons-material'
import apiClient from '@services/apiClient'
import { createInterviewLink } from '@services/interviewApi'
import {
  loadPipeline, savePipeline, PipelineCandidate,
  loadEvaluations, Evaluation
} from '@utils/pipelineStorage'

const NAVY    = '#F8FAFC'
const NAVY_MID= '#FFFFFF'
const NAVY_LT = '#E2E8F0'
const ORANGE  = '#6366F1'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppliedCandidate {
  id: string
  candidateName: string
  currentRole: string | null
  email: string
  phone: string
  atsScore: number
  rating: string
  matchedSkills: string[]
  missingSkills: string[]
  yearsOfExperience: number
  education: string
  professionalSummary: string
  resumeFileName: string
  analyzedAt: string
}

interface Req {
  id?: string
  requirementType: string
  requirementValue: string
  isMandatory: boolean
  priorityLevel: number
}

interface PipelineStatus {
  inPipeline: boolean
  stageLabel: string
  stageColor: string
  stageType: string
  candidate?: PipelineCandidate
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const scoreColor  = (s: number) => s >= 80 ? '#22C55E' : s >= 60 ? '#F59E0B' : '#EF4444'
const scoreBg     = (s: number) => s >= 80 ? '#22C55E18' : s >= 60 ? '#F59E0B18' : '#EF444418'
const scoreLabel  = (s: number) => s >= 80 ? 'EXCELLENT' : s >= 60 ? 'GOOD' : 'FAIR'

const STAGE_COLORS: Record<string, string> = {
  shortlist: '#38BDF8', round: '#A78BFA', offer: '#22C55E', hired: '#0F766E', rejected: '#EF4444'
}

function getPipelineStatus(jobId: string, candidateId: string, email: string): PipelineStatus {
  const pl = loadPipeline(jobId)
  const matchById    = pl.candidates.find(c => c.id === `applied_${candidateId}`)
  const matchByEmail = pl.candidates.find(c => c.email?.toLowerCase() === email?.toLowerCase())
  const cand         = matchById ?? matchByEmail
  if (!cand) return { inPipeline: false, stageLabel: 'Not in Pipeline', stageColor: '#475569', stageType: '' }

  const stageId = pl.stageMap[cand.id]
  const stage   = pl.stages.find(s => s.id === stageId)
  return {
    inPipeline: true,
    stageLabel: stage?.label ?? 'Shortlisted',
    stageColor: STAGE_COLORS[stage?.type ?? 'shortlist'] ?? '#38BDF8',
    stageType:  stage?.type ?? 'shortlist',
    candidate:  cand,
  }
}

// ── Score ring ────────────────────────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 80 }) => {
  const r     = (size - 10) / 2
  const circ  = 2 * Math.PI * r
  const dash  = (score / 100) * circ
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={NAVY_LT} strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={scoreColor(score)} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Typography sx={{ fontWeight: 800, fontSize: size < 70 ? '0.85rem' : '1.1rem', color: scoreColor(score), lineHeight: 1 }}>{score}%</Typography>
        {size >= 70 && <Typography sx={{ fontSize: '0.5rem', color: '#475569', mt: 0.25 }}>ATS</Typography>}
      </Box>
    </Box>
  )
}

// ── Candidate Detail Dialog ────────────────────────────────────────────────────

const CandidateDialog: React.FC<{
  open: boolean
  onClose: () => void
  candidate: AppliedCandidate | null
  jobId: string
  jobTitle: string
  jobDescription: string
  jobSkills: string[]
  onAddedToPipeline: () => void
}> = ({ open, onClose, candidate, jobId, jobTitle, jobDescription, jobSkills, onAddedToPipeline }) => {
  const [added,    setAdded]    = useState(false)
  const [toast,    setToast]    = useState('')
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null)
  const [evals,    setEvals]    = useState<Evaluation[]>([])
  const [dialogTab, setDialogTab] = useState(0)

  // Assessment state
  const [assessmentDialog,   setAssessmentDialog]   = useState(false)
  const [creatingAssessment, setCreatingAssessment] = useState(false)
  const [assessmentLink,     setAssessmentLink]     = useState('')
  const [emailSubject,       setEmailSubject]       = useState('')
  const [emailBody,          setEmailBody]          = useState('')
  const [assessmentLinkCopied, setAssessmentLinkCopied] = useState(false)
  const [emailCopied,          setEmailCopied]          = useState(false)
  const [pastAssessments,    setPastAssessments]    = useState<any[]>([])

  useEffect(() => {
    if (!candidate) return
    setAdded(false)
    setDialogTab(0)
    const ps = getPipelineStatus(jobId, candidate.id, candidate.email)
    setPipeline(ps)
    const allEvals = loadEvaluations()
    setEvals(allEvals.filter(e =>
      e.jobId === jobId &&
      (e.candidateId === `applied_${candidate.id}` || e.candidateId === candidate.email)
    ))
    // Fetch past assessments for this candidate
    import('@services/assessmentApi').then(({ getAssessments }) => {
      getAssessments(jobId, candidate.id)
        .then(r => setPastAssessments(r.data ?? []))
        .catch(() => setPastAssessments([]))
    })
  }, [candidate, jobId, open])

  const handleCreateAssessment = async () => {
    if (!candidate) return
    setCreatingAssessment(true)
    setAssessmentDialog(true)
    try {
      const { createAssessment } = await import('@services/assessmentApi')
      const { data } = await createAssessment({
        jobId, jobTitle, jobDescription, skills: jobSkills,
        candidateId:    candidate.id,
        candidateName:  candidate.candidateName,
        candidateEmail: candidate.email,
        candidatePhone: candidate.phone ?? '',
        candidateRole:  candidate.currentRole ?? '',
      })
      const fullLink = `${window.location.origin}${data.assessmentPath}`
      setAssessmentLink(fullLink)
      setEmailSubject(data.emailSubject)
      setEmailBody((data.emailBody as string).replace('{ASSESSMENT_URL}', fullLink))
    } catch {
      setAssessmentLink('')
    } finally {
      setCreatingAssessment(false)
    }
  }

  const copyAssessmentLink = () => {
    navigator.clipboard.writeText(assessmentLink)
    setAssessmentLinkCopied(true); setTimeout(() => setAssessmentLinkCopied(false), 2500)
  }
  const copyEmail = () => {
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`)
    setEmailCopied(true); setTimeout(() => setEmailCopied(false), 2500)
  }
  const openMailto = () => {
    window.open(`mailto:${candidate?.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`)
  }

  const handleAdd = () => {
    if (!candidate) return
    const pl    = loadPipeline(jobId)
    const first = pl.stages[0]
    if (!first) { setToast('No pipeline stages'); return }
    if (pl.candidates.find(c => c.email === candidate.email)) {
      setToast('Already in pipeline'); setPipeline(getPipelineStatus(jobId, candidate.id, candidate.email))
      setAdded(true); return
    }
    const newCand: PipelineCandidate = {
      id: `applied_${candidate.id}`,
      name: candidate.candidateName,
      email: candidate.email,
      phone: candidate.phone,
      role: candidate.currentRole ?? '',
      atsScore: candidate.atsScore,
      experience: candidate.yearsOfExperience,
      education: candidate.education ?? '',
      matchedSkills: candidate.matchedSkills ?? [],
      addedAt: new Date().toISOString(),
      source: 'analysis',
    }
    pl.candidates.push(newCand)
    pl.stageMap[newCand.id] = first.id
    savePipeline(jobId, pl)
    setPipeline(getPipelineStatus(jobId, candidate.id, candidate.email))
    setAdded(true)
    setToast(`Added to pipeline → ${first.label}`)
    onAddedToPipeline()
  }

  if (!candidate) return null

  const matched  = candidate.matchedSkills ?? []
  const missing  = candidate.missingSkills ?? []
  const inPip    = pipeline?.inPipeline || added

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 3, backgroundImage: 'none' } }}>

      {/* Header */}
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ bgcolor: NAVY, px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2,
          borderBottom: `1px solid ${NAVY_LT}` }}>
          <Avatar sx={{ width: 52, height: 52, bgcolor: NAVY_LT, fontWeight: 800, fontSize: '1.1rem', color: '#1E293B' }}>
            {candidate.candidateName.split(' ').map(w => w[0]).slice(0, 2).join('')}
          </Avatar>
          <Box flex={1}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B', lineHeight: 1.2 }}>
              {candidate.candidateName}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              {candidate.currentRole || 'Candidate'} · {candidate.email}
            </Typography>
          </Box>
          <ScoreRing score={Math.round(candidate.atsScore)} size={68} />
          <IconButton onClick={onClose} sx={{ color: '#475569', ml: 1 }}><Close /></IconButton>
        </Box>
      </DialogTitle>

      {/* Tabs */}
      <Box sx={{ borderBottom: `1px solid ${NAVY_LT}`, bgcolor: NAVY, px: 3 }}>
        <Tabs value={dialogTab} onChange={(_, v) => setDialogTab(v)}
          sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontSize: '0.75rem', fontWeight: 600, textTransform: 'none', color: '#64748B', px: 2 },
            '& .Mui-selected': { color: ORANGE }, '& .MuiTabs-indicator': { bgcolor: ORANGE } }}>
          <Tab label="Overview" />
          <Tab label="Application Flow" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {toast && (
          <Alert severity="success" onClose={() => setToast('')}
            sx={{ mb: 2, bgcolor: '#052e16', color: '#22C55E', '& .MuiAlert-icon': { color: '#22C55E' } }}>
            {toast}
          </Alert>
        )}

        {/* ── Tab 0: Overview ── */}
        {dialogTab === 0 && (
          <Grid container spacing={2.5}>
            {/* Left: summary + meta */}
            <Grid item xs={12} md={7}>
              {/* Meta row */}
              <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
                {[
                  { icon: <Work sx={{ fontSize: '0.8rem' }} />, label: `${candidate.yearsOfExperience ?? 0} yrs experience` },
                  { icon: <School sx={{ fontSize: '0.8rem' }} />, label: candidate.education || 'Education N/A' },
                  { icon: <Schedule sx={{ fontSize: '0.8rem' }} />, label: new Date(candidate.analyzedAt).toLocaleDateString() },
                ].map(m => (
                  <Box key={m.label} display="flex" alignItems="center" gap={0.5}
                    sx={{ bgcolor: NAVY, borderRadius: 1, px: 1.25, py: 0.5, border: `1px solid ${NAVY_LT}` }}>
                    <Box sx={{ color: '#475569' }}>{m.icon}</Box>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.72rem' }}>{m.label}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Professional summary */}
              {candidate.professionalSummary && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.6rem' }}>
                    Professional Summary
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.78rem', lineHeight: 1.7, mt: 0.75 }}>
                    {candidate.professionalSummary}
                  </Typography>
                </Box>
              )}

              {/* Contact */}
              <Divider sx={{ borderColor: NAVY_LT, my: 2 }} />
              <Typography variant="caption" sx={{ color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.6rem' }}>
                Contact
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.78rem', mt: 0.5 }}>{candidate.email}</Typography>
              {candidate.phone && <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.78rem' }}>{candidate.phone}</Typography>}
            </Grid>

            {/* Right: ATS + skills */}
            <Grid item xs={12} md={5}>
              <Box sx={{ bgcolor: NAVY, borderRadius: 2, p: 2, border: `1px solid ${NAVY_LT}`, mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.6rem' }}>
                  ATS Score Breakdown
                </Typography>
                <Box display="flex" alignItems="center" gap={2} mt={1} mb={1.5}>
                  <ScoreRing score={Math.round(candidate.atsScore)} size={64} />
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: scoreColor(candidate.atsScore) }}>
                      {scoreLabel(candidate.atsScore)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475569' }}>
                      {matched.length}/{matched.length + missing.length} skills matched
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress variant="determinate" value={candidate.atsScore}
                  sx={{ height: 6, borderRadius: 3, bgcolor: NAVY_LT,
                    '& .MuiLinearProgress-bar': { bgcolor: scoreColor(candidate.atsScore), borderRadius: 3 } }} />
              </Box>

              {matched.length > 0 && (
                <Box mb={2}>
                  <Box display="flex" alignItems="center" gap={0.75} mb={0.75}>
                    <CheckCircle sx={{ fontSize: '0.85rem', color: '#22C55E' }} />
                    <Typography variant="caption" sx={{ color: '#22C55E', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Matched Skills ({matched.length})
                    </Typography>
                  </Box>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {matched.map(sk => (
                      <Chip key={sk} label={sk} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#22C55E18', color: '#22C55E', border: '1px solid #22C55E33' }} />
                    ))}
                  </Box>
                </Box>
              )}

              {missing.length > 0 && (
                <Box>
                  <Box display="flex" alignItems="center" gap={0.75} mb={0.75}>
                    <Cancel sx={{ fontSize: '0.85rem', color: '#EF4444' }} />
                    <Typography variant="caption" sx={{ color: '#EF4444', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Missing Skills ({missing.length})
                    </Typography>
                  </Box>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {missing.map(sk => (
                      <Chip key={sk} label={sk} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#EF444418', color: '#EF4444', border: '1px solid #EF444433' }} />
                    ))}
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        )}

        {/* ── Tab 1: Application Flow ── */}
        {dialogTab === 1 && (
          <Box>
            {/* Pipeline status strip */}
            <Box sx={{ bgcolor: NAVY, borderRadius: 2, p: 1.75, mb: 2.5, border: `1px solid ${NAVY_LT}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: inPip ? (pipeline?.stageColor ?? '#22C55E') : '#334155', flexShrink: 0 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: inPip ? (pipeline?.stageColor ?? '#22C55E') : '#475569' }}>
                {inPip ? (pipeline?.stageLabel ?? 'In Pipeline') : 'Not yet in pipeline'}
              </Typography>
              {inPip && <Chip label="IN PIPELINE" size="small" sx={{ height: 18, fontSize: '0.58rem', fontWeight: 700, bgcolor: '#22C55E18', color: '#22C55E', ml: 'auto' }} />}
            </Box>

            {/* ── Action buttons row ── */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
              {!inPip && (
                <Button variant="contained" size="small"
                  startIcon={<PersonAddAlt1 sx={{ fontSize: '0.8rem !important' }} />}
                  onClick={handleAdd}
                  sx={{ fontSize: '0.75rem', py: 0.6, px: 1.5, bgcolor: ORANGE, fontWeight: 600, textTransform: 'none',
                    '&:hover': { bgcolor: '#4338CA' } }}>
                  Add to Pipeline
                </Button>
              )}
              <Button variant="outlined" size="small"
                startIcon={<AssignmentTurnedIn sx={{ fontSize: '0.8rem !important' }} />}
                onClick={handleCreateAssessment}
                sx={{ fontSize: '0.75rem', py: 0.6, px: 1.5, fontWeight: 600, textTransform: 'none',
                  borderColor: '#818CF8', color: '#6366F1', '&:hover': { borderColor: '#6366F1', bgcolor: '#EEF2FF' } }}>
                Create Assessment
              </Button>
              <Button variant="outlined" size="small"
                startIcon={<SmartToyIcon sx={{ fontSize: '0.8rem !important' }} />}
                onClick={() => {/* AI Interview handled via header button */}}
                sx={{ fontSize: '0.75rem', py: 0.6, px: 1.5, fontWeight: 600, textTransform: 'none',
                  borderColor: '#A5B4FC', color: '#6366F1', '&:hover': { borderColor: '#6366F1', bgcolor: '#EEF2FF' } }}>
                AI Interview
              </Button>
            </Box>

            {/* ── Assessments ── */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.6rem', fontWeight: 700, display: 'block', mb: 1 }}>
                Assessments
              </Typography>
              {pastAssessments.length === 0
                ? (
                  <Box sx={{ bgcolor: NAVY, borderRadius: 1.5, p: 2, border: `1px dashed ${NAVY_LT}`, textAlign: 'center' }}>
                    <AssignmentTurnedIn sx={{ fontSize: 28, color: '#CBD5E1', mb: 0.5 }} />
                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>No assessments sent yet</Typography>
                    <Typography variant="caption" sx={{ color: '#CBD5E1', fontSize: '0.65rem' }}>Click "Create Assessment" above to get started</Typography>
                  </Box>
                )
                : pastAssessments.map((a: any) => (
                  <Box key={a.token} sx={{ bgcolor: NAVY, borderRadius: 1.5, p: 1.5, mb: 1, border: `1px solid ${NAVY_LT}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box flex={1}>
                      <Box display="flex" gap={0.75} alignItems="center" mb={0.25}>
                        <Chip label={a.status} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700,
                          bgcolor: a.status === 'COMPLETED' ? '#22C55E18' : a.status === 'IN_PROGRESS' ? '#3B82F618' : '#F59E0B18',
                          color:   a.status === 'COMPLETED' ? '#22C55E'   : a.status === 'IN_PROGRESS' ? '#3B82F6'   : '#F59E0B' }} />
                        {a.overallScore != null && (
                          <Typography variant="caption" sx={{ color: '#1E293B', fontWeight: 700, fontSize: '0.72rem' }}>Score: {a.overallScore}/100</Typography>
                        )}
                        {a.recommendation && (
                          <Chip label={a.recommendation} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#EEF2FF', color: '#4F46E5', fontWeight: 600 }} />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.65rem' }}>
                        {a.completedAt ? `Completed ${new Date(a.completedAt).toLocaleDateString()}` : `Created ${new Date(a.createdAt).toLocaleDateString()}`}
                      </Typography>
                    </Box>
                    {a.status === 'COMPLETED' && (
                      <Button size="small" variant="outlined"
                        startIcon={<Launch sx={{ fontSize: '0.7rem !important' }} />}
                        onClick={() => window.open(`/assessment/${a.token}/results`, '_blank')}
                        sx={{ fontSize: '0.65rem', color: '#6366F1', borderColor: '#C7D2FE', py: 0.3, px: 0.75, textTransform: 'none' }}>
                        Open
                      </Button>
                    )}
                  </Box>
                ))
              }
            </Box>

            {/* ── Interview Evaluations ── */}
            {evals.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.6rem', fontWeight: 700, display: 'block', mb: 1 }}>
                  Interview Evaluations ({evals.length})
                </Typography>
                {evals.map(ev => (
                  <Box key={ev.id} sx={{ bgcolor: NAVY, borderRadius: 1.5, p: 1.5, mb: 1, border: `1px solid ${NAVY_LT}` }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="caption" sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.75rem' }}>
                        {ev.stageName} · {ev.panelMember}
                      </Typography>
                      <Chip label={ev.recommendation} size="small" sx={{
                        height: 18, fontSize: '0.6rem', fontWeight: 700,
                        bgcolor: ev.recommendation === 'ADVANCE' ? '#22C55E18' : ev.recommendation === 'HIRE' ? '#38BDF818' : ev.recommendation === 'REJECT' ? '#EF444418' : '#F59E0B18',
                        color:   ev.recommendation === 'ADVANCE' ? '#22C55E'   : ev.recommendation === 'HIRE' ? '#38BDF8'   : ev.recommendation === 'REJECT' ? '#EF4444'   : '#F59E0B',
                      }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>
                      {ev.comments}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      {/* Assessment Email Dialog */}
      <Dialog open={assessmentDialog} onClose={() => { setAssessmentDialog(false); setAssessmentLink(''); setEmailCopied(false); setAssessmentLinkCopied(false) }}
        maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <AssignmentTurnedIn sx={{ color: '#6366F1' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Assessment Invitation</Typography>
          <IconButton onClick={() => setAssessmentDialog(false)} sx={{ ml: 'auto' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          {creatingAssessment ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3, gap: 2 }}>
              <CircularProgress sx={{ color: '#6366F1' }} />
              <Typography variant="body2" sx={{ color: '#64748B' }}>Generating assessment link…</Typography>
            </Box>
          ) : assessmentLink ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Assessment link created for <strong>{candidate?.candidateName}</strong>. Share it via email.
              </Alert>

              {/* Link row */}
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, display: 'block', mb: 0.5 }}>Assessment Link</Typography>
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', p: 1.25, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E2E8F0', mb: 2 }}>
                <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.72rem', color: '#1E293B' }}>
                  {assessmentLink}
                </Typography>
                <Tooltip title={assessmentLinkCopied ? 'Copied!' : 'Copy link'}>
                  <IconButton size="small" onClick={copyAssessmentLink} sx={{ color: assessmentLinkCopied ? '#22C55E' : '#6366F1', flexShrink: 0 }}>
                    {assessmentLinkCopied ? <CheckCircle fontSize="small" /> : <ContentCopy fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Open in new tab">
                  <IconButton size="small" onClick={() => window.open(assessmentLink, '_blank')} sx={{ color: '#64748B', flexShrink: 0 }}>
                    <Launch fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Email preview */}
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, display: 'block', mb: 0.5 }}>Email Preview</Typography>
              <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E2E8F0', mb: 1.5, maxHeight: 200, overflow: 'auto' }}>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>
                  <strong>To:</strong> {candidate?.email}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1 }}>
                  <strong>Subject:</strong> {emailSubject}
                </Typography>
                <Typography variant="caption" sx={{ color: '#374151', whiteSpace: 'pre-wrap', display: 'block', lineHeight: 1.7 }}>
                  {emailBody}
                </Typography>
              </Box>

              <Box display="flex" gap={1}>
                <Tooltip title={emailCopied ? 'Copied!' : 'Copy email text'}>
                  <Button size="small" variant="outlined" startIcon={emailCopied ? <CheckCircle /> : <ContentCopy />}
                    onClick={copyEmail} sx={{ flex: 1, borderColor: NAVY_LT, color: '#475569', fontSize: '0.72rem' }}>
                    {emailCopied ? 'Copied!' : 'Copy Email'}
                  </Button>
                </Tooltip>
                <Button size="small" variant="contained" startIcon={<Launch />}
                  onClick={openMailto} sx={{ flex: 1, bgcolor: '#6366F1', '&:hover': { bgcolor: '#4F46E5' }, fontSize: '0.72rem' }}>
                  Open Email Client
                </Button>
              </Box>
            </Box>
          ) : (
            <Alert severity="error">Failed to create assessment link. Please try again.</Alert>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const JobDetailPage: React.FC = () => {
  const { id }         = useParams<{ id: string }>()
  const navigate       = useNavigate()
  const dispatch       = useAppDispatch()
  const { organizationId }        = useAppSelector(s => s.auth)
  const { selectedJob, loading }  = useAppSelector(s => s.jobs)

  const [tab,       setTab]       = useState(0)
  const [applied,   setApplied]   = useState<AppliedCandidate[]>([])
  const [loadingAp, setLoadingAp] = useState(false)
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState<AppliedCandidate | null>(null)
  const [linkCopied,setLinkCopied]= useState(false)
  const [version,   setVersion]   = useState(0)   // bump to re-derive pipeline status

  // AI Interview link state
  const [interviewDialog,  setInterviewDialog]  = useState(false)
  const [generatingLink,   setGeneratingLink]   = useState(false)
  const [generatedLink,    setGeneratedLink]    = useState('')
  const [interviewLinkCopied, setInterviewLinkCopied] = useState(false)

  useEffect(() => {
    if (organizationId && id) dispatch(getJobById({ organizationId, jobId: id }))
  }, [organizationId, id, dispatch])

  useEffect(() => {
    if (!id) return
    setLoadingAp(true)
    apiClient.get<AppliedCandidate[]>(`/resume-analysis/job/${id}/applied`)
      .then(r => setApplied(r.data ?? []))
      .catch(() => setApplied([]))
      .finally(() => setLoadingAp(false))
  }, [id])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return applied
      .filter(c => !q || c.candidateName.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || (c.currentRole ?? '').toLowerCase().includes(q))
      .sort((a, b) => b.atsScore - a.atsScore)
  }, [applied, search])

  const stats = useMemo(() => ({
    total:     applied.length,
    excellent: applied.filter(c => c.atsScore >= 80).length,
    good:      applied.filter(c => c.atsScore >= 60 && c.atsScore < 80).length,
    fair:      applied.filter(c => c.atsScore < 60).length,
    avgScore:  applied.length ? Math.round(applied.reduce((s, c) => s + c.atsScore, 0) / applied.length) : 0,
  }), [applied])

  const jobSkills = useMemo(() =>
    (selectedJob?.requirements ?? [])
      .filter((r: Req) => r.requirementType === 'SKILL')
      .map((r: Req) => r.requirementValue),
    [selectedJob])

  const copyApplyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/apply/${id}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleCreateInterviewLink = async () => {
    if (!selectedJob || !id) return
    setGeneratingLink(true)
    setInterviewDialog(true)
    try {
      const { data } = await createInterviewLink({
        jobId:          id,
        jobTitle:       selectedJob.title,
        jobDescription: selectedJob.description ?? '',
        skills:         jobSkills,
      })
      setGeneratedLink(`${window.location.origin}${data.interviewPath}`)
    } catch {
      setGeneratedLink('')
    } finally {
      setGeneratingLink(false)
    }
  }

  const copyInterviewLink = () => {
    if (!generatedLink) return
    navigator.clipboard.writeText(generatedLink)
    setInterviewLinkCopied(true)
    setTimeout(() => setInterviewLinkCopied(false), 2500)
  }

  const SH = {
    bgcolor: NAVY, borderBottom: `1px solid ${NAVY_LT}`,
    fontSize: '0.65rem', fontWeight: 700, color: '#475569',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', py: 1.25
  }

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
      <CircularProgress sx={{ color: ORANGE }} />
    </Box>
  )

  if (!selectedJob) return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/jobs')} sx={{ color: '#94A3B8' }}>Back to Jobs</Button>
      <Typography sx={{ mt: 2, color: '#64748B' }}>Job not found</Typography>
    </Box>
  )

  const reqs: Req[] = selectedJob.requirements ?? []
  const skills      = reqs.filter(r => r.requirementType === 'SKILL')
  const certs       = reqs.filter(r => r.requirementType === 'CERTIFICATION')
  const edus        = reqs.filter(r => r.requirementType === 'EDUCATION')

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/jobs')}
            sx={{ color: '#64748B', mb: 1, '&:hover': { color: ORANGE } }}>
            Back to Jobs
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', mb: 0.5 }}>
            {selectedJob.title}
          </Typography>
          <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
            <Chip label={selectedJob.status} size="small" sx={{
              fontWeight: 700, fontSize: '0.65rem',
              bgcolor: selectedJob.status === 'OPEN' ? '#22C55E22' : '#33415522',
              color:   selectedJob.status === 'OPEN' ? '#22C55E'  : '#64748B',
              border:  `1px solid ${selectedJob.status === 'OPEN' ? '#22C55E44' : NAVY_LT}`,
            }} />
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              {selectedJob.location} · {selectedJob.workMode?.replace('_', ' ')} · {selectedJob.employmentType?.replace('_', ' ')}
            </Typography>
          </Box>
        </Box>

        <Box display="flex" gap={1} flexWrap="wrap">
          <Tooltip title={linkCopied ? 'Copied!' : 'Copy public apply link'} arrow>
            <Button size="small" variant="outlined" startIcon={linkCopied ? <CheckCircle sx={{ color: '#22C55E !important' }} /> : <ContentCopy />}
              onClick={copyApplyLink}
              sx={{ borderColor: linkCopied ? '#22C55E' : NAVY_LT, color: linkCopied ? '#22C55E' : '#64748B',
                '&:hover': { borderColor: ORANGE, color: ORANGE } }}>
              Apply Link
            </Button>
          </Tooltip>
          <Button variant="outlined" size="small" startIcon={<Launch sx={{ fontSize: '0.85rem !important' }} />}
            onClick={() => window.open(`/apply/${id}`, '_blank')}
            sx={{ borderColor: NAVY_LT, color: '#64748B', '&:hover': { borderColor: '#38BDF8', color: '#38BDF8' } }}>
            Preview
          </Button>
          <Button variant="outlined" size="small" startIcon={<SmartToyIcon />}
            onClick={handleCreateInterviewLink}
            sx={{ borderColor: '#818CF8', color: '#6366F1', '&:hover': { borderColor: '#6366F1', bgcolor: '#EEF2FF' }, fontWeight: 700 }}>
            AI Interview
          </Button>
          <Button variant="contained" size="small" startIcon={<PipelineIcon />}
            onClick={() => navigate(`/jobs/${selectedJob.id}/pipeline`)}
            sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#4338CA' }, fontWeight: 700 }}>
            Hiring Pipeline
          </Button>
        </Box>
      </Box>

      {/* AI Interview Link Dialog */}
      <Dialog open={interviewDialog} onClose={() => { setInterviewDialog(false); setGeneratedLink(''); setInterviewLinkCopied(false) }} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <SmartToyIcon sx={{ color: '#6366F1' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>AI Interview Link</Typography>
          <IconButton onClick={() => { setInterviewDialog(false); setGeneratedLink('') }} sx={{ ml: 'auto' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          {generatingLink ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3, gap: 2 }}>
              <CircularProgress sx={{ color: '#6366F1' }} />
              <Typography variant="body2" sx={{ color: '#64748B' }}>Generating interview link…</Typography>
            </Box>
          ) : generatedLink ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>Link generated! Share with the candidate — expires in 7 days or after completion.</Alert>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all', color: '#1E293B', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                  {generatedLink}
                </Typography>
                <Tooltip title={interviewLinkCopied ? 'Copied!' : 'Copy link'}>
                  <IconButton size="small" onClick={copyInterviewLink} sx={{ color: interviewLinkCopied ? '#22C55E' : '#6366F1', flexShrink: 0 }}>
                    {interviewLinkCopied ? <CheckCircle fontSize="small" /> : <ContentCopy fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Open in new tab">
                  <IconButton size="small" onClick={() => window.open(generatedLink, '_blank')} sx={{ color: '#64748B', flexShrink: 0 }}>
                    <Launch fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: '#94A3B8' }}>
                • 10 AI-generated questions tailored to this job • 30-minute time limit • Answers are voice or text • Link expires after use
              </Typography>
            </Box>
          ) : (
            <Alert severity="error">Failed to generate link. Please try again.</Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* Overview card */}
      <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2, mb: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            {[
              { label: 'Experience', value: `${selectedJob.minExperienceYears ?? 0}–${selectedJob.maxExperienceYears ?? '?'} years` },
              { label: 'Employment', value: selectedJob.employmentType?.replace('_', ' ') ?? 'N/A' },
              { label: 'Work Mode',  value: selectedJob.workMode?.replace('_', ' ') ?? 'N/A' },
              { label: 'Salary',     value: selectedJob.salaryMin ? `$${(selectedJob.salaryMin/1000).toFixed(0)}k – $${(selectedJob.salaryMax/1000).toFixed(0)}k` : 'Not disclosed' },
            ].map(m => (
              <Grid item xs={6} sm={3} key={m.label}>
                <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {m.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B', mt: 0.25 }}>{m.value}</Typography>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Description
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5, fontSize: '0.8rem', lineHeight: 1.7 }}>
                {selectedJob.description}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2 }}>
        <Box sx={{ borderBottom: `1px solid ${NAVY_LT}` }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}
            sx={{ '& .MuiTab-root': { fontSize: '0.78rem', fontWeight: 600, color: '#64748B', textTransform: 'none', minHeight: 44 },
                  '& .Mui-selected': { color: ORANGE }, '& .MuiTabs-indicator': { bgcolor: ORANGE } }}>
            <Tab label="Requirements" icon={<AssignmentTurnedIn sx={{ fontSize: '0.9rem' }} />} iconPosition="start" />
            <Tab label={
              <Box display="flex" alignItems="center" gap={0.75}>
                Applications
                <Badge badgeContent={applied.length} max={999}
                  sx={{ '& .MuiBadge-badge': { bgcolor: ORANGE, color: 'white', fontSize: '0.6rem', height: 16, minWidth: 16 } }} />
              </Box>
            } icon={<TrendingUp sx={{ fontSize: '0.9rem' }} />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* ── Requirements Tab ──────────────────────────────────── */}
        {tab === 0 && (
          <Box p={3}>
            {reqs.length === 0 ? (
              <Typography sx={{ color: '#475569', textAlign: 'center', py: 4 }}>No requirements listed for this job.</Typography>
            ) : (
              <Grid container spacing={3}>
                {/* Skills */}
                {skills.length > 0 && (
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                      <Psychology sx={{ color: ORANGE, fontSize: '1.1rem' }} />
                      <Typography sx={{ fontWeight: 700, color: '#1E293B', fontSize: '0.9rem' }}>
                        Required Skills
                      </Typography>
                      <Chip label={`${skills.length} skills`} size="small"
                        sx={{ height: 18, fontSize: '0.6rem', bgcolor: `${ORANGE}22`, color: ORANGE }} />
                    </Box>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {[...skills].sort((a, b) => a.priorityLevel - b.priorityLevel).map(r => (
                        <Box key={r.requirementValue}
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5,
                            bgcolor: r.isMandatory ? `${ORANGE}15` : NAVY_LT,
                            border: `1px solid ${r.isMandatory ? `${ORANGE}44` : NAVY_LT}`,
                            borderRadius: 6, px: 1.5, py: 0.5 }}>
                          {r.isMandatory && <VerifiedUser sx={{ fontSize: '0.65rem', color: ORANGE }} />}
                          <Typography sx={{ fontSize: '0.78rem', fontWeight: r.isMandatory ? 700 : 400,
                            color: r.isMandatory ? '#E2E8F0' : '#94A3B8' }}>
                            {r.requirementValue}
                          </Typography>
                          {r.isMandatory && (
                            <Chip label="Required" size="small"
                              sx={{ height: 14, fontSize: '0.55rem', bgcolor: `${ORANGE}33`, color: ORANGE, ml: 0.25 }} />
                          )}
                        </Box>
                      ))}
                    </Box>
                    <Typography variant="caption" sx={{ color: '#334155', mt: 1, display: 'block' }}>
                      <VerifiedUser sx={{ fontSize: '0.65rem', verticalAlign: 'middle', mr: 0.5 }} />
                      Orange border = mandatory skill
                    </Typography>
                  </Grid>
                )}

                {/* Certifications */}
                {certs.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                      <VerifiedUser sx={{ color: '#38BDF8', fontSize: '1.1rem' }} />
                      <Typography sx={{ fontWeight: 700, color: '#1E293B', fontSize: '0.9rem' }}>Certifications</Typography>
                    </Box>
                    <Box display="flex" flexDirection="column" gap={0.75}>
                      {certs.map(r => (
                        <Box key={r.requirementValue} display="flex" alignItems="center" gap={1}
                          sx={{ bgcolor: NAVY, borderRadius: 1.5, px: 1.5, py: 1, border: `1px solid ${NAVY_LT}` }}>
                          <CheckCircle sx={{ fontSize: '0.85rem', color: '#38BDF8' }} />
                          <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                            {r.requirementValue}
                          </Typography>
                          {!r.isMandatory && (
                            <Chip label="Optional" size="small"
                              sx={{ height: 14, fontSize: '0.55rem', bgcolor: NAVY_LT, color: '#475569', ml: 'auto' }} />
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Grid>
                )}

                {/* Education */}
                {edus.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                      <School sx={{ color: '#A78BFA', fontSize: '1.1rem' }} />
                      <Typography sx={{ fontWeight: 700, color: '#1E293B', fontSize: '0.9rem' }}>Education</Typography>
                    </Box>
                    <Box display="flex" flexDirection="column" gap={0.75}>
                      {edus.map(r => (
                        <Box key={r.requirementValue} display="flex" alignItems="center" gap={1}
                          sx={{ bgcolor: NAVY, borderRadius: 1.5, px: 1.5, py: 1, border: `1px solid ${NAVY_LT}` }}>
                          <School sx={{ fontSize: '0.85rem', color: '#A78BFA' }} />
                          <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                            {r.requirementValue}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        )}

        {/* ── Applications Tab ──────────────────────────────────── */}
        {tab === 1 && (
          <Box p={0}>
            {/* Stat bar */}
            <Box display="flex" gap={0} sx={{ borderBottom: `1px solid ${NAVY_LT}` }}>
              {[
                { label: 'Total',     value: stats.total,     color: '#1E293B' },
                { label: 'Excellent', value: stats.excellent, color: '#22C55E' },
                { label: 'Good',      value: stats.good,      color: '#F59E0B' },
                { label: 'Fair',      value: stats.fair,      color: '#EF4444' },
                { label: 'Avg Score', value: `${stats.avgScore}%`, color: ORANGE },
              ].map((s, i) => (
                <Box key={s.label} flex={1} textAlign="center" py={1.5}
                  sx={{ borderRight: i < 4 ? `1px solid ${NAVY_LT}` : 'none' }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: s.color, lineHeight: 1 }}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {s.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Search */}
            <Box p={2} sx={{ borderBottom: `1px solid ${NAVY_LT}` }}>
              <TextField size="small" fullWidth placeholder="Search by name, email, or role…"
                value={search} onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: '1rem', color: '#475569' }} /></InputAdornment> }}
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.8rem' }, '& fieldset': { borderColor: NAVY_LT } }} />
            </Box>

            {/* Table */}
            {loadingAp ? (
              <Box textAlign="center" py={6}><CircularProgress sx={{ color: ORANGE }} size={32} /></Box>
            ) : filtered.length === 0 ? (
              <Box textAlign="center" py={6}>
                <Typography sx={{ color: '#334155' }}>
                  {applied.length === 0 ? 'No applications yet. Share the apply link to get candidates.' : 'No candidates match the search.'}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': SH }}>
                      <TableCell>Candidate</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell align="center">ATS Score</TableCell>
                      <TableCell>Matched Skills</TableCell>
                      <TableCell>Pipeline Stage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map(c => {
                      const ps = getPipelineStatus(id!, c.id, c.email)
                      return (
                        <TableRow key={c.id}
                          onClick={() => setSelected(c)}
                          sx={{ cursor: 'pointer', borderBottom: `1px solid ${NAVY_LT}`,
                            '&:last-child td': { border: 'none' },
                            '&:hover': { bgcolor: `${ORANGE}08` } }}>

                          <TableCell sx={{ py: 1.25 }}>
                            <Box display="flex" alignItems="center" gap={1.25}>
                              <Avatar sx={{ width: 30, height: 30, fontSize: '0.65rem', fontWeight: 800,
                                bgcolor: `${scoreColor(c.atsScore)}22`, color: scoreColor(c.atsScore), flexShrink: 0 }}>
                                {c.candidateName.split(' ').map(w => w[0]).slice(0, 2).join('')}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B', lineHeight: 1.2 }}>
                                  {c.candidateName}
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#64748B' }}>
                                  {c.currentRole || 'Applicant'} · {c.yearsOfExperience ?? 0} yrs
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell sx={{ fontSize: '0.72rem', color: '#64748B', py: 1.25 }}>
                            {c.email}
                          </TableCell>

                          <TableCell align="center" sx={{ py: 1.25 }}>
                            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                              <Box sx={{ width: 36, height: 5, borderRadius: 3, bgcolor: NAVY_LT, overflow: 'hidden' }}>
                                <Box sx={{ width: `${c.atsScore}%`, height: '100%', bgcolor: scoreColor(c.atsScore), borderRadius: 3 }} />
                              </Box>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: scoreColor(c.atsScore), fontSize: '0.75rem', minWidth: 30 }}>
                                {Math.round(c.atsScore)}%
                              </Typography>
                            </Box>
                          </TableCell>

                          <TableCell sx={{ py: 1.25 }}>
                            <Box display="flex" flexWrap="wrap" gap={0.4}>
                              {(c.matchedSkills ?? []).slice(0, 4).map(sk => (
                                <Chip key={sk} label={sk} size="small"
                                  sx={{ height: 16, fontSize: '0.58rem', bgcolor: '#22C55E18', color: '#22C55E' }} />
                              ))}
                              {(c.matchedSkills ?? []).length > 4 && (
                                <Typography variant="caption" sx={{ color: '#475569', alignSelf: 'center', fontSize: '0.65rem' }}>
                                  +{c.matchedSkills.length - 4}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>

                          <TableCell sx={{ py: 1.25 }}>
                            {ps.inPipeline ? (
                              <Chip label={ps.stageLabel} size="small" sx={{
                                height: 20, fontSize: '0.63rem', fontWeight: 700,
                                bgcolor: `${ps.stageColor}20`, color: ps.stageColor,
                                border: `1px solid ${ps.stageColor}44`
                              }} />
                            ) : (
                              <Typography variant="caption" sx={{ color: '#334155', fontStyle: 'italic', fontSize: '0.68rem' }}>
                                Not in pipeline
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        )}
      </Card>

      {/* Candidate detail dialog */}
      <CandidateDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        candidate={selected}
        jobId={id!}
        jobTitle={selectedJob?.title ?? ''}
        jobDescription={selectedJob?.description ?? ''}
        jobSkills={jobSkills}
        onAddedToPipeline={() => setVersion(v => v + 1)}
      />
    </Box>
  )
}

export default JobDetailPage
