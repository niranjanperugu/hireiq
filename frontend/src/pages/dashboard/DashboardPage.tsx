import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@hooks/redux'
import { fetchJobs } from '@store/jobsSlice'
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Table, TableHead, TableBody, TableRow, TableCell, TableSortLabel, TablePagination,
  Avatar, Tooltip, Snackbar, Alert, InputAdornment, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material'
import {
  WorkOutline, PeopleAlt, CheckCircleOutline, HourglassTop,
  EmojiEvents, PersonSearch, Search, Refresh, AccountTree,
  PersonAddAlt1, ExpandMore, ExpandLess, Link
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import {
  loadPipeline, loadSchedules, loadEvaluations,
  savePipeline, PipelineCandidate, PipelineStage
} from '@utils/pipelineStorage'
import apiClient from '@services/apiClient'
import CandidateDetailModal, { CandidateModalData } from '@components/CandidateDetailModal'

const NAVY    = '#F8FAFC'
const NAVY_MID= '#FFFFFF'
const NAVY_LT = '#E2E8F0'
const ORANGE  = '#6366F1'
const TEXT1   = '#1E293B'
const TEXT2   = '#64748B'

const MiniProgress: React.FC<{ stages: PipelineStage[]; currentStageId: string }> = ({ stages, currentStageId }) => {
  const vis  = stages.filter(s => s.type !== 'rejected')
  const curI = vis.findIndex(s => s.id === currentStageId)
  return (
    <Box display="flex" alignItems="center" gap="3px">
      {vis.map((s, i) => (
        <Tooltip key={s.id} title={s.label} arrow>
          <Box sx={{
            width: i === curI ? 10 : 6, height: i === curI ? 10 : 6, borderRadius: '50%', flexShrink: 0,
            bgcolor: i < curI ? '#334155' : i === curI ? s.color : '#1E2D40',
            border: i === curI ? `2px solid ${s.color}` : 'none',
          }} />
        </Tooltip>
      ))}
    </Box>
  )
}

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

interface AggRow {
  candidate: PipelineCandidate
  jobId: string
  jobTitle: string
  stages: PipelineStage[]
  currentStageId: string
  currentStageLabel: string
  stageType: string
}

interface AppliedRow {
  id: string
  candidateName: string
  email: string
  phone: string
  currentRole: string | null
  atsScore: number
  rating: string
  matchedSkills: string[]
  yearsOfExperience: number
  jobId: string
  jobTitle: string
  isApplied: boolean
  source?: string
}

type SortKey = 'name' | 'atsScore' | 'jobTitle' | 'currentStageLabel'
type SortDir = 'asc'  | 'desc'

const STAGE_COLOR: Record<string, string> = {
  shortlist: '#38BDF8', round: '#A78BFA', offer: '#22C55E', hired: '#0F766E', rejected: '#EF4444'
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { organizationId } = useAppSelector(s => s.auth)
  const { jobs }           = useAppSelector(s => s.jobs)

  const [all,     setAll]     = useState<AggRow[]>([])
  const [applied, setApplied] = useState<AppliedRow[]>([])
  const [showApplied, setShowApplied] = useState(true)
  const [search,  setSearch]  = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('atsScore')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [toast,   setToast]   = useState<string|null>(null)

  // Shortlist modal
  interface ShortlistTarget { row: AppliedRow; subject: string; body: string }
  const [shortlistTarget, setShortlistTarget] = useState<ShortlistTarget | null>(null)
  const [shortlistSending, setShortlistSending] = useState(false)
  const [viewData, setViewData] = useState<CandidateModalData | null>(null)

  // Applied section filters + pagination
  const [appliedSearch,   setAppliedSearch]   = useState('')
  const [appliedJob,      setAppliedJob]      = useState('ALL')
  const [appliedMinScore, setAppliedMinScore] = useState(0)
  const [appliedPage,     setAppliedPage]     = useState(0)
  const [appliedRpp,      setAppliedRpp]      = useState(10)

  const rebuild = () => {
    const rows: AggRow[] = []
    jobs.forEach(job => {
      const pl = loadPipeline(String(job.id))
      pl.candidates.forEach(c => {
        const sid   = pl.stageMap[c.id] ?? pl.stages[0]?.id ?? ''
        const stage = pl.stages.find(s => s.id === sid)
        rows.push({ candidate: c, jobId: String(job.id), jobTitle: job.title,
          stages: pl.stages, currentStageId: sid,
          currentStageLabel: stage?.label ?? 'Unknown', stageType: stage?.type ?? 'shortlist' })
      })
    })
    setAll(rows)
  }

  const fetchApplied = useCallback(async () => {
    if (!jobs.length) return
    try {
      const results = await Promise.allSettled(
        jobs.map(j =>
          apiClient.get<AppliedRow[]>(`/resume-analysis/job/${j.id}/applied`)
            .then(r => r.data.map(d => ({ ...d, jobId: String(j.id), jobTitle: j.title })))
        )
      )
      const rows: AppliedRow[] = []
      results.forEach(r => { if (r.status === 'fulfilled') rows.push(...r.value) })
      setApplied(rows)
    } catch { /* silent */ }
  }, [jobs])

  useEffect(() => { if (organizationId) dispatch(fetchJobs({ organizationId, page: 0, size: 50 })) }, [organizationId, dispatch])
  useEffect(() => { rebuild() }, [jobs])
  useEffect(() => { fetchApplied() }, [fetchApplied])

  const schedules   = useMemo(() => loadSchedules(),   [all])
  const evaluations = useMemo(() => loadEvaluations(), [all])

  const kpis = useMemo(() => ({
    openVacancies:       jobs.filter(j => j.status === 'OPEN').length,
    totalProfiles:       all.length + applied.length,
    completedInterviews: schedules.filter(s => s.status === 'COMPLETED').length,
    inRounds:            all.filter(r => r.stageType === 'round').length,
    hired:               all.filter(r => r.stageType === 'hired').length,
    pendingEval:         schedules.filter(s => s.status === 'SCHEDULED' &&
                           !evaluations.find(e => e.candidateId === s.candidateId)).length,
  }), [all, applied, schedules, evaluations, jobs])

  // Emails already in the pipeline — used to exclude them from "Applied" section
  const pipelineEmails = useMemo(() =>
    new Set(all.map(r => r.candidate.email?.toLowerCase()).filter(Boolean) as string[]),
    [all]
  )

  // Applied candidates NOT already in any pipeline
  const appliedNotInPipeline = useMemo(() =>
    applied.filter(r => !pipelineEmails.has((r.email || '').toLowerCase())),
    [applied, pipelineEmails]
  )

  // Unique jobs present in applied list (for Job filter dropdown)
  const appliedJobs = useMemo(() => {
    const seen = new Map<string, string>()
    appliedNotInPipeline.forEach(r => { if (!seen.has(r.jobId)) seen.set(r.jobId, r.jobTitle) })
    return [...seen.entries()].map(([id, title]) => ({ id, title }))
  }, [appliedNotInPipeline])

  // Filtered applied candidates
  const filteredApplied = useMemo(() => {
    let rows = appliedNotInPipeline
    if (appliedSearch) {
      const q = appliedSearch.toLowerCase()
      rows = rows.filter(r =>
        r.candidateName.toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.currentRole || '').toLowerCase().includes(q)
      )
    }
    if (appliedJob      !== 'ALL') rows = rows.filter(r => r.jobId    === appliedJob)
    if (appliedMinScore > 0)       rows = rows.filter(r => r.atsScore >= appliedMinScore)
    return rows
  }, [appliedNotInPipeline, appliedSearch, appliedJob, appliedMinScore])

  const paginatedApplied = useMemo(() =>
    filteredApplied.slice(appliedPage * appliedRpp, (appliedPage + 1) * appliedRpp),
    [filteredApplied, appliedPage, appliedRpp]
  )

  // Pipeline search filter (sort only, no complex filters)
  const filtered = useMemo(() => {
    let rows = all
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(r =>
        r.candidate.name.toLowerCase().includes(q) ||
        r.candidate.email?.toLowerCase().includes(q) ||
        r.candidate.role?.toLowerCase().includes(q))
    }
    return [...rows].sort((a, b) => {
      const va: any = sortKey === 'name' ? a.candidate.name : sortKey === 'atsScore' ? a.candidate.atsScore : sortKey === 'jobTitle' ? a.jobTitle : a.currentStageLabel
      const vb: any = sortKey === 'name' ? b.candidate.name : sortKey === 'atsScore' ? b.candidate.atsScore : sortKey === 'jobTitle' ? b.jobTitle : b.currentStageLabel
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
  }, [all, search, sortKey, sortDir])

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('desc') }
  }

  const promoteAll = () => {
    const passedSet = new Set(
      evaluations.filter(e => e.recommendation === 'ADVANCE').map(e => `${e.candidateId}_${e.jobId}`)
    )
    const byJob: Record<string, AggRow[]> = {}
    all.forEach(r => { (byJob[r.jobId] ??= []).push(r) })
    let count = 0
    Object.entries(byJob).forEach(([jobId, rows]) => {
      const pl = loadPipeline(jobId); let changed = false
      rows.forEach(r => {
        if (!passedSet.has(`${r.candidate.id}_${jobId}`)) return
        const ci = pl.stages.findIndex(s => s.id === r.currentStageId)
        const next = pl.stages.slice(ci + 1).find(s => s.type !== 'rejected')
        if (next) { pl.stageMap[r.candidate.id] = next.id; changed = true; count++ }
      })
      if (changed) savePipeline(jobId, pl)
    })
    rebuild()
    setToast(count > 0 ? `${count} candidate${count > 1 ? 's' : ''} promoted to next round` : 'No ADVANCE evaluations found')
  }

  const addToPipeline = (row: AppliedRow) => {
    const pl    = loadPipeline(row.jobId)
    const first = pl.stages[0]
    if (!first) { setToast('No pipeline stages configured for this job'); return }
    if (pl.candidates.find(c => c.email === row.email)) {
      setToast(`${row.candidateName} is already in the pipeline`); return
    }
    const newCand: PipelineCandidate = {
      id:           `applied_${row.id}`,
      name:         row.candidateName,
      email:        row.email,
      phone:        row.phone,
      role:         row.currentRole ?? '',
      atsScore:     row.atsScore,
      matchedSkills:row.matchedSkills ?? [],
      experience:   row.yearsOfExperience,
      education:    '',
      source:       'analysis',
      addedAt:      new Date().toISOString(),
    }
    pl.candidates.push(newCand)
    pl.stageMap[newCand.id] = first.id
    savePipeline(row.jobId, pl)
    rebuild()
    setToast(`${row.candidateName} added to pipeline → ${first.label}`)
  }

  const openShortlist = (row: AppliedRow) => {
    const subject = `Your application for ${row.jobTitle} has been shortlisted`
    const body = `Dear ${row.candidateName},

We are pleased to inform you that your application for the position of ${row.jobTitle} has been reviewed and you have been shortlisted for the next stage of our hiring process.

Your profile impressed our team and we believe you are a strong candidate for this role. Our HR team will be in touch shortly to discuss the next steps, which may include a technical assessment or an interview.

In the meantime, if you have any questions, please feel free to reach out to us.

We look forward to speaking with you!

Best regards,
HireIQ Recruitment Team`
    setShortlistTarget({ row, subject, body })
  }

  const handleShortlistConfirm = async () => {
    if (!shortlistTarget) return
    const { row, subject, body } = shortlistTarget
    setShortlistSending(true)
    try {
      await apiClient.post('/notifications/shortlist', {
        email:    row.email,
        name:     row.candidateName,
        jobTitle: row.jobTitle,
        subject,
        body,
      })
    } catch {
      // email failure is non-blocking — still add to pipeline
    }
    addToPipeline(row)
    setShortlistTarget(null)
    setShortlistSending(false)
    setToast(`${row.candidateName} shortlisted and email sent`)
  }

  const copyApplyLink = (jobId: string) => {
    const url = `${window.location.origin}/apply/${jobId}`
    navigator.clipboard.writeText(url).then(() => setToast('Apply link copied to clipboard!'))
  }

  const scoreColor = (s: number) => s >= 80 ? '#22C55E' : s >= 60 ? '#F59E0B' : '#EF4444'

  const SH = {
    bgcolor: NAVY, borderBottom: `1px solid ${NAVY_LT}`,
    fontSize: '0.68rem', fontWeight: 700, color: '#475569',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    py: 1.25, whiteSpace: 'nowrap' as const
  }
  const SL = { sx: { color: '#475569 !important', '& .MuiTableSortLabel-icon': { color: '#475569 !important' } } }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>HR Dashboard</Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            {all.length} pipeline · {applied.length} applied · {jobs.length} jobs
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button size="small" variant="outlined" startIcon={<Refresh />} onClick={rebuild}
            sx={{ borderColor: NAVY_LT, color: '#64748B', '&:hover': { borderColor: ORANGE, color: ORANGE } }}>
            Refresh
          </Button>
          <Button size="small" variant="contained" onClick={promoteAll}
            sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#4338CA' }, fontWeight: 700 }}>
            Promote Passed Candidates
          </Button>
        </Box>
      </Box>

      {/* KPI row */}
      <Grid container spacing={1.5} mb={3}>
        {[
          { label: 'Open Vacancies',      value: kpis.openVacancies,       color: '#38BDF8', icon: <WorkOutline        sx={{ fontSize: 32 }} />, sub: 'Active job posts' },
          { label: 'Total Profiles',       value: kpis.totalProfiles,       color: ORANGE,    icon: <PeopleAlt          sx={{ fontSize: 32 }} />, sub: 'In all pipelines' },
          { label: 'Completed Interviews', value: kpis.completedInterviews, color: '#22C55E', icon: <CheckCircleOutline sx={{ fontSize: 32 }} />, sub: 'Done this cycle' },
          { label: 'In Interview Rounds',  value: kpis.inRounds,           color: '#A78BFA', icon: <HourglassTop        sx={{ fontSize: 32 }} />, sub: 'Active in rounds' },
          { label: 'Hired',                value: kpis.hired,              color: '#0F766E', icon: <EmojiEvents         sx={{ fontSize: 32 }} />, sub: 'Offer accepted' },
          { label: 'Pending Evaluation',   value: kpis.pendingEval,        color: '#F59E0B', icon: <PersonSearch         sx={{ fontSize: 32 }} />, sub: 'Awaiting feedback' },
        ].map(k => (
          <Grid item xs={6} sm={4} md={2} key={k.label}><KPI {...k} /></Grid>
        ))}
      </Grid>

      {/* In Pipeline heading */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <AccountTree sx={{ color: ORANGE, fontSize: 20 }}/>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#1E293B' }}>
            In Pipeline
          </Typography>
          <Chip label={all.length} size="small"
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: `${ORANGE}18`, color: ORANGE }}/>
        </Box>
      </Box>

      {/* Pipeline search */}
      <Box display="flex" gap={1.5} alignItems="center" mb={2}>
        <TextField size="small" placeholder="Search name, email or role…"
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: '1rem', color: '#475569' }} /></InputAdornment> }}
          sx={{ flex: 1,
            '& .MuiOutlinedInput-root': { fontSize: '0.8rem', bgcolor: NAVY_MID, borderRadius: 1.5 },
            '& fieldset': { borderColor: NAVY_LT } }} />
        <Typography variant="caption" sx={{ color: '#475569', flexShrink: 0 }}>
          {filtered.length} / {all.length} candidates
        </Typography>
      </Box>

      {/* Pipeline Table */}
      <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': SH }}>
                <TableCell><TableSortLabel active={sortKey==='name'} direction={sortKey==='name'?sortDir:'asc'} onClick={()=>handleSort('name')} {...SL}>Candidate</TableSortLabel></TableCell>
                <TableCell>Email</TableCell>
                <TableCell><TableSortLabel active={sortKey==='jobTitle'} direction={sortKey==='jobTitle'?sortDir:'asc'} onClick={()=>handleSort('jobTitle')} {...SL}>Job</TableSortLabel></TableCell>
                <TableCell>Progress</TableCell>
                <TableCell><TableSortLabel active={sortKey==='currentStageLabel'} direction={sortKey==='currentStageLabel'?sortDir:'asc'} onClick={()=>handleSort('currentStageLabel')} {...SL}>Round / Stage</TableSortLabel></TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right"><TableSortLabel active={sortKey==='atsScore'} direction={sortKey==='atsScore'?sortDir:'asc'} onClick={()=>handleSort('atsScore')} {...SL}>Score</TableSortLabel></TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6, color: '#334155', border: 'none' }}>
                    {all.length === 0 ? 'No candidates in any pipeline — go to Jobs → Hiring Pipeline to add candidates' : 'No candidates match filters'}
                  </TableCell>
                </TableRow>
              ) : filtered.map(r => {
                const analysisId = r.candidate.id.startsWith('applied_')
                  ? r.candidate.id.replace('applied_', '') : undefined
                return (
                  <TableRow key={`${r.candidate.id}_${r.jobId}`}
                    onClick={() => setViewData(analysisId
                      ? { analysisId, jobId: r.jobId, jobTitle: r.jobTitle }
                      : { pipelineCandidate: r.candidate, jobId: r.jobId, jobTitle: r.jobTitle }
                    )}
                    sx={{ borderBottom: `1px solid ${NAVY_LT}`, '&:last-child td': { border: 'none' },
                      cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFC' } }}>

                    <TableCell sx={{ py: 1.25 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', fontWeight: 700, bgcolor: NAVY_LT, flexShrink: 0 }}>
                          {r.candidate.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#1E293B', lineHeight: 1.2 }}>
                            {r.candidate.name}
                          </Typography>
                          {r.candidate.role && (
                            <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#64748B' }}>{r.candidate.role}</Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ fontSize: '0.72rem', color: '#64748B', py: 1.25, whiteSpace: 'nowrap' }}>
                      {r.candidate.email || '—'}
                    </TableCell>

                    <TableCell sx={{ py: 1.25 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.jobTitle}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ py: 1.25 }}>
                      <MiniProgress stages={r.stages} currentStageId={r.currentStageId} />
                    </TableCell>

                    <TableCell sx={{ py: 1.25 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.72rem', color: STAGE_COLOR[r.stageType] ?? '#94A3B8', fontWeight: 600 }}>
                        {r.currentStageLabel}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ py: 1.25 }}>
                      <Chip label={r.stageType.toUpperCase()} size="small" sx={{
                        height: 18, fontSize: '0.58rem', fontWeight: 700,
                        bgcolor: `${STAGE_COLOR[r.stageType] ?? '#94A3B8'}20`,
                        color: STAGE_COLOR[r.stageType] ?? '#94A3B8'
                      }} />
                    </TableCell>

                    <TableCell align="right" sx={{ py: 1.25 }}>
                      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.75}>
                        <Box sx={{ width: 32, height: 4, borderRadius: 2, bgcolor: NAVY_LT, overflow: 'hidden' }}>
                          <Box sx={{ width: `${r.candidate.atsScore}%`, height: '100%', bgcolor: scoreColor(r.candidate.atsScore) }} />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: scoreColor(r.candidate.atsScore), fontSize: '0.72rem', minWidth: 22, textAlign: 'right' }}>
                          {r.candidate.atsScore}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell align="center" sx={{ py: 1.25 }}>
                      <Button size="small" variant="outlined" startIcon={<AccountTree sx={{ fontSize: '0.7rem !important' }} />}
                        onClick={e => { e.stopPropagation(); navigate(`/jobs/${r.jobId}/pipeline`) }}
                        sx={{ fontSize: '0.62rem', py: 0.25, px: 0.75, borderColor: `${ORANGE}55`, color: ORANGE,
                          '&:hover': { bgcolor: `${ORANGE}11`, borderColor: ORANGE } }}>
                        Pipeline
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {/* Applied Candidates - excluding those already in pipeline */}
      <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2, mt: 3 }}>
        <Box
          display="flex" alignItems="center" justifyContent="space-between"
          px={2} py={1.5} sx={{ cursor: 'pointer', borderBottom: showApplied ? `1px solid ${NAVY_LT}` : 'none' }}
          onClick={() => setShowApplied(v => !v)}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1E293B' }}>
              Applied Candidates
            </Typography>
            <Chip label={appliedNotInPipeline.length} size="small"
              sx={{ height: 18, fontSize: '0.65rem', bgcolor: `${ORANGE}22`, color: ORANGE, fontWeight: 700 }} />
            <Chip label={`${appliedNotInPipeline.filter(r => r.source === 'HR_ANALYZED').length} imported by HR`} size="small"
              sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }} />
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {jobs.filter(j => j.status === 'OPEN').slice(0, 3).map(j => (
              <Tooltip key={j.id} title={`Copy apply link for: ${j.title}`} arrow>
                <Chip
                  label={j.title}
                  size="small"
                  icon={<Link sx={{ fontSize: '0.7rem !important' }} />}
                  onClick={e => { e.stopPropagation(); copyApplyLink(String(j.id)) }}
                  sx={{ height: 20, fontSize: '0.62rem', bgcolor: NAVY_LT, color: '#64748B',
                    '&:hover': { bgcolor: `${ORANGE}22`, color: ORANGE } }}
                />
              </Tooltip>
            ))}
            <IconButton size="small" sx={{ color: '#475569' }}>
              {showApplied ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          </Box>
        </Box>
        {showApplied && (
          <>
            {/* Applied filters */}
            <Box px={2} py={1.5} sx={{ borderBottom: `1px solid ${NAVY_LT}`, bgcolor: '#FAFBFC' }}>
              <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center">
                <TextField size="small" placeholder="Search name, email, role…"
                  value={appliedSearch}
                  onChange={e => { setAppliedSearch(e.target.value); setAppliedPage(0) }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: '1rem', color: '#475569' }} /></InputAdornment> }}
                  sx={{ flex: 1, minWidth: 160,
                    '& .MuiOutlinedInput-root': { fontSize: '0.8rem' },
                    '& fieldset': { borderColor: NAVY_LT } }} />

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel sx={{ fontSize: '0.78rem' }}>Job</InputLabel>
                  <Select value={appliedJob} label="Job"
                    onChange={e => { setAppliedJob(e.target.value); setAppliedPage(0) }}
                    sx={{ fontSize: '0.78rem', '& fieldset': { borderColor: NAVY_LT } }}>
                    <MenuItem value="ALL" sx={{ fontSize: '0.78rem' }}>All Jobs</MenuItem>
                    {appliedJobs.map(j => (
                      <MenuItem key={j.id} value={j.id} sx={{ fontSize: '0.78rem' }}>{j.title}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField size="small" label="Min Score" type="number"
                  value={appliedMinScore || ''}
                  onChange={e => { setAppliedMinScore(Number(e.target.value) || 0); setAppliedPage(0) }}
                  inputProps={{ min: 0, max: 100 }}
                  sx={{ width: 95, '& .MuiOutlinedInput-root': { fontSize: '0.78rem' }, '& fieldset': { borderColor: NAVY_LT } }} />

                <Typography variant="caption" sx={{ color: '#475569', ml: 'auto', flexShrink: 0 }}>
                  {filteredApplied.length} / {appliedNotInPipeline.length}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': SH }}>
                  <TableCell>Candidate</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Job Applied For</TableCell>
                  <TableCell>Experience</TableCell>
                  <TableCell>Matched Skills</TableCell>
                  <TableCell align="right">ATS Score</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredApplied.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: '#334155', border: 'none' }}>
                      {appliedNotInPipeline.length === 0 && applied.length > 0
                        ? 'All applicants are already in the pipeline.'
                        : appliedNotInPipeline.length === 0
                        ? "No applications yet. Copy a job's apply link and share it with candidates."
                        : 'No results match your filters.'}
                    </TableCell>
                  </TableRow>
                ) : paginatedApplied.map(row => (
                  <TableRow key={row.id}
                    onClick={() => setViewData({ analysisId: row.id, jobId: row.jobId, jobTitle: row.jobTitle })}
                    sx={{ borderBottom: `1px solid ${NAVY_LT}`, '&:last-child td': { border: 'none' },
                      cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFC' } }}>

                    <TableCell sx={{ py: 1.25 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#1E3A5F', flexShrink: 0 }}>
                          {row.candidateName.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#1E293B', lineHeight: 1.2 }}>
                            {row.candidateName}
                          </Typography>
                          {row.currentRole && (
                            <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#64748B' }}>{row.currentRole}</Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ py: 1.25 }}>
                      {row.source === 'HR_ANALYZED'
                        ? <Chip label="Imported by HR" size="small"
                            sx={{ height: 19, fontSize: '0.58rem', fontWeight: 700,
                              bgcolor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}/>
                        : <Chip label="Applied Externally" size="small"
                            sx={{ height: 19, fontSize: '0.58rem', fontWeight: 700,
                              bgcolor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}/>
                      }
                    </TableCell>

                    <TableCell sx={{ py: 1.25 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                        {row.jobTitle}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ fontSize: '0.72rem', color: '#94A3B8', py: 1.25 }}>
                      {row.yearsOfExperience ? `${row.yearsOfExperience} yrs` : '—'}
                    </TableCell>

                    <TableCell sx={{ py: 1.25 }}>
                      <Box display="flex" gap={0.5} flexWrap="wrap" maxWidth={200}>
                        {(row.matchedSkills ?? []).slice(0, 4).map((s: string) => (
                          <Chip key={s} label={s} size="small"
                            sx={{ height: 16, fontSize: '0.58rem', bgcolor: `${ORANGE}15`, color: ORANGE }} />
                        ))}
                        {(row.matchedSkills ?? []).length > 4 && (
                          <Typography variant="caption" sx={{ color: '#475569', alignSelf: 'center' }}>
                            +{row.matchedSkills.length - 4}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell align="right" sx={{ py: 1.25 }}>
                      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.75}>
                        <Box sx={{ width: 32, height: 4, borderRadius: 2, bgcolor: NAVY_LT, overflow: 'hidden' }}>
                          <Box sx={{ width: `${row.atsScore}%`, height: '100%', bgcolor: scoreColor(row.atsScore) }} />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: scoreColor(row.atsScore), fontSize: '0.72rem', minWidth: 26, textAlign: 'right' }}>
                          {Math.round(row.atsScore)}%
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell align="center" sx={{ py: 1.25 }}>
                      <Button size="small" variant="outlined" startIcon={<PersonAddAlt1 sx={{ fontSize: '0.7rem !important' }} />}
                        onClick={e => { e.stopPropagation(); openShortlist(row) }}
                        sx={{ fontSize: '0.62rem', py: 0.25, px: 0.75, borderColor: '#6366F144', color: '#6366F1',
                          '&:hover': { bgcolor: '#6366F111', borderColor: '#6366F1' }, whiteSpace: 'nowrap' }}>
                        Shortlist
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </Box>
            <TablePagination
              component="div"
              count={filteredApplied.length}
              page={appliedPage}
              onPageChange={(_, p) => setAppliedPage(p)}
              rowsPerPage={appliedRpp}
              onRowsPerPageChange={e => { setAppliedRpp(parseInt(e.target.value)); setAppliedPage(0) }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              sx={{ borderTop: `1px solid ${NAVY_LT}`, fontSize: '0.75rem',
                '& .MuiTablePagination-toolbar': { minHeight: 44 },
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.75rem' } }}
            />
          </>
        )}
      </Card>

      {/* Candidate detail modal */}
      {viewData && (
        <CandidateDetailModal
          open={!!viewData}
          data={viewData}
          onClose={() => setViewData(null)}
        />
      )}

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ bgcolor: '#111827', color: '#22C55E' }}>
          {toast}
        </Alert>
      </Snackbar>

      {/* Shortlist email modal */}
      <Dialog open={!!shortlistTarget} onClose={() => !shortlistSending && setShortlistTarget(null)}
        maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', borderBottom: '1px solid #E2E8F0', pb: 1.5 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <PersonAddAlt1 sx={{ color: '#6366F1', fontSize: '1.15rem' }} />
            Shortlist Candidate
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {shortlistTarget && (
            <Box display="flex" flexDirection="column" gap={2}>
              <Box sx={{ bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 1.5, px: 2, py: 1.25 }}>
                <Typography sx={{ fontSize: '0.82rem', color: '#166534' }}>
                  <strong>{shortlistTarget.row.candidateName}</strong> will be moved to the hiring pipeline and the following email will be sent to <strong>{shortlistTarget.row.email}</strong>.
                </Typography>
              </Box>
              <TextField
                label="Subject"
                size="small"
                fullWidth
                value={shortlistTarget.subject}
                onChange={e => setShortlistTarget(t => t ? { ...t, subject: e.target.value } : t)}
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.84rem' } }}
              />
              <TextField
                label="Email Body"
                size="small"
                fullWidth
                multiline
                rows={10}
                value={shortlistTarget.body}
                onChange={e => setShortlistTarget(t => t ? { ...t, body: e.target.value } : t)}
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem', fontFamily: 'inherit' } }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid #E2E8F0', pt: 1.5, gap: 1 }}>
          <Button onClick={() => setShortlistTarget(null)} disabled={shortlistSending}
            sx={{ textTransform: 'none', color: '#64748B' }}>
            Cancel
          </Button>
          <Button variant="outlined"
            onClick={() => { if (shortlistTarget) { addToPipeline(shortlistTarget.row); setShortlistTarget(null) } }}
            disabled={shortlistSending}
            sx={{ textTransform: 'none', borderColor: '#CBD5E1', color: '#475569' }}>
            Shortlist Only
          </Button>
          <Button variant="contained" onClick={handleShortlistConfirm} disabled={shortlistSending}
            startIcon={shortlistSending ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <PersonAddAlt1 />}
            sx={{ bgcolor: '#6366F1', '&:hover': { bgcolor: '#4338CA' }, textTransform: 'none', fontWeight: 700, minWidth: 160 }}>
            {shortlistSending ? 'Sending...' : 'Shortlist & Send Email'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DashboardPage
