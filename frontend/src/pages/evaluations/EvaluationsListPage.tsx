import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Card, CardContent, Button, Chip, Avatar,
  Rating, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Divider, Tooltip
} from '@mui/material'
import {
  Assessment, Delete, Visibility, Star, CheckCircle, Cancel,
  PauseCircle, ArrowForward, FilterList
} from '@mui/icons-material'
import { Evaluation, loadEvaluations } from '@utils/pipelineStorage'

const NAVY    = '#F8FAFC'
const NAVY_MID= '#FFFFFF'
const NAVY_LT = '#E2E8F0'
const ORANGE  = '#6366F1'

const REC_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  ADVANCE: { color: ORANGE,    icon: <ArrowForward sx={{ fontSize: '0.85rem' }} />, label: 'Advance' },
  HIRE:    { color: '#22C55E', icon: <CheckCircle  sx={{ fontSize: '0.85rem' }} />, label: 'Hire' },
  REJECT:  { color: '#EF4444', icon: <Cancel       sx={{ fontSize: '0.85rem' }} />, label: 'Reject' },
  HOLD:    { color: '#F59E0B', icon: <PauseCircle  sx={{ fontSize: '0.85rem' }} />, label: 'Hold' },
}

const EvaluationsListPage: React.FC = () => {
  const [evals, setEvals]   = useState<Evaluation[]>([])
  const [filter, setFilter] = useState<string>('ALL')
  const [viewItem, setViewItem] = useState<Evaluation | null>(null)
  const [panelFilter, setPanelFilter] = useState('')

  const load = () => {
    const all = JSON.parse(localStorage.getItem('hs_evaluations') || '[]') as Evaluation[]
    setEvals(all.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()))
  }

  useEffect(() => { load() }, [])

  const handleDelete = (id: string) => {
    const all = JSON.parse(localStorage.getItem('hs_evaluations') || '[]') as Evaluation[]
    localStorage.setItem('hs_evaluations', JSON.stringify(all.filter(e => e.id !== id)))
    load()
  }

  const filtered = evals.filter(e =>
    (filter === 'ALL' || e.recommendation === filter) &&
    (!panelFilter || e.panelMember.toLowerCase().includes(panelFilter.toLowerCase()))
  )

  const panels = [...new Set(evals.map(e => e.panelMember).filter(Boolean))]

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#E2E8F0' }}>
            Interview Evaluations
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            {evals.length} total • {evals.filter(e => e.recommendation === 'HIRE').length} recommended for hire
          </Typography>
        </Box>
      </Box>

      {/* Filters */}
      <Box display="flex" gap={1.5} mb={3} flexWrap="wrap" alignItems="center">
        {(['ALL', 'ADVANCE', 'HIRE', 'HOLD', 'REJECT'] as const).map(f => {
          const cfg = f === 'ALL' ? null : REC_CONFIG[f]
          return (
            <Chip key={f} label={f === 'ALL' ? 'All' : cfg!.label} size="small" clickable
              onClick={() => setFilter(f)}
              sx={{
                fontWeight: 600, fontSize: '0.72rem',
                bgcolor: filter === f ? `${cfg?.color ?? ORANGE}22` : NAVY_LT,
                border: `1px solid ${filter === f ? (cfg?.color ?? ORANGE) : 'transparent'}`,
                color: filter === f ? (cfg?.color ?? ORANGE) : '#64748B'
              }}
            />
          )
        })}
        {panels.length > 1 && (
          <TextField size="small" placeholder="Filter by panel member..."
            value={panelFilter} onChange={e => setPanelFilter(e.target.value)}
            sx={{ ml: 'auto', width: 220,
              '& .MuiOutlinedInput-root': { fontSize: '0.78rem' },
              '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT } }} />
        )}
      </Box>

      {/* Stats row */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        {Object.entries(REC_CONFIG).map(([key, cfg]) => {
          const count = evals.filter(e => e.recommendation === key).length
          return (
            <Card key={key} sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, flex: 1, minWidth: 100 }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: cfg.color, fontSize: '1.75rem' }}>
                  {count}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>
                  {cfg.label}
                </Typography>
              </CardContent>
            </Card>
          )
        })}
      </Box>

      {/* List */}
      {filtered.length === 0 ? (
        <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, textAlign: 'center', py: 6 }}>
          <Assessment sx={{ fontSize: '3rem', color: '#1E3A5F', mb: 1 }} />
          <Typography sx={{ color: '#64748B' }}>No evaluations found</Typography>
        </Card>
      ) : filtered.map(e => {
        const cfg = REC_CONFIG[e.recommendation]
        const avgSkill = e.skillRatings.length > 0
          ? (e.skillRatings.reduce((s, r) => s + r.rating, 0) / e.skillRatings.length).toFixed(1)
          : null
        return (
          <Card key={e.id} sx={{ mb: 1.5, bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`,
            borderLeft: `3px solid ${cfg.color}`, borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box display="flex" gap={1.5} flex={1} minWidth={0}>
                  <Avatar sx={{ width: 34, height: 34, fontSize: '0.72rem', fontWeight: 700, bgcolor: NAVY_LT, flexShrink: 0 }}>
                    {e.candidateName.split(' ').map(w => w[0]).slice(0,2).join('')}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#E2E8F0' }}>
                        {e.candidateName}
                      </Typography>
                      <Chip icon={cfg.icon} label={cfg.label} size="small"
                        sx={{ height: 18, fontSize: '0.6rem', bgcolor: `${cfg.color}22`, color: cfg.color, fontWeight: 700 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>
                      {e.jobTitle} • {e.stageName} • Evaluated by {e.panelMember || 'Unknown'}
                    </Typography>
                    <Box display="flex" gap={2} mt={0.75} flexWrap="wrap" alignItems="center">
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.68rem' }}>Overall:</Typography>
                        <Rating value={e.overallRating} readOnly max={5} size="small"
                          sx={{ fontSize: '0.85rem', '& .MuiRating-iconFilled': { color: ORANGE } }} />
                      </Box>
                      {avgSkill && (
                        <Chip label={`Avg skill: ${avgSkill}/5`} size="small"
                          sx={{ height: 18, fontSize: '0.6rem', bgcolor: NAVY_LT, color: '#94A3B8' }} />
                      )}
                      <Typography variant="caption" sx={{ color: '#334155', fontSize: '0.65rem' }}>
                        {new Date(e.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                    {e.comments && (
                      <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: '#475569',
                        fontSize: '0.72rem', fontStyle: 'italic',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
                        "{e.comments}"
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box display="flex" gap={0.5} ml={1}>
                  <Tooltip title="View Detail">
                    <IconButton size="small" onClick={() => setViewItem(e)}
                      sx={{ color: '#64748B', '&:hover': { color: ORANGE } }}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => handleDelete(e.id)}
                      sx={{ color: '#64748B', '&:hover': { color: '#EF4444' } }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )
      })}

      {/* View Detail Dialog */}
      <Dialog open={!!viewItem} onClose={() => setViewItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: NAVY_MID, fontWeight: 700, fontSize: '1rem' }}>
          Evaluation — {viewItem?.candidateName}
          <Typography variant="caption" display="block" sx={{ color: '#64748B', fontWeight: 400 }}>
            {viewItem?.stageName} • {viewItem?.panelMember}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: NAVY_MID }}>
          {viewItem && (
            <Box pt={1}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                {React.cloneElement(REC_CONFIG[viewItem.recommendation].icon as any, { sx: { color: REC_CONFIG[viewItem.recommendation].color } })}
                <Chip label={REC_CONFIG[viewItem.recommendation].label} size="small"
                  sx={{ bgcolor: `${REC_CONFIG[viewItem.recommendation].color}22`, color: REC_CONFIG[viewItem.recommendation].color, fontWeight: 700 }} />
                <Box flex={1} />
                <Rating value={viewItem.overallRating} readOnly max={5}
                  sx={{ '& .MuiRating-iconFilled': { color: ORANGE } }} />
              </Box>
              <Divider sx={{ borderColor: NAVY_LT, mb: 2 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#94A3B8', mb: 1 }}>Skill Ratings</Typography>
              {viewItem.skillRatings.map((sr, i) => (
                <Box key={i} display="flex" alignItems="center" gap={2} mb={0.75}>
                  <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem', color: '#E2E8F0' }}>{sr.skill}</Typography>
                  <Rating value={sr.rating} readOnly max={5} size="small"
                    sx={{ '& .MuiRating-iconFilled': { color: ORANGE } }} />
                  <Typography variant="caption" sx={{ color: ORANGE, fontWeight: 700, width: 24, textAlign: 'right' }}>
                    {sr.rating}/5
                  </Typography>
                </Box>
              ))}
              {viewItem.comments && (
                <>
                  <Divider sx={{ borderColor: NAVY_LT, my: 2 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#94A3B8', mb: 1 }}>Comments</Typography>
                  <Typography variant="body2" sx={{ color: '#CBD5E1', fontSize: '0.85rem', lineHeight: 1.6,
                    p: 1.5, bgcolor: NAVY, borderRadius: 1, border: `1px solid ${NAVY_LT}` }}>
                    {viewItem.comments}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: NAVY_MID, borderTop: `1px solid ${NAVY_LT}` }}>
          <Button onClick={() => setViewItem(null)} sx={{ color: '#94A3B8' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default EvaluationsListPage
