import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Card, CardContent, Button, Chip, Avatar,
  IconButton, Tooltip, Divider
} from '@mui/material'
import {
  ChevronLeft, ChevronRight, Today, VideoCall, Phone, Business,
  AccessTime, People, Assessment, CheckCircle, EventNote
} from '@mui/icons-material'
import { InterviewSchedule, loadSchedules } from '@utils/pipelineStorage'
import { useNavigate } from 'react-router-dom'

const NAVY    = '#F8FAFC'
const NAVY_MID= '#FFFFFF'
const NAVY_LT = '#E2E8F0'
const ORANGE  = '#6366F1'

const TYPE_ICON: Record<string, React.ReactNode> = {
  VIDEO:     <VideoCall sx={{ fontSize: '0.9rem' }} />,
  PHONE:     <Phone sx={{ fontSize: '0.9rem' }} />,
  IN_PERSON: <Business sx={{ fontSize: '0.9rem' }} />,
}

const TYPE_COLOR: Record<string, string> = {
  VIDEO: '#38BDF8', PHONE: '#A78BFA', IN_PERSON: '#34D399'
}

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

function sameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

const PanelCalendarPage: React.FC = () => {
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState<InterviewSchedule[]>([])
  const [today]    = useState(new Date())
  const [current,  setCurrent]  = useState(new Date())
  const [selected, setSelected] = useState<Date>(new Date())

  useEffect(() => {
    setSchedules(loadSchedules())
  }, [])

  // Build calendar grid
  const year  = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  const selectedSchedules = schedules.filter(s => sameDay(new Date(s.dateTime), selected))
  const allUpcoming = schedules
    .filter(s => new Date(s.dateTime) >= new Date())
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())

  // Colour a cell by its interview count
  const cellCount = (d: Date | null) => {
    if (!d) return 0
    return schedules.filter(s => sameDay(new Date(s.dateTime), d)).length
  }

  const isToday  = (d: Date | null) => d ? sameDay(d, today) : false
  const isSel    = (d: Date | null) => d ? sameDay(d, selected) : false

  // Next 7-day strip
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#E2E8F0' }}>My Interview Calendar</Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            {allUpcoming.length} upcoming interview{allUpcoming.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<Today />} onClick={() => { setCurrent(new Date()); setSelected(new Date()) }}
          sx={{ borderColor: NAVY_LT, color: '#94A3B8', '&:hover': { borderColor: ORANGE, color: ORANGE } }}>
          Today
        </Button>
      </Box>

      <Box display="flex" gap={2.5} flexWrap={{ xs: 'wrap', md: 'nowrap' }}>

        {/* ── Calendar Grid ── */}
        <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2, flex: '0 0 320px', minWidth: 300 }}>
          <CardContent sx={{ p: 2 }}>
            {/* Month nav */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <IconButton size="small" onClick={() => setCurrent(new Date(year, month - 1, 1))}
                sx={{ color: '#64748B', '&:hover': { color: ORANGE } }}>
                <ChevronLeft />
              </IconButton>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#E2E8F0' }}>
                {MONTHS[month]} {year}
              </Typography>
              <IconButton size="small" onClick={() => setCurrent(new Date(year, month + 1, 1))}
                sx={{ color: '#64748B', '&:hover': { color: ORANGE } }}>
                <ChevronRight />
              </IconButton>
            </Box>

            {/* Day headers */}
            <Box display="grid" sx={{ gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
              {DAYS.map(d => (
                <Typography key={d} variant="caption" textAlign="center"
                  sx={{ color: '#334155', fontWeight: 700, fontSize: '0.65rem', py: 0.5 }}>
                  {d}
                </Typography>
              ))}
            </Box>

            {/* Calendar cells */}
            <Box display="grid" sx={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {cells.map((d, i) => {
                const count = cellCount(d)
                const today_ = isToday(d)
                const sel_   = isSel(d)
                return (
                  <Box key={i}
                    onClick={() => d && setSelected(d)}
                    sx={{
                      aspectRatio: '1', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', borderRadius: 1,
                      cursor: d ? 'pointer' : 'default',
                      bgcolor: sel_ ? ORANGE : today_ ? 'rgba(99,102,241,0.15)' : 'transparent',
                      border: today_ && !sel_ ? `1px solid ${ORANGE}55` : '1px solid transparent',
                      '&:hover': d ? { bgcolor: sel_ ? ORANGE : 'rgba(255,255,255,0.05)' } : {}
                    }}>
                    {d && (
                      <>
                        <Typography variant="caption" sx={{
                          fontSize: '0.75rem', fontWeight: today_ || sel_ ? 700 : 400,
                          color: sel_ ? '#FFFFFF' : today_ ? ORANGE : '#94A3B8', lineHeight: 1
                        }}>
                          {d.getDate()}
                        </Typography>
                        {count > 0 && (
                          <Box sx={{
                            width: 5, height: 5, borderRadius: '50%', mt: '2px',
                            bgcolor: sel_ ? 'rgba(255,255,255,0.8)' : ORANGE
                          }} />
                        )}
                      </>
                    )}
                  </Box>
                )
              })}
            </Box>
          </CardContent>
        </Card>

        {/* ── Right panel ── */}
        <Box flex={1} minWidth={0}>

          {/* Next 7 days strip */}
          <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2, mb: 2 }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.68rem',
                textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1 }}>
                Next 7 Days
              </Typography>
              <Box display="flex" gap={1} overflowX="auto">
                {nextDays.map((d, i) => {
                  const cnt = cellCount(d)
                  const isTod = isToday(d)
                  const isSel_ = isSel(d)
                  return (
                    <Box key={i} onClick={() => setSelected(d)} sx={{
                      flexShrink: 0, px: 1.5, py: 1, borderRadius: 2, textAlign: 'center', cursor: 'pointer',
                      bgcolor: isSel_ ? ORANGE : isTod ? 'rgba(99,102,241,0.1)' : NAVY,
                      border: `1px solid ${isTod && !isSel_ ? ORANGE + '55' : NAVY_LT}`,
                      minWidth: 52
                    }}>
                      <Typography variant="caption" sx={{ color: isSel_ ? 'white' : '#64748B', fontSize: '0.62rem', display: 'block' }}>
                        {DAYS[d.getDay()]}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.9rem',
                        color: isSel_ ? 'white' : isTod ? ORANGE : '#E2E8F0' }}>
                        {d.getDate()}
                      </Typography>
                      {cnt > 0 && (
                        <Chip label={cnt} size="small" sx={{
                          height: 14, minWidth: 14, fontSize: '0.55rem', fontWeight: 700, px: '2px',
                          bgcolor: isSel_ ? 'rgba(255,255,255,0.25)' : `${ORANGE}33`, color: isSel_ ? 'white' : ORANGE
                        }} />
                      )}
                    </Box>
                  )
                })}
              </Box>
            </CardContent>
          </Card>

          {/* Selected day interviews */}
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#E2E8F0', mb: 1.5, fontSize: '0.875rem' }}>
            {sameDay(selected, today)
              ? "Today's Interviews"
              : `Interviews on ${selected.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            <Chip label={selectedSchedules.length} size="small"
              sx={{ ml: 1, height: 18, fontSize: '0.65rem', bgcolor: `${ORANGE}22`, color: ORANGE, fontWeight: 700 }} />
          </Typography>

          {selectedSchedules.length === 0 ? (
            <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2, py: 4, textAlign: 'center' }}>
              <EventNote sx={{ fontSize: '2rem', color: '#1E3A5F', mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#64748B' }}>No interviews scheduled for this day</Typography>
            </Card>
          ) : selectedSchedules
              .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
              .map(s => (
            <Card key={s.id} sx={{ mb: 1.5, bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`,
              borderLeft: `3px solid ${TYPE_COLOR[s.type] ?? ORANGE}`, borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box display="flex" gap={1.5} flex={1}>
                    <Avatar sx={{ width: 36, height: 36, fontSize: '0.7rem', fontWeight: 700, bgcolor: NAVY_LT, flexShrink: 0 }}>
                      {s.candidateName.split(' ').map(w => w[0]).slice(0,2).join('')}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#E2E8F0' }}>
                        {s.candidateName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>
                        {s.stageName} • {s.jobTitle}
                      </Typography>
                      <Box display="flex" gap={2} mt={0.75} flexWrap="wrap" alignItems="center">
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <AccessTime sx={{ fontSize: '0.8rem', color: '#475569' }} />
                          <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.72rem' }}>
                            {new Date(s.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            {' '}({s.duration} min)
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5} sx={{ color: TYPE_COLOR[s.type] }}>
                          {TYPE_ICON[s.type]}
                          <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>
                            {s.type.replace('_',' ')}
                          </Typography>
                        </Box>
                        {s.panelMembers.length > 0 && (
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <People sx={{ fontSize: '0.8rem', color: '#475569' }} />
                            <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.72rem' }}>
                              {s.panelMembers.join(', ')}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Box display="flex" flexDirection="column" gap={0.75} alignItems="flex-end">
                    <Chip label={s.status} size="small" sx={{
                      height: 18, fontSize: '0.6rem', fontWeight: 700,
                      bgcolor: s.status === 'SCHEDULED' ? 'rgba(56,189,248,0.15)'
                             : s.status === 'COMPLETED' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: s.status === 'SCHEDULED' ? '#38BDF8'
                           : s.status === 'COMPLETED' ? '#22C55E' : '#EF4444'
                    }} />
                    {s.meetingLink && (
                      <Button size="small" href={s.meetingLink} target="_blank" variant="outlined"
                        sx={{ fontSize: '0.65rem', py: 0.25, px: 0.75, borderColor: '#38BDF855', color: '#38BDF8',
                          '&:hover': { bgcolor: 'rgba(56,189,248,0.1)' } }}>
                        Join
                      </Button>
                    )}
                    <Button size="small" variant="outlined"
                      startIcon={<Assessment sx={{ fontSize: '0.75rem !important' }} />}
                      onClick={() => navigate('/evaluations')}
                      sx={{ fontSize: '0.65rem', py: 0.25, px: 0.75, borderColor: '#A78BFA55', color: '#A78BFA',
                        '&:hover': { bgcolor: 'rgba(167,139,250,0.1)' } }}>
                      Evaluate
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}

          {/* Upcoming (all) */}
          {allUpcoming.length > 0 && (
            <Box mt={3}>
              <Divider sx={{ borderColor: NAVY_LT, mb: 2 }} />
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.68rem',
                textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1.5 }}>
                All Upcoming ({allUpcoming.length})
              </Typography>
              {allUpcoming.slice(0, 10).map(s => (
                <Box key={s.id} display="flex" alignItems="center" gap={1.5} py={0.75}
                  sx={{ borderBottom: `1px solid ${NAVY_LT}`, cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}
                  onClick={() => setSelected(new Date(s.dateTime))}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: NAVY, flexShrink: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${NAVY_LT}` }}>
                    <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.55rem', lineHeight: 1 }}>
                      {MONTHS[new Date(s.dateTime).getMonth()].slice(0,3)}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#E2E8F0', lineHeight: 1 }}>
                      {new Date(s.dateTime).getDate()}
                    </Typography>
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.78rem', color: '#E2E8F0' }}>
                      {s.candidateName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.68rem' }}>
                      {new Date(s.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {s.stageName}
                    </Typography>
                  </Box>
                  <Box sx={{ color: TYPE_COLOR[s.type] }}>{TYPE_ICON[s.type]}</Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default PanelCalendarPage
