import React, { useState, useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@hooks/redux'
import { fetchJobs } from '@store/jobsSlice'
import {
  Box, Typography, Card, CardContent, Grid, Avatar, Chip, Button,
  TextField, InputAdornment, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, IconButton, Checkbox, Tooltip,
  Snackbar, Alert, Divider, FormControl, Select, MenuItem, InputLabel,
  ToggleButtonGroup, ToggleButton, Badge
} from '@mui/material'
import {
  Search, Close, GroupAdd, Check, FilterList, People, Work,
  Mail, VerifiedUser, Business, CheckCircle, Cancel, AssignmentInd
} from '@mui/icons-material'
import {
  loadPipeline, savePanelAssignment, removePanelAssignment,
  loadPanelAssignments, loadPanelMembers,
  PanelMember, PanelAssignment, PipelineCandidate
} from '@utils/pipelineStorage'

const NAVY     = '#F8FAFC'
const NAVY_MID = '#FFFFFF'
const NAVY_LT  = '#E2E8F0'
const ORANGE   = '#6366F1'

const DEPT_COLORS: Record<string, string> = {
  'Engineering':       '#2563EB',
  'Infrastructure':    '#0891B2',
  'AI & Data':         '#7C3AED',
  'Security':          '#DC2626',
  'Human Resources':   '#DB2777',
  'Quality Assurance': '#059669',
  'Leadership':        '#D97706',
  'Product':           '#16A34A',
}

interface AggCandidate {
  candidate: PipelineCandidate
  jobId: string
  jobTitle: string
  stageName: string
  stageType: string
}

// ── Member Card ───────────────────────────────────────────────────────────────
const MemberCard: React.FC<{
  member: PanelMember
  selected: boolean
  onClick: () => void
  compact?: boolean
}> = ({ member, selected, onClick, compact = false }) => {
  const initials = member.name.split(' ').map(w => w[0]).slice(0, 2).join('')
  const deptColor = DEPT_COLORS[member.department] ?? '#475569'
  return (
    <Card onClick={onClick} sx={{
      bgcolor: selected ? `${member.avatarColor}18` : NAVY,
      border: `1px solid ${selected ? member.avatarColor : NAVY_LT}`,
      borderRadius: 2, cursor: 'pointer', transition: 'all 0.15s',
      '&:hover': { borderColor: member.avatarColor, bgcolor: `${member.avatarColor}12` },
      position: 'relative',
    }}>
      {selected && (
        <Box sx={{ position: 'absolute', top: 6, right: 6 }}>
          <CheckCircle sx={{ fontSize: '0.85rem', color: member.avatarColor }} />
        </Box>
      )}
      <CardContent sx={{ p: compact ? 1.25 : 1.75, '&:last-child': { pb: compact ? 1.25 : 1.75 } }}>
        <Box display="flex" alignItems="center" gap={compact ? 1 : 1.25}>
          <Avatar sx={{ width: compact ? 32 : 38, height: compact ? 32 : 38, bgcolor: member.avatarColor, fontSize: compact ? '0.7rem' : '0.8rem', fontWeight: 800, flexShrink: 0 }}>
            {initials}
          </Avatar>
          <Box minWidth={0}>
            <Typography sx={{ fontWeight: 700, color: '#1E293B', fontSize: compact ? '0.72rem' : '0.8rem', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {member.name}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: compact ? '0.6rem' : '0.65rem', display: 'block', lineHeight: 1.3 }}>
              {member.position}
            </Typography>
            {!compact && (
              <Chip label={member.department} size="small" sx={{ mt: 0.5, height: 14, fontSize: '0.55rem', bgcolor: `${deptColor}22`, color: deptColor, fontWeight: 700 }} />
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// ── Assign Dialog ─────────────────────────────────────────────────────────────
const AssignDialog: React.FC<{
  open: boolean
  candidate: AggCandidate | null
  allMembers: PanelMember[]
  currentIds: string[]
  onSave: (memberIds: string[]) => void
  onClose: () => void
}> = ({ open, candidate, allMembers, currentIds, onSave, onClose }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search,   setSearch]   = useState('')
  const [deptFilt, setDeptFilt] = useState('ALL')

  useEffect(() => {
    if (open) { setSelected(new Set(currentIds)); setSearch(''); setDeptFilt('ALL') }
  }, [open, currentIds])

  const depts = useMemo(() => ['ALL', ...Array.from(new Set(allMembers.map(m => m.department)))], [allMembers])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allMembers.filter(m =>
      (deptFilt === 'ALL' || m.department === deptFilt) &&
      (!q || m.name.toLowerCase().includes(q) || m.position.toLowerCase().includes(q))
    )
  }, [allMembers, search, deptFilt])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (!candidate) return null
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 3, backgroundImage: 'none', maxHeight: '90vh' } }}>

      {/* Header */}
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ bgcolor: NAVY, px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${NAVY_LT}` }}>
          <AssignmentInd sx={{ color: ORANGE, fontSize: '1.2rem' }} />
          <Box flex={1}>
            <Typography sx={{ fontWeight: 700, color: '#1E293B', fontSize: '0.95rem' }}>
              Assign Interviewers
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              {candidate.candidate.name} · {candidate.jobTitle} · {candidate.stageName}
            </Typography>
          </Box>
          <Chip label={`${selected.size} selected`} size="small"
            sx={{ bgcolor: `${ORANGE}22`, color: ORANGE, fontWeight: 700, fontSize: '0.68rem' }} />
          <IconButton onClick={onClose} size="small" sx={{ color: '#475569' }}><Close /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Filters */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${NAVY_LT}`, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField size="small" placeholder="Search members…" value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: '0.9rem', color: '#475569' }} /></InputAdornment> }}
            sx={{ flex: 1, minWidth: 160, '& .MuiOutlinedInput-root': { fontSize: '0.78rem' }, '& fieldset': { borderColor: NAVY_LT } }} />

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ fontSize: '0.78rem' }}>Department</InputLabel>
            <Select value={deptFilt} label="Department" onChange={e => setDeptFilt(e.target.value)}
              sx={{ fontSize: '0.78rem', '& fieldset': { borderColor: NAVY_LT } }}>
              {depts.map(d => <MenuItem key={d} value={d} sx={{ fontSize: '0.78rem' }}>{d === 'ALL' ? 'All Departments' : d}</MenuItem>)}
            </Select>
          </FormControl>

          {selected.size > 0 && (
            <Button size="small" variant="text" onClick={() => setSelected(new Set())}
              sx={{ color: '#EF4444', fontSize: '0.72rem', '&:hover': { bgcolor: '#EF444411' } }}>
              Clear All
            </Button>
          )}
        </Box>

        {/* Members grid */}
        <Box sx={{ p: 2, overflowY: 'auto', maxHeight: 'calc(90vh - 280px)' }}>
          <Grid container spacing={1.25}>
            {filtered.map(m => (
              <Grid item xs={12} sm={6} md={4} key={m.id}>
                <MemberCard member={m} selected={selected.has(m.id)} onClick={() => toggle(m.id)} />
              </Grid>
            ))}
          </Grid>
          {filtered.length === 0 && (
            <Typography sx={{ color: '#334155', textAlign: 'center', py: 4, fontSize: '0.82rem' }}>
              No members match the search
            </Typography>
          )}
        </Box>

        {/* Selected preview */}
        {selected.size > 0 && (
          <Box sx={{ borderTop: `1px solid ${NAVY_LT}`, p: 2, bgcolor: NAVY }}>
            <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>
              Selected Interviewers
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
              {[...selected].map(id => {
                const m = allMembers.find(x => x.id === id)
                if (!m) return null
                return (
                  <Chip key={id} label={`${m.name} · ${m.position}`} size="small"
                    onDelete={() => toggle(id)}
                    avatar={<Avatar sx={{ bgcolor: m.avatarColor, fontSize: '0.55rem !important', fontWeight: 800, width: '18px !important', height: '18px !important' }}>
                      {m.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
                    </Avatar>}
                    sx={{ height: 22, fontSize: '0.65rem', bgcolor: `${m.avatarColor}20`, color: '#1E293B',
                      '& .MuiChip-deleteIcon': { color: '#475569', fontSize: '0.85rem' } }} />
                )
              })}
            </Box>
            <Box display="flex" gap={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={onClose}
                sx={{ borderColor: NAVY_LT, color: '#64748B', '&:hover': { borderColor: ORANGE, color: ORANGE } }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={() => onSave([...selected])}
                startIcon={<Check />}
                sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#4338CA' }, fontWeight: 700 }}>
                Confirm Assignment
              </Button>
            </Box>
          </Box>
        )}

        {selected.size === 0 && (
          <Box sx={{ borderTop: `1px solid ${NAVY_LT}`, p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button variant="outlined" onClick={onClose}
              sx={{ borderColor: NAVY_LT, color: '#64748B', '&:hover': { borderColor: ORANGE, color: ORANGE } }}>
              Cancel
            </Button>
            <Button variant="outlined" color="error" onClick={() => onSave([])}
              sx={{ borderColor: '#EF444444', color: '#EF4444' }}>
              Remove Assignment
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const AssignPanelPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const { organizationId } = useAppSelector(s => s.auth)
  const { jobs }           = useAppSelector(s => s.jobs)

  const [members,     setMembers]     = useState<PanelMember[]>([])
  const [all,         setAll]         = useState<AggCandidate[]>([])
  const [assignments, setAssignments] = useState<PanelAssignment[]>([])
  const [search,      setSearch]      = useState('')
  const [stageFilt,   setStageFilt]   = useState('ALL')
  const [jobFilt,     setJobFilt]     = useState('ALL')
  const [deptFilt,    setDeptFilt]    = useState('ALL')
  const [dialogCand,  setDialogCand]  = useState<AggCandidate | null>(null)
  const [toast,       setToast]       = useState<{ msg: string; sev: 'success'|'info'|'warning' }|null>(null)
  const [rosterSearch,setRosterSearch]= useState('')

  useEffect(() => { if (organizationId) dispatch(fetchJobs({ organizationId, page: 0, size: 50 })) }, [organizationId, dispatch])

  // Seed and load panel members
  useEffect(() => { setMembers(loadPanelMembers()) }, [])

  const reload = () => {
    const rows: AggCandidate[] = []
    jobs.forEach(job => {
      const pl = loadPipeline(String(job.id))
      pl.candidates.forEach(c => {
        const sid   = pl.stageMap[c.id] ?? pl.stages[0]?.id ?? ''
        const stage = pl.stages.find(s => s.id === sid)
        rows.push({ candidate: c, jobId: String(job.id), jobTitle: job.title, stageName: stage?.label ?? 'Unknown', stageType: stage?.type ?? 'shortlist' })
      })
    })
    setAll(rows)
    setAssignments(loadPanelAssignments())
  }
  useEffect(() => { reload() }, [jobs])

  // Unique departments and stages for filters
  const depts  = useMemo(() => ['ALL', ...Array.from(new Set(members.map(m => m.department)))], [members])
  const stages = useMemo(() => ['ALL', ...Array.from(new Set(all.map(r => r.stageName)))], [all])
  const jobOpts= useMemo(() => {
    const map = new Map<string,string>()
    all.forEach(r => map.set(r.jobId, r.jobTitle))
    return [['ALL','All Jobs'], ...[...map.entries()]]
  }, [all])

  // Filtered roster
  const filteredMembers = useMemo(() => {
    const q = rosterSearch.toLowerCase()
    return members.filter(m =>
      (deptFilt === 'ALL' || m.department === deptFilt) &&
      (!q || m.name.toLowerCase().includes(q) || m.position.toLowerCase().includes(q))
    )
  }, [members, deptFilt, rosterSearch])

  // Filtered candidates
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return all.filter(r =>
      (stageFilt === 'ALL' || r.stageName === stageFilt) &&
      (jobFilt   === 'ALL' || r.jobId === jobFilt) &&
      (!q || r.candidate.name.toLowerCase().includes(q) || r.candidate.email?.toLowerCase().includes(q))
    )
  }, [all, stageFilt, jobFilt, search])

  const getAssignment   = (cid: string, jobId: string) => assignments.find(a => a.candidateId === cid && a.jobId === jobId)
  const getMembersById  = (ids: string[])               => ids.map(id => members.find(m => m.id === id)).filter(Boolean) as PanelMember[]

  const handleSave = (cand: AggCandidate, memberIds: string[]) => {
    if (memberIds.length === 0) {
      removePanelAssignment(cand.candidate.id, cand.jobId)
      setToast({ msg: `Removed panel from ${cand.candidate.name}`, sev: 'info' })
    } else {
      savePanelAssignment({ candidateId: cand.candidate.id, jobId: cand.jobId, memberIds, assignedAt: new Date().toISOString() })
      const names = getMembersById(memberIds).map(m => m.name.split(' ')[0]).join(', ')
      setToast({ msg: `${memberIds.length} interviewer${memberIds.length > 1 ? 's' : ''} assigned to ${cand.candidate.name}: ${names}`, sev: 'success' })
    }
    setAssignments(loadPanelAssignments())
    setDialogCand(null)
  }

  const assignedCount = useMemo(() => assignments.filter(a => a.memberIds?.length > 0).length, [assignments])

  const SH = {
    bgcolor: NAVY, borderBottom: `1px solid ${NAVY_LT}`,
    fontSize: '0.65rem', fontWeight: 700, color: '#475569',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    py: 1.25, whiteSpace: 'nowrap' as const
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B' }}>Interview Panel Assignment</Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            {members.length} panel members · {all.length} candidates in pipeline · {assignedCount} assigned
          </Typography>
        </Box>
      </Box>

      {/* ── Panel Members Roster ─────────────────────────────────────────────── */}
      <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2, mb: 3 }}>
        <Box sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: `1px solid ${NAVY_LT}`, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box flex={1}>
            <Typography sx={{ fontWeight: 700, color: '#1E293B', fontSize: '0.9rem' }}>
              Panel Members Roster
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.65rem' }}>
              {members.length} interviewers across {new Set(members.map(m => m.department)).size} departments
            </Typography>
          </Box>

          <TextField size="small" placeholder="Search members…" value={rosterSearch}
            onChange={e => setRosterSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: '0.85rem', color: '#475569' }} /></InputAdornment> }}
            sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { fontSize: '0.75rem' }, '& fieldset': { borderColor: NAVY_LT } }} />

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Department</InputLabel>
            <Select value={deptFilt} label="Department" onChange={e => setDeptFilt(e.target.value)}
              sx={{ fontSize: '0.75rem', '& fieldset': { borderColor: NAVY_LT } }}>
              {depts.map(d => <MenuItem key={d} value={d} sx={{ fontSize: '0.75rem' }}>{d === 'ALL' ? 'All' : d}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ p: 2 }}>
          <Grid container spacing={1.25}>
            {filteredMembers.map(m => {
              const deptColor = DEPT_COLORS[m.department] ?? '#475569'
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={m.id}>
                  <Card sx={{ bgcolor: NAVY, border: `1px solid ${NAVY_LT}`, borderRadius: 2,
                    '&:hover': { borderColor: m.avatarColor } }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box display="flex" alignItems="center" gap={1.25}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: m.avatarColor, fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
                          {m.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </Avatar>
                        <Box minWidth={0} flex={1}>
                          <Typography sx={{ fontWeight: 700, color: '#1E293B', fontSize: '0.78rem', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.62rem', display: 'block' }}>
                            {m.position}
                          </Typography>
                          <Chip label={m.department} size="small"
                            sx={{ mt: 0.3, height: 14, fontSize: '0.52rem', fontWeight: 700, bgcolor: `${deptColor}20`, color: deptColor }} />
                        </Box>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#334155', fontSize: '0.6rem', mt: 0.75, display: 'block',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.email}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
          {filteredMembers.length === 0 && (
            <Typography sx={{ color: '#334155', textAlign: 'center', py: 3, fontSize: '0.82rem' }}>
              No members match the filter
            </Typography>
          )}
        </Box>
      </Card>

      {/* ── Candidate Assignment Table ────────────────────────────────────────── */}
      <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2 }}>
        {/* Table filters */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${NAVY_LT}`, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700, color: '#1E293B', fontSize: '0.88rem', mr: 1 }}>Candidate Assignments</Typography>

          <TextField size="small" placeholder="Search candidate…" value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: '0.9rem', color: '#475569' }} /></InputAdornment> }}
            sx={{ flex: 1, minWidth: 180, '& .MuiOutlinedInput-root': { fontSize: '0.78rem' }, '& fieldset': { borderColor: NAVY_LT } }} />

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Stage</InputLabel>
            <Select value={stageFilt} label="Stage" onChange={e => setStageFilt(e.target.value)}
              sx={{ fontSize: '0.75rem', '& fieldset': { borderColor: NAVY_LT } }}>
              {stages.map(s => <MenuItem key={s} value={s} sx={{ fontSize: '0.75rem' }}>{s === 'ALL' ? 'All Stages' : s}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Job</InputLabel>
            <Select value={jobFilt} label="Job" onChange={e => setJobFilt(e.target.value)}
              sx={{ fontSize: '0.75rem', '& fieldset': { borderColor: NAVY_LT } }}>
              {jobOpts.map(([id, title]) => <MenuItem key={id} value={id} sx={{ fontSize: '0.75rem' }}>{title}</MenuItem>)}
            </Select>
          </FormControl>

          <Typography variant="caption" sx={{ color: '#475569', ml: 'auto' }}>
            {filtered.length} / {all.length}
          </Typography>
        </Box>

        {all.length === 0 ? (
          <Box textAlign="center" py={8}>
            <People sx={{ fontSize: 48, color: '#1E2D40', mb: 1.5 }} />
            <Typography sx={{ color: '#334155', fontSize: '0.9rem' }}>No candidates in any pipeline yet</Typography>
            <Typography variant="caption" sx={{ color: '#1E2D40' }}>
              Add candidates to a job's hiring pipeline first
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': SH }}>
                  <TableCell>Candidate</TableCell>
                  <TableCell>Job</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell>ATS</TableCell>
                  <TableCell>Assigned Interviewers</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5, color: '#334155', border: 'none' }}>
                      No candidates match the current filters
                    </TableCell>
                  </TableRow>
                ) : filtered.map(r => {
                  const asgn       = getAssignment(r.candidate.id, r.jobId)
                  const assigned   = getMembersById(asgn?.memberIds ?? [])
                  const stageColor = r.stageType === 'rejected' ? '#EF4444' : r.stageType === 'hired' ? '#0F766E' : r.stageType === 'offer' ? '#22C55E' : '#A78BFA'

                  return (
                    <TableRow key={`${r.candidate.id}_${r.jobId}`}
                      sx={{ borderBottom: `1px solid ${NAVY_LT}`, '&:last-child td': { border: 'none' },
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.015)' } }}>

                      {/* Candidate */}
                      <TableCell sx={{ py: 1.25 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 30, height: 30, fontSize: '0.65rem', fontWeight: 800, bgcolor: NAVY_LT, flexShrink: 0, color: '#94A3B8' }}>
                            {r.candidate.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B', lineHeight: 1.2 }}>
                              {r.candidate.name}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#64748B' }}>
                              {r.candidate.email || '—'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Job */}
                      <TableCell sx={{ py: 1.25, maxWidth: 140 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#94A3B8',
                          display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.jobTitle}
                        </Typography>
                      </TableCell>

                      {/* Stage */}
                      <TableCell sx={{ py: 1.25 }}>
                        <Chip label={r.stageName} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700,
                          bgcolor: `${stageColor}20`, color: stageColor }} />
                      </TableCell>

                      {/* ATS */}
                      <TableCell sx={{ py: 1.25 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem',
                          color: r.candidate.atsScore >= 80 ? '#22C55E' : r.candidate.atsScore >= 60 ? '#F59E0B' : '#EF4444' }}>
                          {Math.round(r.candidate.atsScore)}%
                        </Typography>
                      </TableCell>

                      {/* Assigned interviewers */}
                      <TableCell sx={{ py: 1.25 }}>
                        {assigned.length > 0 ? (
                          <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
                            {assigned.slice(0, 3).map(m => (
                              <Tooltip key={m.id} title={`${m.name} · ${m.position}`} arrow>
                                <Avatar sx={{ width: 24, height: 24, bgcolor: m.avatarColor, fontSize: '0.55rem', fontWeight: 800, cursor: 'default' }}>
                                  {m.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
                                </Avatar>
                              </Tooltip>
                            ))}
                            {assigned.length > 3 && (
                              <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.65rem', fontWeight: 600 }}>
                                +{assigned.length - 3}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#334155', fontStyle: 'italic', fontSize: '0.68rem' }}>
                            Not assigned
                          </Typography>
                        )}
                      </TableCell>

                      {/* Action */}
                      <TableCell align="center" sx={{ py: 1.25 }}>
                        <Button size="small" variant="outlined"
                          startIcon={assigned.length > 0 ? <People sx={{ fontSize: '0.7rem !important' }} /> : <GroupAdd sx={{ fontSize: '0.7rem !important' }} />}
                          onClick={() => setDialogCand(r)}
                          sx={{ fontSize: '0.62rem', py: 0.3, px: 1,
                            borderColor: assigned.length > 0 ? `${ORANGE}55` : NAVY_LT,
                            color:       assigned.length > 0 ? ORANGE : '#64748B',
                            '&:hover': { borderColor: ORANGE, color: ORANGE, bgcolor: `${ORANGE}08` } }}>
                          {assigned.length > 0 ? `Edit (${assigned.length})` : 'Assign'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      {/* Assign Dialog */}
      <AssignDialog
        open={!!dialogCand}
        candidate={dialogCand}
        allMembers={members}
        currentIds={getAssignment(dialogCand?.candidate.id ?? '', dialogCand?.jobId ?? '')?.memberIds ?? []}
        onSave={ids => dialogCand && handleSave(dialogCand, ids)}
        onClose={() => setDialogCand(null)}
      />

      {/* Toast */}
      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.sev ?? 'success'} onClose={() => setToast(null)}
          sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}` }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default AssignPanelPage
