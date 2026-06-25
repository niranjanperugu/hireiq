import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Paper, Chip, Avatar, Button, Divider,
  Rating, TextField, CircularProgress, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, FormControl, InputLabel,
  Alert, Snackbar,
} from '@mui/material'
import {
  ArrowBack, EmailOutlined, PhoneOutlined,
  CalendarToday, VideoCall, Phone, CheckCircle,
  ArrowForward, Cancel, PauseCircle, StarBorder,
  EditCalendar, HourglassEmpty, School, WorkHistory, LocationOn,
} from '@mui/icons-material'
import { useAppSelector } from '@hooks/redux'
import {
  loadPipeline, loadSchedules, loadEvaluations,
  saveEvaluation, saveSchedule,
  PipelineCandidate, InterviewRound, InterviewSchedule,
  Evaluation, SkillRating, uid,
} from '@utils/pipelineStorage'

// ── Light theme tokens (global site palette) ──────────────────────────────────
const INDIGO  = '#6366F1'
const INDIGO_D= '#4338CA'
const BG      = '#F8FAFC'
const CARD    = '#FFFFFF'
const BORDER  = '#E2E8F0'
const TEXT1   = '#1E293B'
const TEXT2   = '#64748B'
const TEXT3   = '#94A3B8'

const REC_CFG = {
  ADVANCE: { label: 'Advance to Next Round', color: INDIGO,    icon: <ArrowForward /> },
  HIRE:    { label: 'Recommend for Hire',     color: '#16A34A', icon: <CheckCircle /> },
  REJECT:  { label: 'Reject Candidate',       color: '#DC2626', icon: <Cancel /> },
  HOLD:    { label: 'Put on Hold',            color: '#D97706', icon: <PauseCircle /> },
} as const

const SKILLS_TO_RATE = [
  'Technical Knowledge', 'Problem Solving', 'Communication',
  'Team Collaboration', 'Cultural Fit',
]

function scoreColor(s: number) {
  return s >= 80 ? '#22C55E' : s >= 60 ? '#F59E0B' : '#EF4444'
}

// Shared text-field style for the light theme
const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: BG, color: TEXT1, fontSize: 13,
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: `${INDIGO}60` },
    '&.Mui-focused fieldset': { borderColor: INDIGO },
  },
  '& .MuiInputLabel-root': { color: TEXT2, '&.Mui-focused': { color: INDIGO } },
}

export default function PanelCandidateDetailPage() {
  const { candidateId, jobId } = useParams<{ candidateId: string; jobId: string }>()
  const navigate  = useNavigate()
  const { user }  = useAppSelector(s => s.auth)

  const [candidate,  setCandidate]  = useState<PipelineCandidate | null>(null)
  const [rounds,     setRounds]     = useState<InterviewRound[]>([])
  const [schedule,   setSchedule]   = useState<InterviewSchedule | null>(null)
  const [myRound,    setMyRound]    = useState<InterviewRound | null>(null)
  const [prevEvals,  setPrevEvals]  = useState<Evaluation[]>([])
  const [loading,    setLoading]    = useState(true)

  const [skillRatings,    setSkillRatings]    = useState<Record<string, number>>({})
  const [overallRating,   setOverallRating]   = useState(0)
  const [recommendation,  setRecommendation]  = useState<'ADVANCE'|'HIRE'|'REJECT'|'HOLD'|''>('')
  const [techComments,    setTechComments]    = useState('')
  const [generalComments, setGeneralComments] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState<{ msg: string; severity: 'success'|'error' } | null>(null)
  const [alreadySub, setAlreadySub] = useState(false)

  const [schedOpen,  setSchedOpen]  = useState(false)
  const [schedDT,    setSchedDT]    = useState('')
  const [schedMode,  setSchedMode]  = useState<'VIDEO'|'IN_PERSON'|'PHONE'>('VIDEO')
  const [schedLink,  setSchedLink]  = useState('')
  const [schedDur,   setSchedDur]   = useState(60)
  const [schedNotes, setSchedNotes] = useState('')

  const panelMemberName = user ? `${user.firstName} ${user.lastName}` : ''

  useEffect(() => {
    if (!candidateId || !jobId) return

    const pl = loadPipeline(jobId)
    const c  = pl.candidates.find(x => x.id === candidateId) ?? null
    setCandidate(c)

    const rnds = JSON.parse(localStorage.getItem('hs_interview_rounds') ?? '[]') as InterviewRound[]
    const myRnds = rnds.filter(r => r.candidateId === candidateId && r.jobId === jobId)
    setRounds(myRnds)

    const assigned = myRnds.find(r =>
      r.assignedPanelMemberIds?.includes(user?.panelMemberId ?? '') ||
      r.assignedPanelMemberNames?.some(n => n.toLowerCase() === panelMemberName.toLowerCase())
    )
    setMyRound(assigned ?? myRnds[myRnds.length - 1] ?? null)

    const sched = loadSchedules().find(s => s.candidateId === candidateId && s.jobId === jobId)
    setSchedule(sched ?? null)
    if (sched) {
      setSchedDT(sched.dateTime.slice(0, 16))
      setSchedMode(sched.type)
      setSchedLink(sched.meetingLink ?? '')
      setSchedDur(sched.duration ?? 60)
      setSchedNotes(sched.notes ?? '')
    }

    const allEvals = loadEvaluations()
    const mine = allEvals.filter(e =>
      e.candidateId === candidateId && e.jobId === jobId && (
        e.submitterEmail === user?.email ||
        e.panelMember?.toLowerCase() === panelMemberName.toLowerCase()
      )
    )
    setPrevEvals(mine)

    if (mine.length > 0 && assigned) {
      const existing = mine.find(e => e.interviewRoundId === assigned.id)
      if (existing && !existing.isDraft) {
        setAlreadySub(true)
        setOverallRating(existing.overallRating)
        setRecommendation(existing.recommendation)
        setTechComments(existing.technicalComments ?? '')
        setGeneralComments(existing.comments ?? '')
        const sr: Record<string, number> = {}
        existing.skillRatings.forEach(s => { sr[s.skill] = s.rating })
        setSkillRatings(sr)
      }
    }

    setLoading(false)
  }, [candidateId, jobId])

  const handleSaveSchedule = () => {
    if (!schedDT || !candidateId || !jobId || !candidate) return
    const sched: InterviewSchedule = {
      id:            schedule?.id ?? uid(),
      jobId,
      jobTitle:      schedule?.jobTitle ?? jobId,
      candidateId,
      candidateName: candidate.name,
      stageId:       myRound?.id ?? 'round',
      stageName:     myRound?.title ?? 'Interview',
      dateTime:      new Date(schedDT).toISOString(),
      duration:      schedDur,
      type:          schedMode,
      panelMembers:  [panelMemberName],
      location:      '',
      meetingLink:   schedLink,
      notes:         schedNotes,
      status:        'SCHEDULED',
    }
    saveSchedule(sched)
    setSchedule(sched)
    setSchedOpen(false)
    setToast({ msg: 'Interview scheduled successfully', severity: 'success' })
  }

  const handleSubmitFeedback = async () => {
    if (!candidateId || !jobId || !recommendation || overallRating === 0) return
    setSaving(true)

    const sr: SkillRating[] = SKILLS_TO_RATE.map(s => ({
      skill: s, rating: skillRatings[s] ?? 0,
    }))

    const evaluation: Evaluation = {
      id:                  uid(),
      jobId,
      jobTitle:            schedule?.jobTitle ?? jobId,
      candidateId,
      candidateName:       candidate?.name ?? '',
      stageId:             myRound?.id ?? 'round',
      stageName:           myRound?.title ?? 'Interview',
      interviewRoundId:    myRound?.id,
      panelMember:         panelMemberName,
      submitterEmail:      user?.email ?? '',
      evaluationType:      'TECHNICAL',
      skillRatings:        sr,
      technicalComments:   techComments,
      behavioralComments:  '',
      communicationComments: '',
      overallRating,
      comments:            generalComments,
      recommendation:      recommendation as any,
      submittedAt:         new Date().toISOString(),
      isDraft:             false,
    }

    saveEvaluation(evaluation)
    setAlreadySub(true)
    setPrevEvals(prev => [...prev.filter(e => e.interviewRoundId !== myRound?.id), evaluation])
    setSaving(false)
    setToast({ msg: 'Feedback submitted successfully!', severity: 'success' })
  }

  if (loading) return (
    <Box display="flex" justifyContent="center" pt={8}>
      <CircularProgress sx={{ color: INDIGO }} />
    </Box>
  )

  if (!candidate) return (
    <Box textAlign="center" pt={8}>
      <Typography sx={{ color: TEXT2 }}>Candidate not found</Typography>
    </Box>
  )

  const schedDtObj = schedule ? new Date(schedule.dateTime) : null
  const isToday    = schedDtObj?.toDateString() === new Date().toDateString()

  // ── Shared card style ─────────────────────────────────────────────────────
  const cardSx = {
    bgcolor: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 2.5,
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  }

  return (
    <Box>
      {/* Back nav */}
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <Button
          startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
          onClick={() => navigate('/panel')}
          sx={{
            color: TEXT2, textTransform: 'none', fontSize: 13, fontWeight: 500,
            '&:hover': { color: INDIGO, bgcolor: `${INDIGO}08` },
          }}
        >
          My Interviews
        </Button>
      </Box>

      <Box display="flex" gap={3} alignItems="flex-start" flexWrap="wrap">

        {/* ── LEFT: Candidate profile ──────────────────────────────────────── */}
        <Box sx={{ width: { xs: '100%', md: 272 }, flexShrink: 0 }}>

          {/* Profile card */}
          <Paper elevation={0} sx={{ ...cardSx, p: 2.5, mb: 2 }}>
            <Box textAlign="center" mb={2.5}>
              <Avatar sx={{
                width: 68, height: 68, fontSize: 24, fontWeight: 800,
                mx: 'auto', mb: 1.5,
                background: `linear-gradient(135deg, ${INDIGO}, ${INDIGO_D})`,
                boxShadow: `0 4px 14px ${INDIGO}40`,
              }}>
                {candidate.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </Avatar>
              <Typography sx={{ fontWeight: 800, color: TEXT1, fontSize: 16, lineHeight: 1.25 }}>
                {candidate.name}
              </Typography>
              {candidate.role && (
                <Typography sx={{ fontSize: 12.5, color: TEXT2, mt: 0.4 }}>{candidate.role}</Typography>
              )}
            </Box>

            {/* ATS Score box */}
            <Box sx={{
              bgcolor: BG, borderRadius: 2, p: 1.75, mb: 2.5, textAlign: 'center',
              border: `1px solid ${BORDER}`,
            }}>
              <Typography sx={{ fontSize: 10, color: TEXT3, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.25 }}>
                ATS Match Score
              </Typography>
              <Typography sx={{
                fontSize: 34, fontWeight: 900, lineHeight: 1.1,
                color: scoreColor(candidate.atsScore),
              }}>
                {candidate.atsScore}%
              </Typography>
              <LinearProgress
                variant="determinate" value={candidate.atsScore}
                sx={{
                  height: 6, borderRadius: 99, mt: 1,
                  bgcolor: BORDER,
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${scoreColor(candidate.atsScore)}99, ${scoreColor(candidate.atsScore)})`,
                  },
                }}
              />
            </Box>

            {/* Contact */}
            <Box display="flex" flexDirection="column" gap={1}>
              {candidate.email && (
                <Box display="flex" alignItems="center" gap={1.25}>
                  <EmailOutlined sx={{ fontSize: 14, color: TEXT3, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 12.5, color: TEXT2, wordBreak: 'break-all', lineHeight: 1.4 }}>
                    {candidate.email}
                  </Typography>
                </Box>
              )}
              {candidate.phone && (
                <Box display="flex" alignItems="center" gap={1.25}>
                  <PhoneOutlined sx={{ fontSize: 14, color: TEXT3, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 12.5, color: TEXT2 }}>{candidate.phone}</Typography>
                </Box>
              )}
              {candidate.experience > 0 && (
                <Box display="flex" alignItems="center" gap={1.25}>
                  <WorkHistory sx={{ fontSize: 14, color: TEXT3, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 12.5, color: TEXT2 }}>{candidate.experience} yrs experience</Typography>
                </Box>
              )}
              {candidate.education && (
                <Box display="flex" alignItems="flex-start" gap={1.25}>
                  <School sx={{ fontSize: 14, color: TEXT3, flexShrink: 0, mt: 0.15 }} />
                  <Typography sx={{ fontSize: 12.5, color: TEXT2, lineHeight: 1.4 }}>{candidate.education}</Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Matched skills card */}
          <Paper elevation={0} sx={{ ...cardSx, p: 2.5 }}>
            <Typography sx={{
              fontSize: 10, fontWeight: 700, color: TEXT3,
              textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.5,
            }}>
              Matched Skills
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.75}>
              {candidate.matchedSkills?.length > 0
                ? candidate.matchedSkills.map(s => (
                  <Chip key={s} label={s} size="small" sx={{
                    height: 24, fontSize: 11, fontWeight: 500,
                    bgcolor: `${INDIGO}12`, color: INDIGO,
                    border: `1px solid ${INDIGO}30`, borderRadius: 1.5,
                  }} />
                ))
                : <Typography sx={{ fontSize: 12, color: TEXT3 }}>No skills data</Typography>
              }
            </Box>
          </Paper>
        </Box>

        {/* ── RIGHT: Interview details + Feedback form ─────────────────────── */}
        <Box flex={1} minWidth={0} display="flex" flexDirection="column" gap={2.5}>

          {/* Interview details card */}
          <Paper elevation={0} sx={{ ...cardSx, p: 2.5 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.25}>
              <Box display="flex" alignItems="center" gap={1.25}>
                <CalendarToday sx={{ fontSize: 16, color: INDIGO }} />
                <Typography sx={{ fontWeight: 700, color: TEXT1, fontSize: 14 }}>Interview Details</Typography>
              </Box>
              <Button
                size="small"
                startIcon={<EditCalendar sx={{ fontSize: 14 }} />}
                onClick={() => setSchedOpen(true)}
                variant="outlined"
                sx={{
                  fontSize: 12, textTransform: 'none', fontWeight: 600,
                  color: INDIGO, borderColor: `${INDIGO}40`,
                  '&:hover': { bgcolor: `${INDIGO}08`, borderColor: INDIGO },
                  py: 0.5, px: 1.5, borderRadius: 1.5,
                }}
              >
                {schedule ? 'Edit Schedule' : 'Schedule Interview'}
              </Button>
            </Box>

            {/* Assigned round badge */}
            {myRound && (
              <Box sx={{
                p: 1.75, borderRadius: 2,
                bgcolor: `${INDIGO}08`, border: `1px solid ${INDIGO}20`,
                mb: 2.25,
              }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: INDIGO,
                  textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Your Assigned Round
                </Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: TEXT1, mt: 0.4 }}>
                  {myRound.title}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: TEXT2, mt: 0.2 }}>
                  {myRound.type} Interview · Round {myRound.roundNumber}
                </Typography>
              </Box>
            )}

            {/* Schedule details grid */}
            {schedule ? (
              <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(150px, 1fr))" gap={1.5}>
                <Box sx={{ p: 1.75, bgcolor: BG, borderRadius: 2, border: `1px solid ${BORDER}` }}>
                  <Typography sx={{ fontSize: 10, color: TEXT3, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                    Date & Time
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700,
                    color: isToday ? '#16A34A' : TEXT1, lineHeight: 1.3 }}>
                    {isToday ? 'Today' : schedDtObj?.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: TEXT2, mt: 0.25 }}>
                    {schedDtObj?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {schedule.duration}m
                  </Typography>
                </Box>

                <Box sx={{ p: 1.75, bgcolor: BG, borderRadius: 2, border: `1px solid ${BORDER}` }}>
                  <Typography sx={{ fontSize: 10, color: TEXT3, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                    Format
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.75} mt={0.5}>
                    {schedule.type === 'VIDEO'
                      ? <VideoCall sx={{ color: INDIGO, fontSize: 18 }} />
                      : schedule.type === 'PHONE'
                      ? <Phone sx={{ color: INDIGO, fontSize: 18 }} />
                      : <LocationOn sx={{ color: INDIGO, fontSize: 18 }} />}
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: TEXT1 }}>
                      {schedule.type.replace('_', ' ')}
                    </Typography>
                  </Box>
                </Box>

                {schedule.meetingLink && (
                  <Box sx={{ p: 1.75, bgcolor: BG, borderRadius: 2, border: `1px solid ${BORDER}`,
                    gridColumn: 'span 2' }}>
                    <Typography sx={{ fontSize: 10, color: TEXT3, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                      Meeting Link
                    </Typography>
                    <Typography
                      component="a" href={schedule.meetingLink} target="_blank"
                      sx={{ fontSize: 12.5, color: INDIGO, textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' }, wordBreak: 'break-all', display: 'block', mt: 0.25 }}
                    >
                      {schedule.meetingLink}
                    </Typography>
                  </Box>
                )}

                {schedule.notes && (
                  <Box sx={{ p: 1.75, bgcolor: BG, borderRadius: 2, border: `1px solid ${BORDER}`,
                    gridColumn: 'span 2' }}>
                    <Typography sx={{ fontSize: 10, color: TEXT3, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                      Notes
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: TEXT2, lineHeight: 1.55 }}>
                      {schedule.notes}
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3, bgcolor: BG, borderRadius: 2,
                border: `1px dashed ${BORDER}` }}>
                <HourglassEmpty sx={{ fontSize: 36, color: TEXT3, mb: 1 }} />
                <Typography sx={{ fontSize: 13, color: TEXT2, fontWeight: 500 }}>
                  No interview scheduled yet
                </Typography>
                <Button size="small" onClick={() => setSchedOpen(true)}
                  sx={{ mt: 1, color: INDIGO, textTransform: 'none', fontSize: 12, fontWeight: 600 }}>
                  Schedule now →
                </Button>
              </Box>
            )}
          </Paper>

          {/* Submitted feedback (read-only) */}
          {prevEvals.length > 0 && alreadySub && (
            <Paper elevation={0} sx={{ ...cardSx, border: '1px solid #BBF7D0', p: 2.5 }}>
              <Box display="flex" alignItems="center" gap={1.25} mb={2.25}>
                <CheckCircle sx={{ fontSize: 16, color: '#16A34A' }} />
                <Typography sx={{ fontWeight: 700, color: TEXT1, fontSize: 14 }}>
                  Your Submitted Feedback
                </Typography>
                <Chip label="Submitted" size="small" sx={{
                  height: 20, fontSize: 10, fontWeight: 700,
                  bgcolor: '#DCFCE7', color: '#16A34A', border: '1px solid #BBF7D0',
                }} />
              </Box>

              {prevEvals.filter(e => !e.isDraft).slice(-1).map(ev => (
                <Box key={ev.id}>
                  <Box display="flex" flexDirection="column" gap={1.5} mb={2.25}>
                    {ev.skillRatings.map(sr => (
                      <Box key={sr.skill} display="flex" alignItems="center" gap={1}>
                        <Typography sx={{ fontSize: 12.5, color: TEXT2, minWidth: 150 }}>
                          {sr.skill}
                        </Typography>
                        <Rating value={sr.rating} readOnly size="small"
                          sx={{ '& .MuiRating-iconFilled': { color: INDIGO } }} />
                        <Typography sx={{ fontSize: 11, color: TEXT3, minWidth: 28, textAlign: 'right' }}>
                          {sr.rating}/5
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Divider sx={{ borderColor: BORDER, mb: 2 }} />

                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: TEXT3, mb: 0.25 }}>Overall Rating</Typography>
                      <Rating value={ev.overallRating} readOnly
                        sx={{ '& .MuiRating-iconFilled': { color: '#F59E0B' } }} />
                    </Box>
                    <Chip
                      icon={React.cloneElement(REC_CFG[ev.recommendation].icon as any,
                        { sx: { fontSize: '0.85rem !important' } })}
                      label={REC_CFG[ev.recommendation].label}
                      size="small"
                      sx={{
                        height: 26, fontSize: 11, fontWeight: 700, borderRadius: 1.5,
                        bgcolor: REC_CFG[ev.recommendation].color + '15',
                        color:   REC_CFG[ev.recommendation].color,
                        border:  `1px solid ${REC_CFG[ev.recommendation].color}35`,
                      }}
                    />
                  </Box>

                  {ev.comments && (
                    <Box sx={{ p: 1.75, bgcolor: BG, borderRadius: 1.5, border: `1px solid ${BORDER}` }}>
                      <Typography sx={{ fontSize: 12.5, color: TEXT2, lineHeight: 1.6 }}>
                        {ev.comments}
                      </Typography>
                    </Box>
                  )}

                  <Typography sx={{ fontSize: 10.5, color: TEXT3, mt: 1.5 }}>
                    Submitted {new Date(ev.submittedAt).toLocaleDateString()} at{' '}
                    {new Date(ev.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              ))}
            </Paper>
          )}

          {/* Feedback form */}
          {!alreadySub && (
            <Paper elevation={0} sx={{ ...cardSx, p: 2.5 }}>
              <Box display="flex" alignItems="center" gap={1.25} mb={2.5}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
                  background: `linear-gradient(135deg, ${INDIGO}, ${INDIGO_D})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <StarBorder sx={{ fontSize: 16, color: '#fff' }} />
                </Box>
                <Typography sx={{ fontWeight: 700, color: TEXT1, fontSize: 15 }}>
                  Submit Feedback
                </Typography>
              </Box>

              {/* Skill ratings */}
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: TEXT3,
                textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.5 }}>
                Skill Ratings
              </Typography>
              <Box display="flex" flexDirection="column" gap={1.5} mb={2.5}>
                {SKILLS_TO_RATE.map(skill => (
                  <Box key={skill} display="flex" alignItems="center" gap={1}>
                    <Typography sx={{ fontSize: 13, color: TEXT2, minWidth: 160 }}>
                      {skill}
                    </Typography>
                    <Rating
                      value={skillRatings[skill] ?? 0}
                      onChange={(_, v) => setSkillRatings(prev => ({ ...prev, [skill]: v ?? 0 }))}
                      sx={{ '& .MuiRating-iconFilled': { color: INDIGO } }}
                    />
                    <Typography sx={{ fontSize: 11, color: TEXT3, minWidth: 28, textAlign: 'right' }}>
                      {skillRatings[skill] ? `${skillRatings[skill]}/5` : '—'}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ borderColor: BORDER, mb: 2.5 }} />

              {/* Overall rating */}
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: TEXT1 }}>
                  Overall Rating *
                </Typography>
                <Box display="flex" alignItems="center" gap={1.25}>
                  <Rating value={overallRating} onChange={(_, v) => setOverallRating(v ?? 0)} size="large"
                    sx={{ '& .MuiRating-iconFilled': { color: '#F59E0B' } }} />
                  {overallRating > 0 && (
                    <Typography sx={{ fontSize: 12.5, color: '#D97706', fontWeight: 700 }}>
                      {overallRating}/5
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Technical assessment */}
              <TextField multiline rows={2} size="small" fullWidth
                label="Technical Assessment"
                placeholder="Describe technical strengths and areas for improvement…"
                value={techComments}
                onChange={e => setTechComments(e.target.value)}
                sx={{ mb: 2, ...fieldSx }}
              />

              {/* General comments */}
              <TextField multiline rows={2} size="small" fullWidth
                label="General Comments"
                placeholder="Any additional observations or feedback…"
                value={generalComments}
                onChange={e => setGeneralComments(e.target.value)}
                sx={{ mb: 2.5, ...fieldSx }}
              />

              {/* Recommendation */}
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: TEXT3,
                textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.5 }}>
                Recommendation *
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
                {(Object.keys(REC_CFG) as Array<keyof typeof REC_CFG>).map(r => {
                  const cfg = REC_CFG[r]
                  const sel = recommendation === r
                  return (
                    <Box
                      key={r}
                      onClick={() => setRecommendation(r)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 0.75,
                        px: 1.75, py: 1, borderRadius: 2,
                        border: `2px solid ${sel ? cfg.color : BORDER}`,
                        bgcolor: sel ? cfg.color + '12' : CARD,
                        cursor: 'pointer', transition: 'all 0.15s',
                        boxShadow: sel ? `0 2px 8px ${cfg.color}25` : 'none',
                        '&:hover': {
                          borderColor: cfg.color + '80',
                          bgcolor: cfg.color + '08',
                        },
                      }}
                    >
                      <Box sx={{ color: sel ? cfg.color : TEXT3, display: 'flex', fontSize: 16 }}>
                        {cfg.icon}
                      </Box>
                      <Typography sx={{
                        fontSize: 12.5, fontWeight: sel ? 700 : 500,
                        color: sel ? cfg.color : TEXT2,
                      }}>
                        {cfg.label}
                      </Typography>
                    </Box>
                  )
                })}
              </Box>

              <Button
                variant="contained" fullWidth size="large"
                disabled={saving || !recommendation || overallRating === 0}
                onClick={handleSubmitFeedback}
                sx={{
                  fontWeight: 700, textTransform: 'none', fontSize: 14.5,
                  py: 1.5, borderRadius: 2,
                  background: recommendation
                    ? `linear-gradient(135deg, ${INDIGO}, ${INDIGO_D})`
                    : BORDER,
                  boxShadow: recommendation ? `0 6px 20px ${INDIGO}35` : 'none',
                  '&.Mui-disabled': { bgcolor: BORDER, color: TEXT3 },
                  '&:hover': { background: recommendation ? `linear-gradient(135deg, ${INDIGO_D}, #3730A3)` : BORDER },
                }}
              >
                {saving
                  ? <><CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.7)', mr: 1 }} />Submitting…</>
                  : 'Submit Feedback'}
              </Button>
            </Paper>
          )}
        </Box>
      </Box>

      {/* ── Schedule dialog ──────────────────────────────────────────────────── */}
      <Dialog open={schedOpen} onClose={() => setSchedOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: CARD, border: `1px solid ${BORDER}`, borderRadius: 2.5,
          boxShadow: '0 20px 60px rgba(0,0,0,0.14)' } }}>
        <DialogTitle sx={{ fontWeight: 700, color: TEXT1, fontSize: 15,
          borderBottom: `1px solid ${BORDER}`, pb: 1.75 }}>
          {schedule ? 'Edit Interview Schedule' : 'Schedule Interview'}
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField type="datetime-local" size="small" label="Date & Time *" fullWidth
            value={schedDT} onChange={e => setSchedDT(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={fieldSx} />

          <FormControl size="small" fullWidth>
            <InputLabel sx={{ color: TEXT2, '&.Mui-focused': { color: INDIGO } }}>Format</InputLabel>
            <Select value={schedMode} onChange={e => setSchedMode(e.target.value as any)} label="Format"
              sx={{
                bgcolor: BG, color: TEXT1,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: `${INDIGO}60` },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: INDIGO },
              }}>
              <MenuItem value="VIDEO">Video Call</MenuItem>
              <MenuItem value="IN_PERSON">In Person</MenuItem>
              <MenuItem value="PHONE">Phone</MenuItem>
            </Select>
          </FormControl>

          <TextField size="small" label="Duration (minutes)" type="number" fullWidth
            value={schedDur} onChange={e => setSchedDur(Number(e.target.value))}
            sx={fieldSx} />

          {schedMode === 'VIDEO' && (
            <TextField size="small" label="Meeting Link" fullWidth value={schedLink}
              onChange={e => setSchedLink(e.target.value)}
              placeholder="https://meet.google.com/…"
              sx={fieldSx} />
          )}

          <TextField size="small" label="Notes" fullWidth multiline rows={2}
            value={schedNotes} onChange={e => setSchedNotes(e.target.value)}
            placeholder="Any preparation notes for the candidate…"
            sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: `1px solid ${BORDER}`, pt: 1.75 }}>
          <Button onClick={() => setSchedOpen(false)}
            sx={{ color: TEXT2, textTransform: 'none', '&:hover': { color: TEXT1 } }}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!schedDT} onClick={handleSaveSchedule}
            sx={{
              textTransform: 'none', fontWeight: 700, borderRadius: 1.5,
              background: `linear-gradient(135deg, ${INDIGO}, ${INDIGO_D})`,
              boxShadow: `0 4px 14px ${INDIGO}35`,
              '&:hover': { background: `linear-gradient(135deg, ${INDIGO_D}, #3730A3)` },
            }}>
            Save Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast?.severity ?? 'success'} onClose={() => setToast(null)}
          sx={{ fontSize: 13, borderRadius: 2 }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
