import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip,
  TextField, Table, TableHead, TableBody, TableRow, TableCell,
  TableSortLabel, TablePagination, Avatar, Tooltip, InputAdornment,
  ToggleButtonGroup, ToggleButton, TableContainer, IconButton,
  Snackbar, Alert,
} from '@mui/material'
import {
  AssignmentTurnedIn, HourglassTop, EventAvailable, CheckCircleOutline,
  Search, AccountTree, CalendarMonth, OpenInNew, Person,
  CheckCircle, TrendingUp, WorkspacePremium, Block, Groups, Refresh,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@hooks/redux'
import { fetchJobs } from '@store/jobsSlice'
import {
  loadSchedules, loadEvaluations, loadPipeline,
  InterviewRound, InterviewSchedule, PipelineCandidate,
  PipelineStage, DEFAULT_STAGES,
} from '@utils/pipelineStorage'
import CandidateDetailModal, { CandidateModalData } from '@components/CandidateDetailModal'

// ── Exact admin dashboard tokens ──────────────────────────────────────────────
const NAVY    = '#F8FAFC'
const NAVY_MID= '#FFFFFF'
const NAVY_LT = '#E2E8F0'
const ORANGE  = '#6366F1'
const TEXT1   = '#1E293B'
const TEXT2   = '#64748B'

// Stage type → color (matches dashboard STAGE_COLOR)
const STAGE_COLOR: Record<string, string> = {
  shortlist: '#38BDF8',
  round:     '#A78BFA',
  offer:     '#22C55E',
  hired:     '#0F766E',
  rejected:  '#EF4444',
}

// Stage type → filter button colors (matches AllPipelinePage)
const STAGE_FILTER_COLORS: Record<string, string> = {
  shortlist: '#2563EB',
  round:     '#7C3AED',
  offer:     '#16A34A',
  hired:     '#0F766E',
  rejected:  '#EF4444',
}

const STAGE_TYPE_LABEL: Record<string, string> = {
  shortlist: 'Shortlisted',
  round:     'Interview Rounds',
  offer:     'Offer Stage',
  hired:     'Hired',
  rejected:  'Rejected',
}

const STAGE_TYPE_ICON: Record<string, React.ReactNode> = {
  shortlist: <CheckCircle sx={{ fontSize: 14 }} />,
  round:     <Groups sx={{ fontSize: 14 }} />,
  offer:     <WorkspacePremium sx={{ fontSize: 14 }} />,
  hired:     <TrendingUp sx={{ fontSize: 14 }} />,
  rejected:  <Block sx={{ fontSize: 14 }} />,
}

function scoreColor(s: number) {
  return s >= 80 ? '#22C55E' : s >= 60 ? '#F59E0B' : '#EF4444'
}

// ── Shared table header style ─────────────────────────────────────────────────
const SH = {
  bgcolor: NAVY,
  borderBottom: `1px solid ${NAVY_LT}`,
  fontSize: '0.68rem',
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  py: 1.25,
  whiteSpace: 'nowrap' as const,
}

// ── MiniProgress — exact copy from DashboardPage ──────────────────────────────
const MiniProgress: React.FC<{ stages: PipelineStage[]; currentStageId: string }> = ({ stages, currentStageId }) => {
  const vis  = stages.filter(s => s.type !== 'rejected')
  const curI = vis.findIndex(s => s.id === currentStageId)
  return (
    <Box display="flex" alignItems="center" gap="3px">
      {vis.map((s, i) => (
        <Tooltip key={s.id} title={s.label} arrow>
          <Box sx={{
            width: i === curI ? 10 : 6, height: i === curI ? 10 : 6,
            borderRadius: '50%', flexShrink: 0,
            bgcolor: i < curI ? '#334155' : i === curI ? s.color : '#CBD5E1',
            border: i === curI ? `2px solid ${s.color}` : 'none',
          }} />
        </Tooltip>
      ))}
    </Box>
  )
}

// ── KPI card — exact copy from DashboardPage ──────────────────────────────────
const KPI: React.FC<{ label: string; value: number|string; icon: React.ReactNode; color: string; sub?: string }> =
  ({ label, value, icon, color, sub }) => (
  <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2, height: '100%' }}>
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color, fontSize: '1.75rem', lineHeight: 1.1, mt: 0.5 }}>
            {value}
          </Typography>
          {sub && <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.62rem' }}>{sub}</Typography>}
        </Box>
        <Box sx={{ color, opacity: 0.2, mt: 0.5 }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
)

// ── Types ──────────────────────────────────────────────────────────────────────
interface AssignedRow {
  round:       InterviewRound
  candidate:   PipelineCandidate
  jobId:       string
  jobTitle:    string
  jobCode?:    string
  stages:      PipelineStage[]
  stageId:     string
  stageLabel:  string
  stageType:   string
  schedule?:   InterviewSchedule
  hasFeedback: boolean
}

interface PipelineRow {
  candidateId:   string
  name:          string
  email:         string
  role:          string
  atsScore:      number
  matchedSkills: string[]
  addedAt:       string
  jobId:         string
  jobCode?:      string
  jobTitle:      string
  stageId:       string
  stageLabel:    string
  stageColor:    string
  stageType:     string
  stages:        PipelineStage[]
}

type SortKey = 'name' | 'atsScore' | 'jobTitle' | 'stageLabel'
type SortDir = 'asc'  | 'desc'

// ── Main component ─────────────────────────────────────────────────────────────
export default function PanelMemberPage() {
  const navigate        = useNavigate()
  const dispatch        = useAppDispatch()
  const { user, organizationId } = useAppSelector(s => s.auth)
  const { jobs }        = useAppSelector(s => s.jobs)

  const [myRows,      setMyRows]      = useState<AssignedRow[]>([])
  const [today,       setToday]       = useState<InterviewSchedule[]>([])
  const [loading,     setLoading]     = useState(true)
  const [viewData,    setViewData]    = useState<CandidateModalData | null>(null)
  const [toast,       setToast]       = useState<string | null>(null)

  // My Assignments table state
  const [mySearch,  setMySearch]  = useState('')
  const [mySortKey, setMySortKey] = useState<SortKey>('atsScore')
  const [mySortDir, setMySortDir] = useState<SortDir>('desc')

  // Pipeline tab state
  const [pipeSearch,      setPipeSearch]      = useState('')
  const [pipeStageFilter, setPipeStageFilter] = useState<string>('ALL')
  const [pipePage,        setPipePage]        = useState(0)
  const [pipeRpp,         setPipeRpp]         = useState(20)

  const panelMemberId   = user?.panelMemberId ?? ''
  const panelMemberName = user ? `${user.firstName} ${user.lastName}` : ''

  // ── Load "My Assignments" ─────────────────────────────────────────────────
  const reload = useCallback(() => {
    if (!user) return

    const allRoundsRaw: InterviewRound[] = JSON.parse(
      localStorage.getItem('hs_interview_rounds') ?? '[]'
    )
    const myRounds = allRoundsRaw.filter(r =>
      r.assignedPanelMemberIds?.includes(panelMemberId) ||
      r.assignedPanelMemberNames?.some(n =>
        n.toLowerCase() === panelMemberName.toLowerCase()
      )
    )

    const allSchedules = loadSchedules()
    const allEvals = loadEvaluations().filter(e =>
      e.submitterEmail === user.email ||
      e.panelMember?.toLowerCase() === panelMemberName.toLowerCase()
    )

    // Enrich with pipeline + job data
    const built: AssignedRow[] = []
    myRounds.forEach(r => {
      const pl        = loadPipeline(r.jobId)
      const stages    = pl.stages.length ? pl.stages : DEFAULT_STAGES
      const candidate = pl.candidates.find(c => c.id === r.candidateId)
      if (!candidate) return
      const stageId   = pl.stageMap[candidate.id] ?? stages[0]?.id ?? 'shortlisted'
      const stage     = stages.find(s => s.id === stageId) ?? stages[0]
      const job       = jobs.find(j => String(j.id) === r.jobId)
      const schedule  = allSchedules.find(s => s.candidateId === r.candidateId && s.jobId === r.jobId)
      const hasFeedback = allEvals.some(e => e.interviewRoundId === r.id)

      built.push({
        round: r, candidate,
        jobId: r.jobId,
        jobTitle:   job?.title ?? schedule?.jobTitle ?? r.jobId,
        jobCode:    job?.jobCode,
        stages,
        stageId,
        stageLabel: stage?.label ?? stageId,
        stageType:  stage?.type  ?? 'shortlist',
        schedule,
        hasFeedback,
      })
    })

    // Today's schedule
    const todayStr    = new Date().toDateString()
    const mySchedules = allSchedules.filter(s =>
      s.panelMembers?.some(pm =>
        pm.toLowerCase().includes(panelMemberName.split(' ')[0].toLowerCase())
      )
    )
    setToday(
      mySchedules.filter(s => new Date(s.dateTime).toDateString() === todayStr)
        .sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime))
    )
    setMyRows(built)
    setLoading(false)
  }, [user, jobs])

  useEffect(() => { reload() }, [reload])

  // Fetch jobs from the same API the admin dashboard uses
  useEffect(() => {
    if (organizationId && organizationId !== 'local') {
      dispatch(fetchJobs({ organizationId, page: 0, size: 100 }))
    }
  }, [organizationId, dispatch])

  // ── Pipeline rows — identical to DashboardPage.rebuild() ─────────────────
  const allPipelineRows = useMemo<PipelineRow[]>(() => {
    const rows: PipelineRow[] = []
    jobs.forEach(job => {
      const pl     = loadPipeline(String(job.id))
      const stages: PipelineStage[] = pl.stages.length ? pl.stages : DEFAULT_STAGES
      pl.candidates.forEach(c => {
        const sid   = pl.stageMap[c.id] ?? stages[0]?.id ?? 'shortlisted'
        const stage = stages.find(s => s.id === sid) ?? stages[0]
        if (stage?.type === 'rejected') return
        rows.push({
          candidateId:   c.id, name: c.name, email: c.email ?? '',
          role: c.role ?? '', atsScore: c.atsScore ?? 0,
          matchedSkills: c.matchedSkills ?? [], addedAt: c.addedAt ?? '',
          jobId: String(job.id), jobCode: job.jobCode, jobTitle: job.title,
          stageId:     sid,
          stageLabel:  stage?.label ?? 'Unknown',
          stageColor:  STAGE_COLOR[stage?.type ?? 'shortlist'] ?? ORANGE,
          stageType:   stage?.type  ?? 'shortlist',
          stages,
        })
      })
    })
    return rows
  }, [jobs])

  const pipeCounts = useMemo(() => {
    const c: Record<string, number> = { ALL: allPipelineRows.length }
    allPipelineRows.forEach(r => { c[r.stageType] = (c[r.stageType] ?? 0) + 1 })
    return c
  }, [allPipelineRows])

  const filteredPipeline = useMemo(() => {
    const q = pipeSearch.toLowerCase().trim()
    return allPipelineRows.filter(r => {
      const matchStage  = pipeStageFilter === 'ALL' || r.stageType === pipeStageFilter
      const matchSearch = !q || r.name.toLowerCase().includes(q)
        || r.email.toLowerCase().includes(q) || r.role.toLowerCase().includes(q)
        || r.jobTitle.toLowerCase().includes(q)
      return matchStage && matchSearch
    })
  }, [allPipelineRows, pipeStageFilter, pipeSearch])

  const paginatedPipeline = useMemo(
    () => filteredPipeline.slice(pipePage * pipeRpp, (pipePage + 1) * pipeRpp),
    [filteredPipeline, pipePage, pipeRpp]
  )

  // ── My Assignments sort + filter ──────────────────────────────────────────
  const filteredMy = useMemo(() => {
    const q = mySearch.toLowerCase()
    let rows = myRows.filter(r => !q
      || r.candidate.name.toLowerCase().includes(q)
      || r.candidate.email?.toLowerCase().includes(q)
      || r.jobTitle.toLowerCase().includes(q)
    )
    return [...rows].sort((a, b) => {
      const va: any = mySortKey === 'name'       ? a.candidate.name
                    : mySortKey === 'atsScore'    ? a.candidate.atsScore
                    : mySortKey === 'jobTitle'    ? a.jobTitle
                    : a.stageLabel
      const vb: any = mySortKey === 'name'       ? b.candidate.name
                    : mySortKey === 'atsScore'    ? b.candidate.atsScore
                    : mySortKey === 'jobTitle'    ? b.jobTitle
                    : b.stageLabel
      if (typeof va === 'number') return mySortDir === 'asc' ? va - vb : vb - va
      return mySortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va))
    })
  }, [myRows, mySearch, mySortKey, mySortDir])

  const handleMySort = (k: SortKey) => {
    if (mySortKey === k) setMySortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setMySortKey(k); setMySortDir('desc') }
  }

  const SL = { sx: { color: '#475569 !important', '& .MuiTableSortLabel-icon': { color: '#475569 !important' } } }

  // ── Open modal ────────────────────────────────────────────────────────────
  const openPipelineDetail = useCallback((row: PipelineRow) => {
    const pl = loadPipeline(row.jobId)
    const c  = pl.candidates.find(c => c.id === row.candidateId)
    if (c) setViewData({ pipelineCandidate: c, jobId: row.jobId, jobTitle: row.jobTitle })
    else   setViewData({ analysisId: row.candidateId, jobId: row.jobId, jobTitle: row.jobTitle })
  }, [])

  const openMyDetail = (row: AssignedRow) => {
    setViewData({ pipelineCandidate: row.candidate, jobId: row.jobId, jobTitle: row.jobTitle })
  }

  const pipeFilterTabs = [
    { value: 'ALL',       label: 'All',          color: ORANGE },
    { value: 'shortlist', label: 'Shortlisted',  color: STAGE_FILTER_COLORS.shortlist },
    { value: 'round',     label: 'In Interview', color: STAGE_FILTER_COLORS.round },
    { value: 'offer',     label: 'Offer Stage',  color: STAGE_FILTER_COLORS.offer },
    { value: 'hired',     label: 'Hired',        color: STAGE_FILTER_COLORS.hired },
    { value: 'rejected',  label: 'Rejected',     color: STAGE_FILTER_COLORS.rejected },
  ]

  const pending  = myRows.filter(r => !r.hasFeedback).length
  const done     = myRows.filter(r => r.hasFeedback).length
  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <Box>
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: TEXT1 }}>
            {greeting}, {user?.firstName}
          </Typography>
          <Typography variant="caption" sx={{ color: TEXT2 }}>
            {myRows.length} assigned · {today.length} today · {allPipelineRows.length} in pipeline
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip label="Panel Member" size="small" sx={{
            height: 22, fontSize: '0.7rem', fontWeight: 700,
            bgcolor: `${ORANGE}18`, color: ORANGE, border: `1px solid ${ORANGE}35`,
          }} />
          <Button size="small" variant="outlined" startIcon={<Refresh />}
            onClick={reload}
            sx={{ borderColor: NAVY_LT, color: TEXT2, '&:hover': { borderColor: ORANGE, color: ORANGE } }}>
            Refresh
          </Button>
          <Button size="small" variant="outlined" startIcon={<CalendarMonth sx={{ fontSize: 15 }} />}
            onClick={() => navigate('/calendar')}
            sx={{ borderColor: NAVY_LT, color: TEXT2, '&:hover': { borderColor: ORANGE, color: ORANGE } }}>
            Calendar
          </Button>
        </Box>
      </Box>

      {/* ── KPI row ─────────────────────────────────────────────────────────── */}
      <Grid container spacing={1.5} mb={3}>
        {[
          { label: 'My Assignments',     value: myRows.length,  color: ORANGE,     icon: <AssignmentTurnedIn sx={{ fontSize: 32 }} />, sub: 'Interview rounds' },
          { label: 'Pending Feedback',   value: pending,        color: '#F59E0B',  icon: <HourglassTop       sx={{ fontSize: 32 }} />, sub: 'Awaiting your review' },
          { label: "Today's Interviews", value: today.length,   color: '#22C55E',  icon: <EventAvailable     sx={{ fontSize: 32 }} />, sub: 'Scheduled today' },
          { label: 'Completed Reviews',  value: done,           color: '#0891B2',  icon: <CheckCircleOutline sx={{ fontSize: 32 }} />, sub: 'Feedback submitted' },
          { label: 'Total in Pipeline',  value: allPipelineRows.length, color: '#7C3AED', icon: <AccountTree  sx={{ fontSize: 32 }} />, sub: 'All active candidates' },
        ].map(k => (
          <Grid item xs={6} sm={4} md key={k.label}><KPI {...k} /></Grid>
        ))}
      </Grid>

      {/* ── Today's schedule ────────────────────────────────────────────────── */}
      {today.length > 0 && (
        <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2, mb: 2.5 }}>
          <Box px={2} py={1.5} sx={{ borderBottom: `1px solid ${NAVY_LT}` }}
            display="flex" alignItems="center" gap={1}>
            <EventAvailable sx={{ color: '#22C55E', fontSize: 18 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: TEXT1 }}>Today's Schedule</Typography>
            <Chip label={today.length} size="small"
              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#22C55E18', color: '#22C55E' }} />
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': SH }}>
                  <TableCell>Time</TableCell>
                  <TableCell>Candidate</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell>Job</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {today.map(s => {
                  const dt = new Date(s.dateTime)
                  return (
                    <TableRow key={s.id} sx={{
                      borderBottom: `1px solid ${NAVY_LT}`, '&:last-child td': { border: 'none' },
                      '&:hover': { bgcolor: '#F8FAFC' },
                    }}>
                      <TableCell sx={{ py: 1.25, whiteSpace: 'nowrap' }}>
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#22C55E' }}>
                          {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        <Typography sx={{ fontSize: '0.62rem', color: TEXT2 }}>{s.duration}m</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', fontWeight: 700, bgcolor: NAVY_LT, flexShrink: 0 }}>
                            {s.candidateName.split(' ').map(w => w[0]).slice(0, 2).join('')}
                          </Avatar>
                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: TEXT1 }}>
                            {s.candidateName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Typography sx={{ fontSize: '0.72rem', color: TEXT2 }}>{s.stageName}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Typography sx={{ fontSize: '0.72rem', color: TEXT1, fontWeight: 600 }}>{s.jobTitle}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Chip label={s.type.replace('_', ' ')} size="small"
                          sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, bgcolor: NAVY, color: TEXT2 }} />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.25 }}>
                        <Box display="flex" alignItems="center" justifyContent="center" gap={0.75}>
                          {s.meetingLink && (
                            <Button size="small" component="a" href={s.meetingLink} target="_blank"
                              sx={{ fontSize: '0.62rem', py: 0.25, px: 0.75,
                                borderColor: '#22C55E55', color: '#22C55E', border: '1px solid',
                                '&:hover': { bgcolor: '#22C55E11' } }}>
                              Join
                            </Button>
                          )}
                          <Button size="small" variant="outlined"
                            onClick={() => navigate(`/panel/candidate/${s.candidateId}/${s.jobId}`)}
                            sx={{ fontSize: '0.62rem', py: 0.25, px: 0.75,
                              borderColor: `${ORANGE}55`, color: ORANGE,
                              '&:hover': { bgcolor: `${ORANGE}11`, borderColor: ORANGE } }}>
                            Feedback
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}

      {/* ── My Assignments ───────────────────────────────────────────────────── */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <AssignmentTurnedIn sx={{ color: ORANGE, fontSize: 20 }} />
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: TEXT1 }}>My Assignments</Typography>
          <Chip label={myRows.length} size="small"
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: `${ORANGE}18`, color: ORANGE }} />
        </Box>
      </Box>

      <Box display="flex" gap={1.5} alignItems="center" mb={2}>
        <TextField size="small" placeholder="Search name, email or job…"
          value={mySearch} onChange={e => setMySearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: '1rem', color: '#475569' }} /></InputAdornment> }}
          sx={{ flex: 1,
            '& .MuiOutlinedInput-root': { fontSize: '0.8rem', bgcolor: NAVY_MID, borderRadius: 1.5 },
            '& fieldset': { borderColor: NAVY_LT } }} />
        <Typography variant="caption" sx={{ color: '#475569', flexShrink: 0 }}>
          {filteredMy.length} / {myRows.length} candidates
        </Typography>
      </Box>

      <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2, mb: 3 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': SH }}>
                <TableCell>
                  <TableSortLabel active={mySortKey==='name'} direction={mySortKey==='name'?mySortDir:'asc'}
                    onClick={() => handleMySort('name')} {...SL}>
                    Candidate
                  </TableSortLabel>
                </TableCell>
                <TableCell>Email</TableCell>
                <TableCell>
                  <TableSortLabel active={mySortKey==='jobTitle'} direction={mySortKey==='jobTitle'?mySortDir:'asc'}
                    onClick={() => handleMySort('jobTitle')} {...SL}>
                    Job
                  </TableSortLabel>
                </TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>
                  <TableSortLabel active={mySortKey==='stageLabel'} direction={mySortKey==='stageLabel'?mySortDir:'asc'}
                    onClick={() => handleMySort('stageLabel')} {...SL}>
                    Round / Stage
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel active={mySortKey==='atsScore'} direction={mySortKey==='atsScore'?mySortDir:'asc'}
                    onClick={() => handleMySort('atsScore')} {...SL}>
                    Score
                  </TableSortLabel>
                </TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell>Feedback</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMy.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6, color: '#334155', border: 'none' }}>
                    {myRows.length === 0
                      ? 'No candidates assigned to you — the HR team will assign interview rounds'
                      : 'No candidates match filters'}
                  </TableCell>
                </TableRow>
              ) : filteredMy.map(r => {
                const dt      = r.schedule ? new Date(r.schedule.dateTime) : null
                const isPast  = dt ? dt < new Date() : false
                const isToday = dt ? dt.toDateString() === new Date().toDateString() : false
                return (
                  <TableRow key={r.round.id}
                    onClick={() => openMyDetail(r)}
                    sx={{ borderBottom: `1px solid ${NAVY_LT}`, '&:last-child td': { border: 'none' },
                      cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFC' } }}>

                    {/* Candidate */}
                    <TableCell sx={{ py: 1.25 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', fontWeight: 700, bgcolor: NAVY_LT, flexShrink: 0 }}>
                          {r.candidate.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </Avatar>
                        <Box>
                          <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: TEXT1, lineHeight: 1.2 }}>
                              {r.candidate.name}
                            </Typography>
                            <Chip label={r.stageLabel} size="small" sx={{
                              height: 17, fontSize: '0.55rem', fontWeight: 700,
                              bgcolor: `${STAGE_COLOR[r.stageType] ?? '#94A3B8'}18`,
                              color: STAGE_COLOR[r.stageType] ?? '#94A3B8',
                            }} />
                          </Box>
                          {r.candidate.role && (
                            <Typography variant="caption" sx={{ fontSize: '0.62rem', color: TEXT2 }}>{r.candidate.role}</Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Email */}
                    <TableCell sx={{ fontSize: '0.72rem', color: TEXT2, py: 1.25, whiteSpace: 'nowrap' }}>
                      {r.candidate.email || '—'}
                    </TableCell>

                    {/* Job */}
                    <TableCell sx={{ py: 1.25 }}>
                      <Typography sx={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600,
                        maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.jobTitle}
                      </Typography>
                      {r.jobCode && (
                        <Typography sx={{ fontSize: '0.6rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                          {r.jobCode}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Progress */}
                    <TableCell sx={{ py: 1.25 }}>
                      <MiniProgress stages={r.stages} currentStageId={r.stageId} />
                    </TableCell>

                    {/* Stage */}
                    <TableCell sx={{ py: 1.25 }}>
                      <Typography sx={{ fontSize: '0.72rem', color: STAGE_COLOR[r.stageType] ?? '#94A3B8', fontWeight: 600 }}>
                        {r.stageLabel}
                      </Typography>
                      <Typography sx={{ fontSize: '0.6rem', color: '#94A3B8', mt: 0.2 }}>
                        {r.round.title}
                      </Typography>
                    </TableCell>

                    {/* Score */}
                    <TableCell align="right" sx={{ py: 1.25 }}>
                      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.75}>
                        <Box sx={{ width: 32, height: 4, borderRadius: 2, bgcolor: NAVY_LT, overflow: 'hidden' }}>
                          <Box sx={{ width: `${r.candidate.atsScore}%`, height: '100%', bgcolor: scoreColor(r.candidate.atsScore) }} />
                        </Box>
                        <Typography sx={{ fontWeight: 700, color: scoreColor(r.candidate.atsScore), fontSize: '0.72rem', minWidth: 22, textAlign: 'right' }}>
                          {r.candidate.atsScore}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Schedule */}
                    <TableCell sx={{ py: 1.25 }}>
                      {dt ? (
                        <Box>
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 600,
                            color: isToday ? '#22C55E' : isPast ? '#94A3B8' : TEXT1 }}>
                            {isToday ? 'Today' : dt.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </Typography>
                          <Typography sx={{ fontSize: '0.6rem', color: TEXT2 }}>
                            {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: '0.65rem', color: '#94A3B8' }}>Not set</Typography>
                      )}
                    </TableCell>

                    {/* Feedback */}
                    <TableCell sx={{ py: 1.25 }}>
                      {r.hasFeedback
                        ? <Chip label="Submitted" size="small" sx={{ height: 17, fontSize: '0.55rem', fontWeight: 700, bgcolor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }} />
                        : <Chip label="Pending"   size="small" sx={{ height: 17, fontSize: '0.55rem', fontWeight: 700, bgcolor: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }} />
                      }
                    </TableCell>

                    {/* Action */}
                    <TableCell align="center" sx={{ py: 1.25 }}>
                      <Button size="small" variant="outlined"
                        onClick={e => { e.stopPropagation(); navigate(`/panel/candidate/${r.candidate.id}/${r.jobId}`) }}
                        sx={{ fontSize: '0.62rem', py: 0.25, px: 0.75, borderColor: `${ORANGE}55`, color: ORANGE,
                          '&:hover': { bgcolor: `${ORANGE}11`, borderColor: ORANGE }, whiteSpace: 'nowrap' }}>
                        {r.hasFeedback ? 'View' : 'Give Feedback'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {/* ── In Pipeline ──────────────────────────────────────────────────────── */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <AccountTree sx={{ color: ORANGE, fontSize: 20 }} />
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: TEXT1 }}>In Pipeline</Typography>
          <Chip label={allPipelineRows.length} size="small"
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: `${ORANGE}18`, color: ORANGE }} />
        </Box>
      </Box>

      {/* Stage summary chips */}
      <Box display="flex" gap={1.5} mb={2} flexWrap="wrap">
        {pipeFilterTabs.slice(1).map(t => (
          <Box key={t.value} onClick={() => { setPipeStageFilter(t.value); setPipePage(0) }}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              px: 2, py: 1.25, borderRadius: 2, cursor: 'pointer', transition: 'all 0.15s',
              bgcolor: pipeStageFilter === t.value ? t.color + '0D' : NAVY_MID,
              border: `1.5px solid ${pipeStageFilter === t.value ? t.color : NAVY_LT}`,
              '&:hover': { borderColor: t.color, bgcolor: t.color + '08' },
            }}>
            <Box sx={{ color: t.color, display: 'flex', alignItems: 'center' }}>
              {STAGE_TYPE_ICON[t.value]}
            </Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: TEXT1 }}>{t.label}</Typography>
            <Chip label={pipeCounts[t.value] ?? 0} size="small"
              sx={{ height: 18, fontSize: 10, fontWeight: 700, borderRadius: 1,
                bgcolor: t.color + '15', color: t.color }} />
          </Box>
        ))}
      </Box>

      {/* Search + toggle */}
      <Box display="flex" gap={1.5} alignItems="center" mb={2} flexWrap="wrap">
        <TextField size="small" placeholder="Search name, role, email, or job…"
          value={pipeSearch} onChange={e => { setPipeSearch(e.target.value); setPipePage(0) }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: '1rem', color: '#475569' }} /></InputAdornment> }}
          sx={{ flex: 1, minWidth: 220,
            '& .MuiOutlinedInput-root': { fontSize: '0.8rem', bgcolor: NAVY_MID, borderRadius: 1.5 },
            '& fieldset': { borderColor: NAVY_LT } }} />
        <ToggleButtonGroup value={pipeStageFilter} exclusive size="small"
          onChange={(_, val) => { setPipeStageFilter(val ?? 'ALL'); setPipePage(0) }}>
          {pipeFilterTabs.map(t => (
            <ToggleButton key={t.value} value={t.value}
              sx={{
                fontSize: 12, textTransform: 'none', fontWeight: 600, px: 1.5, py: 0.6, color: TEXT2,
                '&.Mui-selected': { bgcolor: t.color + '15', color: t.color, borderColor: t.color + '40', fontWeight: 700 },
              }}>
              {t.label}
              {pipeCounts[t.value] !== undefined && (
                <Box component="span" sx={{
                  ml: 0.75, fontSize: 10, fontWeight: 700, px: 0.6, py: 0.1, borderRadius: 0.75,
                  bgcolor: pipeStageFilter === t.value ? t.color + '20' : '#94A3B820',
                  color:   pipeStageFilter === t.value ? t.color : '#94A3B8',
                }}>
                  {pipeCounts[t.value]}
                </Box>
              )}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Typography variant="caption" sx={{ color: '#475569', flexShrink: 0 }}>
          {filteredPipeline.length} / {allPipelineRows.length} candidates
        </Typography>
      </Box>

      <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': SH }}>
                <TableCell>Candidate</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Job</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Round / Stage</TableCell>
                <TableCell align="right">Score</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedPipeline.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: '#334155', border: 'none' }}>
                    {allPipelineRows.length === 0
                      ? 'No candidates in any pipeline yet'
                      : 'No candidates match filters'}
                  </TableCell>
                </TableRow>
              ) : paginatedPipeline.map(row => (
                <TableRow key={`${row.jobId}_${row.candidateId}`}
                  onClick={() => openPipelineDetail(row)}
                  sx={{ borderBottom: `1px solid ${NAVY_LT}`, '&:last-child td': { border: 'none' },
                    cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFC' } }}>

                  <TableCell sx={{ py: 1.25 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', fontWeight: 700, bgcolor: NAVY_LT, flexShrink: 0 }}>
                        {row.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </Avatar>
                      <Box>
                        <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: TEXT1, lineHeight: 1.2 }}>
                            {row.name}
                          </Typography>
                          <Chip label={row.stageLabel} size="small" sx={{
                            height: 17, fontSize: '0.55rem', fontWeight: 700,
                            bgcolor: `${row.stageColor}18`, color: row.stageColor,
                          }} />
                        </Box>
                        {row.role && (
                          <Typography variant="caption" sx={{ fontSize: '0.62rem', color: TEXT2 }}>{row.role}</Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell sx={{ fontSize: '0.72rem', color: TEXT2, py: 1.25, whiteSpace: 'nowrap' }}>
                    {row.email || '—'}
                  </TableCell>

                  <TableCell sx={{ py: 1.25 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600,
                      maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.jobTitle}
                    </Typography>
                    {row.jobCode && (
                      <Typography sx={{ fontSize: '0.6rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                        {row.jobCode}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell sx={{ py: 1.25 }}>
                    <MiniProgress stages={row.stages} currentStageId={row.stageId} />
                  </TableCell>

                  <TableCell sx={{ py: 1.25 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: row.stageColor, fontWeight: 600 }}>
                      {row.stageLabel}
                    </Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: '#94A3B8', mt: 0.2 }}>
                      {STAGE_TYPE_LABEL[row.stageType] ?? row.stageType}
                    </Typography>
                  </TableCell>

                  <TableCell align="right" sx={{ py: 1.25 }}>
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.75}>
                      <Box sx={{ width: 32, height: 4, borderRadius: 2, bgcolor: NAVY_LT, overflow: 'hidden' }}>
                        <Box sx={{ width: `${row.atsScore}%`, height: '100%', bgcolor: scoreColor(row.atsScore) }} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, color: scoreColor(row.atsScore), fontSize: '0.72rem', minWidth: 22, textAlign: 'right' }}>
                        {row.atsScore}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell align="center" sx={{ py: 1.25 }} onClick={e => e.stopPropagation()}>
                    <Tooltip title="View profile">
                      <IconButton size="small" onClick={() => openPipelineDetail(row)}
                        sx={{ color: ORANGE, '&:hover': { bgcolor: `${ORANGE}10` } }}>
                        <OpenInNew sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        <TablePagination
          component="div"
          count={filteredPipeline.length}
          page={pipePage}
          rowsPerPage={pipeRpp}
          rowsPerPageOptions={[10, 20, 50]}
          onPageChange={(_, p) => setPipePage(p)}
          onRowsPerPageChange={e => { setPipeRpp(parseInt(e.target.value)); setPipePage(0) }}
          sx={{ borderTop: `1px solid ${NAVY_LT}`, fontSize: '0.75rem',
            '& .MuiTablePagination-toolbar': { minHeight: 44 },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.75rem' } }}
        />
      </Card>

      {/* Modal */}
      <CandidateDetailModal open={!!viewData} data={viewData} onClose={() => setViewData(null)} />

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)}>{toast}</Alert>
      </Snackbar>
    </Box>
  )
}
