import React, { useMemo, useState, useCallback } from 'react'
import { useAppSelector } from '@hooks/redux'
import CandidateDetailModal, { CandidateModalData } from '@components/CandidateDetailModal'
import {
  Box, Typography, Chip, Avatar, TextField, InputAdornment,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Paper, LinearProgress, TablePagination, ToggleButtonGroup, ToggleButton,
  Tooltip, IconButton, Button,
} from '@mui/material'
import {
  Search, FilterList, OpenInNew, AccountTree, Person,
  CheckCircle, TrendingUp, WorkspacePremium, Block, Groups,
} from '@mui/icons-material'
import { loadPipeline, DEFAULT_STAGES, PipelineCandidate, PipelineStage } from '@utils/pipelineStorage'

// ── Tokens ────────────────────────────────────────────────────────────────────
const ORANGE  = '#6366F1'
const BG      = '#EEF0FF'
const CARD    = '#FFFFFF'
const BORDER  = '#E2E8F0'
const TEXT1   = '#1E293B'
const TEXT2   = '#64748B'
const TEXT3   = '#94A3B8'

const STAGE_COLORS: Record<string, string> = {
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

// ── Row type ──────────────────────────────────────────────────────────────────
interface PipelineRow {
  candidateId: string
  name:        string
  email:       string
  role:        string
  atsScore:    number
  matchedSkills: string[]
  addedAt:     string
  jobId:       string
  jobCode?:    string
  jobTitle:    string
  stageId:     string
  stageLabel:  string
  stageColor:  string
  stageType:   string
}

function scoreColor(s: number) {
  return s >= 80 ? '#22C55E' : s >= 60 ? '#F59E0B' : '#EF4444'
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AllPipelinePage() {
  const { jobs }         = useAppSelector(s => s.jobs)

  const [search,    setSearch]    = useState('')
  const [stageFilter, setStageFilter] = useState<string>('ALL')
  const [page,      setPage]      = useState(0)
  const [rpp,       setRpp]       = useState(20)
  const [viewData,  setViewData]  = useState<CandidateModalData | null>(null)

  // Aggregate all pipeline candidates from every job
  const allRows = useMemo<PipelineRow[]>(() => {
    const rows: PipelineRow[] = []
    jobs.forEach(job => {
      const pl = loadPipeline(String(job.id))
      const stages: PipelineStage[] = pl.stages.length ? pl.stages : DEFAULT_STAGES
      pl.candidates.forEach(c => {
        const stageId = pl.stageMap[c.id] ?? stages[0]?.id ?? 'shortlisted'
        const stage   = stages.find(s => s.id === stageId) ?? stages[0]
        rows.push({
          candidateId:   c.id,
          name:          c.name,
          email:         c.email ?? '',
          role:          c.role  ?? '',
          atsScore:      c.atsScore ?? 0,
          matchedSkills: c.matchedSkills ?? [],
          addedAt:       c.addedAt ?? '',
          jobId:         String(job.id),
          jobCode:       job.jobCode,
          jobTitle:      job.title,
          stageId:       stageId,
          stageLabel:    stage?.label ?? 'Unknown',
          stageColor:    STAGE_COLORS[stage?.type ?? 'shortlist'] ?? ORANGE,
          stageType:     stage?.type  ?? 'shortlist',
        })
      })
    })
    return rows
  }, [jobs])

  // Count per stage type
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: allRows.length }
    allRows.forEach(r => {
      c[r.stageType] = (c[r.stageType] ?? 0) + 1
    })
    return c
  }, [allRows])

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allRows.filter(r => {
      const matchesStage = stageFilter === 'ALL' || r.stageType === stageFilter
      const matchesSearch = !q
        || r.name.toLowerCase().includes(q)
        || r.email.toLowerCase().includes(q)
        || r.role.toLowerCase().includes(q)
        || r.jobTitle.toLowerCase().includes(q)
        || r.stageLabel.toLowerCase().includes(q)
      return matchesStage && matchesSearch
    })
  }, [allRows, stageFilter, search])

  const paginated = useMemo(
    () => filtered.slice(page * rpp, (page + 1) * rpp),
    [filtered, page, rpp]
  )

  const handleStageFilter = (_: any, val: string | null) => {
    setStageFilter(val ?? 'ALL')
    setPage(0)
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(0)
  }

  const openDetail = useCallback((row: PipelineRow) => {
    const pl = loadPipeline(row.jobId)
    const candidate = pl.candidates.find(c => c.id === row.candidateId)
    if (candidate) {
      setViewData({ pipelineCandidate: candidate, jobId: row.jobId, jobTitle: row.jobTitle })
    } else {
      setViewData({ analysisId: row.candidateId, jobId: row.jobId, jobTitle: row.jobTitle })
    }
  }, [])

  // Stage filter tabs config
  const filterTabs = [
    { value: 'ALL',       label: 'All',          color: ORANGE },
    { value: 'shortlist', label: 'Shortlisted',  color: STAGE_COLORS.shortlist },
    { value: 'round',     label: 'In Interview', color: STAGE_COLORS.round },
    { value: 'offer',     label: 'Offer Stage',  color: STAGE_COLORS.offer },
    { value: 'hired',     label: 'Hired',        color: STAGE_COLORS.hired },
    { value: 'rejected',  label: 'Rejected',     color: STAGE_COLORS.rejected },
  ]

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', p: 3 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <AccountTree sx={{ color: ORANGE, fontSize: 26 }} />
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: TEXT1 }}>
            Hiring Pipeline
          </Typography>
          <Chip label={`${allRows.length} candidates`} size="small"
            sx={{ height: 22, fontSize: 11, fontWeight: 700,
              bgcolor: ORANGE + '15', color: ORANGE, borderRadius: 1 }} />
        </Box>
        <Typography sx={{ fontSize: 13, color: TEXT2 }}>
          All candidates across every active job — filter by stage to focus your review
        </Typography>
      </Box>

      {/* ── Stage summary chips ─────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {filterTabs.slice(1).map(tab => (
          <Box key={tab.value} sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            px: 2, py: 1.25, borderRadius: 2, bgcolor: CARD,
            border: `1.5px solid ${stageFilter === tab.value ? tab.color : BORDER}`,
            cursor: 'pointer', transition: 'all 0.15s',
            bgcolor: stageFilter === tab.value ? tab.color + '0D' : CARD,
            '&:hover': { borderColor: tab.color, bgcolor: tab.color + '08' },
          }} onClick={() => { setStageFilter(tab.value); setPage(0) }}>
            <Box sx={{ color: tab.color, display: 'flex', alignItems: 'center' }}>
              {STAGE_TYPE_ICON[tab.value]}
            </Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: TEXT1 }}>
              {tab.label}
            </Typography>
            <Chip label={counts[tab.value] ?? 0} size="small"
              sx={{ height: 18, fontSize: 10, fontWeight: 700, borderRadius: 1,
                bgcolor: tab.color + '15', color: tab.color }} />
          </Box>
        ))}
      </Box>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: CARD, border: `1px solid ${BORDER}`, borderRadius: 2,
        p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField size="small"
          placeholder="Search by name, role, email, or job…"
          value={search} onChange={handleSearch}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: TEXT3 }}/></InputAdornment> }}
          sx={{ flex: 1, minWidth: 220, '& .MuiOutlinedInput-root': { fontSize: 13 } }}
        />

        {/* Stage toggle */}
        <ToggleButtonGroup value={stageFilter} exclusive onChange={handleStageFilter} size="small">
          {filterTabs.map(tab => (
            <ToggleButton key={tab.value} value={tab.value}
              sx={{
                fontSize: 12, textTransform: 'none', fontWeight: 600, px: 1.5, py: 0.6,
                color: TEXT2,
                '&.Mui-selected': {
                  bgcolor: tab.color + '15',
                  color: tab.color,
                  borderColor: tab.color + '40',
                  fontWeight: 700,
                },
              }}>
              {tab.label}
              {counts[tab.value] !== undefined && (
                <Box component="span" sx={{
                  ml: 0.75, fontSize: 10, fontWeight: 700,
                  px: 0.6, py: 0.1, borderRadius: 0.75,
                  bgcolor: stageFilter === tab.value ? tab.color + '20' : TEXT3 + '20',
                  color: stageFilter === tab.value ? tab.color : TEXT3,
                }}>
                  {counts[tab.value]}
                </Box>
              )}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2, border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: 'none' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.07em', py: 1.5 }}>
                  Candidate
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Role / Email
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Job
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Stage
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  ATS
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Skills
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Added
                </TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 6, textAlign: 'center' }}>
                    <Person sx={{ fontSize: 40, color: TEXT3, mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography sx={{ color: TEXT2, fontSize: 14, fontWeight: 500 }}>
                      {allRows.length === 0
                        ? 'No candidates in any pipeline yet'
                        : 'No candidates match this filter'}
                    </Typography>
                    <Typography sx={{ color: TEXT3, fontSize: 12, mt: 0.5 }}>
                      {allRows.length === 0
                        ? 'Add candidates to a job pipeline to see them here'
                        : 'Try a different stage or clear the search'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map(row => (
                  <TableRow key={`${row.jobId}_${row.candidateId}`}
                    onClick={() => openDetail(row)}
                    sx={{
                      cursor: 'pointer',
                      borderBottom: `1px solid ${BORDER}`,
                      '&:last-child td': { border: 'none' },
                      '&:hover': { bgcolor: ORANGE + '05' },
                    }}>

                    {/* Candidate */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Avatar sx={{
                          width: 32, height: 32, fontSize: 11, fontWeight: 800, flexShrink: 0,
                          background: `linear-gradient(135deg, ${ORANGE}, #4338CA)`, color: '#fff',
                        }}>
                          {row.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: TEXT1, lineHeight: 1.2 }}>
                            {row.name}
                          </Typography>
                          <Chip label={row.stageLabel} size="small"
                            sx={{ height: 16, fontSize: 9, fontWeight: 700, mt: 0.3, borderRadius: 1,
                              bgcolor: row.stageColor + '15', color: row.stageColor,
                              border: `1px solid ${row.stageColor}30` }} />
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Role / Email */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography sx={{ fontSize: 12.5, color: TEXT1, fontWeight: 500 }}>
                        {row.role || '—'}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: TEXT3 }}>
                        {row.email || '—'}
                      </Typography>
                    </TableCell>

                    {/* Job */}
                    <TableCell sx={{ py: 1.5, maxWidth: 200 }}>
                      <Typography sx={{ fontSize: 12.5, color: TEXT1, fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.jobTitle}
                      </Typography>
                      {row.jobCode && (
                        <Typography sx={{ fontSize: 10, color: TEXT3, fontFamily: 'monospace',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.jobCode}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Stage */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%',
                          bgcolor: row.stageColor, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 12.5, color: row.stageColor, fontWeight: 600 }}>
                          {row.stageLabel}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: 10, color: TEXT3, mt: 0.3 }}>
                        {STAGE_TYPE_LABEL[row.stageType] ?? row.stageType}
                      </Typography>
                    </TableCell>

                    {/* ATS */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, minWidth: 60 }}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 800, color: scoreColor(row.atsScore) }}>
                            {row.atsScore}
                          </Typography>
                          <Typography sx={{ fontSize: 10, color: TEXT3 }}>/100</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={row.atsScore}
                          sx={{ width: 60, height: 4, borderRadius: 99, bgcolor: BORDER,
                            '& .MuiLinearProgress-bar': { bgcolor: scoreColor(row.atsScore), borderRadius: 99 } }} />
                      </Box>
                    </TableCell>

                    {/* Skills */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, maxWidth: 200 }}>
                        {(row.matchedSkills ?? []).slice(0, 3).map(s => (
                          <Chip key={s} label={s} size="small"
                            sx={{ height: 16, fontSize: 9, bgcolor: ORANGE + '10', color: ORANGE,
                              border: `1px solid ${ORANGE}25` }} />
                        ))}
                        {(row.matchedSkills ?? []).length > 3 && (
                          <Typography sx={{ fontSize: 10, color: TEXT3, alignSelf: 'center' }}>
                            +{row.matchedSkills.length - 3}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    {/* Added */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography sx={{ fontSize: 11.5, color: TEXT2 }}>
                        {row.addedAt
                          ? new Date(row.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </Typography>
                    </TableCell>

                    {/* Action */}
                    <TableCell sx={{ py: 1.5 }} align="right" onClick={e => e.stopPropagation()}>
                      <Tooltip title="View profile">
                        <IconButton size="small" onClick={() => openDetail(row)}
                          sx={{ color: ORANGE, '&:hover': { bgcolor: ORANGE + '10' } }}>
                          <OpenInNew sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={rpp}
          rowsPerPageOptions={[10, 20, 50]}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRpp(parseInt(e.target.value)); setPage(0) }}
          sx={{ borderTop: `1px solid ${BORDER}`, fontSize: 12,
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 12 } }}
        />
      </Paper>

      {/* ── Candidate detail modal ──────────────────────────────────────────── */}
      <CandidateDetailModal
        open={!!viewData}
        data={viewData}
        onClose={() => setViewData(null)}
      />
    </Box>
  )
}
