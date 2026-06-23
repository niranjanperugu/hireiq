import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Paper, Grid, Chip, Button, CircularProgress,
  Stepper, Step, StepLabel, StepContent, Avatar, Tooltip,
  TextField, Snackbar, Alert, Divider, Stack, IconButton,
  Table, TableBody, TableCell, TableRow
} from '@mui/material'
import {
  ArrowBack, EmailOutlined, PhoneOutlined,
  DownloadOutlined, OpenInNew, StarRounded,
  CheckCircle, Cancel, PauseCircle,
  ArrowForward, WorkHistory, SchoolOutlined,
  Send
} from '@mui/icons-material'
import apiClient from '@services/apiClient'
import {
  loadPipeline, loadEvaluations, loadSchedules,
  Evaluation, InterviewSchedule, DEFAULT_STAGES, savePipeline
} from '@utils/pipelineStorage'
import { useAppSelector } from '@hooks/redux'
import { sendShortlistEmail, sendRejectionEmail, sendOfferEmail } from '@services/notificationApi'
import { loadSettings } from '@utils/pipelineStorage'

const ORANGE = '#6366F1'
const NAVY   = '#0B0F1A'

interface ResumeAnalysis {
  id: string
  candidateName: string
  currentRole: string | null
  email: string
  phone: string | null
  atsScore: number
  matchedSkills: string[]
  missingSkills: string[]
  yearsOfExperience: number
  education: string
  professionalSummary: string
  resumeFileName: string
  resumeS3Url: string | null
  rating: string | null
  jobId: string
  jobTitle: string
}

// SVG ring for ATS score
function ScoreRing({ score }: { score: number }) {
  const r = 38, circ = 2 * Math.PI * r
  const fill = circ - (circ * Math.min(score, 100)) / 100
  const color = score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#EF4444'
  return (
    <Box sx={{ position: 'relative', width: 96, height: 96 }}>
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={r} fill="none" stroke="#E2E8F0" strokeWidth={8} />
        <circle cx={48} cy={48} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={fill}
          strokeLinecap="round" transform="rotate(-90 48 48)" />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography fontSize={20} fontWeight={800} color={color} lineHeight={1}>{Math.round(score)}</Typography>
        <Typography fontSize={10} color="text.secondary">ATS</Typography>
      </Box>
    </Box>
  )
}

function recLabel(rec: string) {
  switch (rec) {
    case 'ADVANCE': return { label: 'Advance', color: '#2563EB', bg: '#DBEAFE' }
    case 'HIRE':    return { label: 'Hire',    color: '#16A34A', bg: '#DCFCE7' }
    case 'REJECT':  return { label: 'Reject',  color: '#DC2626', bg: '#FEE2E2' }
    case 'HOLD':    return { label: 'On Hold', color: '#D97706', bg: '#FEF3C7' }
    default:        return { label: rec,       color: '#64748B', bg: '#F1F5F9' }
  }
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const jobId      = params.get('jobId') || ''

  const jobs     = useAppSelector(s => s.jobs.jobs)
  const orgId    = useAppSelector(s => s.auth.organizationId)

  const [analysis,   setAnalysis]   = useState<ResumeAnalysis | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [evals,      setEvals]      = useState<Evaluation[]>([])
  const [schedules,  setSchedules]  = useState<InterviewSchedule[]>([])
  const [stageLabel, setStageLabel] = useState<string | null>(null)
  const [stageColor, setStageColor] = useState('#64748B')
  const [notes,      setNotes]      = useState('')
  const [toast,      setToast]      = useState<string | null>(null)

  const pipelineKey = `applied_${id}`

  const loadLocalData = useCallback(() => {
    if (!jobId || !id) return
    const pipeline = loadPipeline(jobId)
    const stages   = pipeline.stages.length > 0 ? pipeline.stages : DEFAULT_STAGES
    const stageId  = pipeline.stageMap[pipelineKey]
    const stage    = stages.find(s => s.id === stageId)
    setStageLabel(stage?.label || null)
    setStageColor(stage?.color || '#64748B')
    const noteArr = pipeline.notes[pipelineKey] || []
    setNotes(Array.isArray(noteArr) ? noteArr.join('\n') : String(noteArr))

    const allEvals = loadEvaluations().filter(e => e.candidateId === pipelineKey && e.jobId === jobId)
    setEvals(allEvals.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()))

    const allSched = loadSchedules().filter(s => s.candidateId === pipelineKey && s.jobId === jobId)
    setSchedules(allSched.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()))
  }, [jobId, id, pipelineKey])

  useEffect(() => {
    if (!id) return
    setLoading(true)

    // Try to fetch the analysis record
    const fetchAnalysis = async () => {
      try {
        // Try direct by ID first
        const res = await apiClient.get(`/resume-analysis/${id}`)
        setAnalysis(res.data)
      } catch {
        // Fallback: search in the job's applied list
        if (jobId) {
          try {
            const res2 = await apiClient.get(`/resume-analysis/job/${jobId}/applied`)
            const items: ResumeAnalysis[] = res2.data?.content || res2.data || []
            const found = items.find((a: ResumeAnalysis) => a.id === id)
            if (found) setAnalysis(found)
          } catch {}
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()
    loadLocalData()
  }, [id, jobId, loadLocalData])

  const handleSaveNotes = () => {
    if (!jobId || !id) return
    const pipeline = loadPipeline(jobId)
    pipeline.notes[pipelineKey] = notes ? [notes] : []
    savePipeline(jobId, pipeline)
    setToast('Notes saved')
  }

  const handleSendEmail = async (type: 'shortlist' | 'reject' | 'offer') => {
    if (!analysis) return
    const name     = analysis.candidateName
    const email    = analysis.email
    const jobTitle = analysis.jobTitle || jobs.find(j => j.id === jobId)?.title || 'the position'
    const settings = loadSettings()
    try {
      if (type === 'shortlist' && settings.emailOnShortlist) await sendShortlistEmail(email, name, jobTitle)
      if (type === 'reject'    && settings.emailOnReject)    await sendRejectionEmail(email, name, jobTitle)
      if (type === 'offer'     && settings.emailOnOffer)     await sendOfferEmail(email, name, jobTitle)
      setToast(`Email sent to ${email}`)
    } catch {
      setToast('Email failed — check SES configuration')
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress sx={{ color: ORANGE }} />
      </Box>
    )
  }

  const name     = analysis?.candidateName || 'Unknown Candidate'
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const jobTitle = analysis?.jobTitle || jobs.find(j => j.id === jobId)?.title || 'Unknown Job'

  return (
    <Box sx={{ p: 3 }}>
      {/* Back */}
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2, color: '#64748B' }}>
        Back
      </Button>

      <Grid container spacing={3}>
        {/* ── Left Column ──────────────────────────────────────────────────── */}
        <Grid item xs={12} md={4}>

          {/* Profile Card */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2.5 }}>
              <Avatar sx={{ width: 72, height: 72, bgcolor: NAVY, fontSize: 26, fontWeight: 700, mb: 1.5 }}>
                {initials}
              </Avatar>
              <Typography variant="h6" fontWeight={700} color={NAVY} align="center">{name}</Typography>
              {analysis?.currentRole && (
                <Typography variant="body2" color="text.secondary" align="center">{analysis.currentRole}</Typography>
              )}
              {stageLabel && (
                <Chip label={stageLabel} size="small"
                  sx={{ mt: 1, bgcolor: stageColor + '20', color: stageColor, border: `1px solid ${stageColor}40`, fontWeight: 600 }} />
              )}
              {jobId && (
                <Typography variant="caption" color="text.secondary" align="center" mt={0.5}>
                  {jobTitle}
                </Typography>
              )}
            </Box>

            <Divider sx={{ mb: 2 }} />

            {analysis?.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <EmailOutlined sx={{ fontSize: 16, color: '#94A3B8' }} />
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{analysis.email}</Typography>
              </Box>
            )}
            {analysis?.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PhoneOutlined sx={{ fontSize: 16, color: '#94A3B8' }} />
                <Typography variant="body2">{analysis.phone}</Typography>
              </Box>
            )}
            {analysis?.yearsOfExperience != null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <WorkHistory sx={{ fontSize: 16, color: '#94A3B8' }} />
                <Typography variant="body2">{analysis.yearsOfExperience} yrs experience</Typography>
              </Box>
            )}
            {analysis?.education && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SchoolOutlined sx={{ fontSize: 16, color: '#94A3B8' }} />
                <Typography variant="body2">{analysis.education}</Typography>
              </Box>
            )}
          </Paper>

          {/* ATS Score */}
          {analysis?.atsScore != null && (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 2, mb: 2 }}>
              <Typography variant="body2" fontWeight={700} color={NAVY} mb={2}>ATS Score</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ScoreRing score={analysis.atsScore} />
                <Box>
                  <Typography variant="body2" color="text.secondary" mb={0.5}>
                    {analysis.rating === 'EXCELLENT' ? 'Excellent Match' :
                     analysis.rating === 'GOOD'      ? 'Good Match'      : 'Fair Match'}
                  </Typography>
                  {analysis.matchedSkills?.length > 0 && (
                    <Typography variant="caption" color="#22C55E">
                      {analysis.matchedSkills.length} matched skills
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          )}

          {/* Skills */}
          {(analysis?.matchedSkills?.length || analysis?.missingSkills?.length) && (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 2, mb: 2 }}>
              <Typography variant="body2" fontWeight={700} color={NAVY} mb={1.5}>Skills Match</Typography>
              {analysis!.matchedSkills?.length > 0 && (
                <Box mb={1.5}>
                  <Typography variant="caption" color="#22C55E" fontWeight={600} display="block" mb={0.5}>
                    ✓ Matched ({analysis!.matchedSkills.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {analysis!.matchedSkills.map(s => (
                      <Chip key={s} label={s} size="small"
                        sx={{ height: 22, fontSize: 11, bgcolor: '#DCFCE7', color: '#16A34A' }} />
                    ))}
                  </Box>
                </Box>
              )}
              {analysis!.missingSkills?.length > 0 && (
                <Box>
                  <Typography variant="caption" color="#EF4444" fontWeight={600} display="block" mb={0.5}>
                    ✗ Missing ({analysis!.missingSkills.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {analysis!.missingSkills.map(s => (
                      <Chip key={s} label={s} size="small"
                        sx={{ height: 22, fontSize: 11, bgcolor: '#FEE2E2', color: '#DC2626' }} />
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
          )}

          {/* Resume */}
          {(analysis?.resumeS3Url || analysis?.resumeFileName) && (
            <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E2E8F0', borderRadius: 2, mb: 2 }}>
              <Typography variant="body2" fontWeight={700} color={NAVY} mb={1.5}>Resume</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1.5}
                sx={{ wordBreak: 'break-all' }}>
                {analysis.resumeFileName}
              </Typography>
              <Stack direction="row" spacing={1}>
                {analysis.resumeS3Url && (
                  <>
                    <Button size="small" variant="outlined" startIcon={<OpenInNew />}
                      onClick={() => window.open(analysis!.resumeS3Url!, '_blank')}
                      sx={{ fontSize: 12, borderColor: ORANGE, color: ORANGE,
                        '&:hover': { borderColor: ORANGE, bgcolor: ORANGE + '10' } }}>
                      View
                    </Button>
                    <Tooltip title="Download resume">
                      <IconButton size="small" component="a" href={analysis.resumeS3Url}
                        download={analysis.resumeFileName} target="_blank">
                        <DownloadOutlined fontSize="small" sx={{ color: '#64748B' }} />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Stack>
            </Paper>
          )}

          {/* Quick Actions */}
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={700} color={NAVY} mb={1.5}>HR Actions</Typography>
            <Stack spacing={1}>
              <Button size="small" variant="outlined" startIcon={<Send />}
                onClick={() => handleSendEmail('shortlist')}
                sx={{ justifyContent: 'flex-start', fontSize: 12, borderColor: '#2563EB', color: '#2563EB',
                  '&:hover': { borderColor: '#2563EB', bgcolor: '#EFF6FF' } }}>
                Send Shortlist Email
              </Button>
              <Button size="small" variant="outlined" startIcon={<Send />}
                onClick={() => handleSendEmail('offer')}
                sx={{ justifyContent: 'flex-start', fontSize: 12, borderColor: '#16A34A', color: '#16A34A',
                  '&:hover': { borderColor: '#16A34A', bgcolor: '#F0FDF4' } }}>
                Send Offer Email
              </Button>
              <Button size="small" variant="outlined" startIcon={<Send />}
                onClick={() => handleSendEmail('reject')}
                sx={{ justifyContent: 'flex-start', fontSize: 12, borderColor: '#DC2626', color: '#DC2626',
                  '&:hover': { borderColor: '#DC2626', bgcolor: '#FEF2F2' } }}>
                Send Rejection Email
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* ── Right Column ─────────────────────────────────────────────────── */}
        <Grid item xs={12} md={8}>

          {/* Profile Summary */}
          {analysis?.professionalSummary && (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 2, mb: 2 }}>
              <Typography variant="body2" fontWeight={700} color={NAVY} mb={1.5}>Profile Summary</Typography>
              <Typography variant="body2" color="text.primary" lineHeight={1.7}>
                {analysis.professionalSummary}
              </Typography>
            </Paper>
          )}

          {/* Interview Timeline */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 2, mb: 2 }}>
            <Typography variant="body2" fontWeight={700} color={NAVY} mb={2}>Interview History</Typography>

            {evals.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No evaluations recorded yet.
              </Typography>
            ) : (
              <Stepper orientation="vertical" nonLinear>
                {evals.map((ev, i) => {
                  const rec = recLabel(ev.recommendation)
                  const avgRating = ev.skillRatings?.length > 0
                    ? ev.skillRatings.reduce((s, r) => s + r.rating, 0) / ev.skillRatings.length
                    : ev.overallRating
                  return (
                    <Step key={ev.id} active expanded>
                      <StepLabel
                        icon={
                          ev.recommendation === 'HIRE' ? <CheckCircle sx={{ color: '#16A34A' }} />
                          : ev.recommendation === 'REJECT' ? <Cancel sx={{ color: '#DC2626' }} />
                          : ev.recommendation === 'HOLD' ? <PauseCircle sx={{ color: '#D97706' }} />
                          : <ArrowForward sx={{ color: '#2563EB' }} />
                        }
                        optional={
                          <Typography variant="caption" color="text.secondary">
                            {new Date(ev.submittedAt).toLocaleDateString()} • {ev.panelMember}
                          </Typography>
                        }
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{ev.stageName}</Typography>
                          <Chip label={rec.label} size="small"
                            sx={{ height: 20, fontSize: 11, bgcolor: rec.bg, color: rec.color }} />
                        </Box>
                      </StepLabel>
                      <StepContent>
                        {/* Skill ratings */}
                        {ev.skillRatings?.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                            {ev.skillRatings.map(sr => (
                              <Chip key={sr.skill}
                                label={`${sr.skill}: ${sr.rating}/5`}
                                size="small"
                                sx={{ height: 22, fontSize: 11, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}
                              />
                            ))}
                          </Box>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <StarRounded sx={{ fontSize: 14, color: '#F59E0B' }} />
                          <Typography variant="caption" fontWeight={600}>
                            Overall: {avgRating.toFixed(1)}/5
                          </Typography>
                        </Box>
                        {ev.comments && (
                          <Typography variant="body2" color="text.secondary" mt={0.5}
                            sx={{ bgcolor: '#F8FAFC', p: 1, borderRadius: 1, borderLeft: '3px solid #E2E8F0' }}>
                            {ev.comments}
                          </Typography>
                        )}
                      </StepContent>
                    </Step>
                  )
                })}
              </Stepper>
            )}
          </Paper>

          {/* Scheduled Interviews */}
          {schedules.length > 0 && (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 2, mb: 2 }}>
              <Typography variant="body2" fontWeight={700} color={NAVY} mb={2}>Scheduled Interviews</Typography>
              <Table size="small">
                <TableBody>
                  {schedules.map(s => (
                    <TableRow key={s.id}>
                      <TableCell sx={{ pl: 0 }}>
                        <Typography variant="body2" fontWeight={600}>{s.stageName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(s.dateTime).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={s.type} size="small"
                          sx={{ height: 20, fontSize: 11, bgcolor: '#F1F5F9', color: '#475569' }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={s.status}
                          size="small"
                          sx={{
                            height: 20, fontSize: 11,
                            bgcolor: s.status === 'COMPLETED' ? '#DCFCE7' : s.status === 'CANCELLED' ? '#FEE2E2' : '#DBEAFE',
                            color:   s.status === 'COMPLETED' ? '#16A34A' : s.status === 'CANCELLED' ? '#DC2626' : '#2563EB',
                          }}
                        />
                      </TableCell>
                      {s.meetingLink && (
                        <TableCell>
                          <IconButton size="small" component="a" href={s.meetingLink} target="_blank">
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}

          {/* Notes */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={700} color={NAVY} mb={1.5}>Notes</Typography>
            <TextField
              fullWidth multiline rows={4}
              placeholder="Add HR notes about this candidate…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              size="small"
              sx={{ mb: 1.5 }}
            />
            <Button
              size="small"
              variant="contained"
              onClick={handleSaveNotes}
              sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#c43d1f' } }}
            >
              Save Notes
            </Button>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast?.includes('failed') ? 'error' : 'success'} onClose={() => setToast(null)}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}
