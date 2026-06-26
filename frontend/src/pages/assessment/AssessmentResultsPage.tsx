import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box, Card, CardContent, Typography, Chip, Divider, CircularProgress,
  List, ListItem, ListItemText, Grid, Paper, Avatar
} from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import StarIcon from '@mui/icons-material/Star'
import PersonIcon from '@mui/icons-material/Person'
import { getPublicAssessmentResults } from '@services/assessmentApi'

const RECO: Record<string, { color: string; bg: string; label: string }> = {
  STRONG_HIRE: { color: '#166534', bg: '#DCFCE7', label: '🌟 Strong Hire' },
  HIRE:        { color: '#14532D', bg: '#BBF7D0', label: '✅ Hire'        },
  CONSIDER:    { color: '#92400E', bg: '#FEF3C7', label: '🤔 Consider'    },
  REJECT:      { color: '#7F1D1D', bg: '#FEE2E2', label: '❌ Not Suitable' },
}

const ScoreCircle: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const color = score >= 70 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444'
  const r = 38; const circ = 2 * Math.PI * r
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ position: 'relative', width: 90, height: 90, mx: 'auto' }}>
        <svg width={90} height={90} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={45} cy={45} r={r} fill="none" stroke="#E2E8F0" strokeWidth={9} />
          <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={9}
            strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round" />
        </svg>
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color, lineHeight: 1 }}>{score}</Typography>
          <Typography sx={{ fontSize: '0.55rem', color: '#64748B' }}>/ 100</Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>{label}</Typography>
    </Box>
  )
}

const AssessmentResultsPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const [data, setData]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    getPublicAssessmentResults(token)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress />
    </Box>
  )

  if (!data) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography>Assessment results not found.</Typography>
    </Box>
  )

  const ev       = data.evaluation ?? {}
  const qa: any[] = data.questionsAnswers ?? []
  const reco     = RECO[ev.recommendation] ?? RECO.CONSIDER

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F1F5F9', p: { xs: 2, sm: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <AssignmentIcon sx={{ color: '#6366F1', fontSize: 32 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B' }}>Assessment Results</Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>{data.jobTitle}</Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left: candidate + score */}
        <Grid item xs={12} md={4}>
          {/* Candidate */}
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', mb: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Avatar sx={{ bgcolor: '#EEF2FF', color: '#6366F1', fontWeight: 700 }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1E293B' }}>{data.candidateName}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>{data.candidateRole}</Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>{data.candidateEmail}</Typography>
              {data.candidatePhone && <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>{data.candidatePhone}</Typography>}
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                Completed: {data.completedAt ? new Date(data.completedAt).toLocaleString() : '—'}
              </Typography>
            </CardContent>
          </Card>

          {/* Scores */}
          {ev.overallScore !== undefined && (
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E293B', mb: 2 }}>AI Evaluation Scores</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 1 }}>
                  <ScoreCircle score={ev.overallScore}       label="Overall" />
                  {ev.technicalScore     && <ScoreCircle score={ev.technicalScore}     label="Technical" />}
                  {ev.communicationScore && <ScoreCircle score={ev.communicationScore} label="Communication" />}
                  {ev.problemSolvingScore && <ScoreCircle score={ev.problemSolvingScore} label="Problem Solving" />}
                </Box>
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Chip label={reco.label} sx={{ bgcolor: reco.bg, color: reco.color, fontWeight: 700 }} />
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {ev.summary && (
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E293B', mb: 1 }}>AI Summary</Typography>
                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7, fontStyle: 'italic' }}>
                  "{ev.summary}"
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Strengths & Gaps */}
          {(ev.strengths?.length || ev.gaps?.length) && (
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <CardContent sx={{ p: 2.5 }}>
                {ev.strengths?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <StarIcon sx={{ fontSize: 16 }} /> Key Strengths
                    </Typography>
                    {ev.strengths.map((s: string, i: number) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <CheckCircleIcon sx={{ fontSize: 14, color: '#22C55E', flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ color: '#374151' }}>{s}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                {ev.gaps?.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#92400E', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <WarningAmberIcon sx={{ fontSize: 16 }} /> Areas to Develop
                    </Typography>
                    {ev.gaps.map((g: string, i: number) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <WarningAmberIcon sx={{ fontSize: 14, color: '#F59E0B', flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ color: '#374151' }}>{g}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Right: Q&A */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1E293B', mb: 2 }}>
                Assessment Q&A ({qa.filter(q => q.answer).length} answered)
              </Typography>
              {qa.map((item: any, i: number) => (
                <Paper key={i} elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#6366F1', fontWeight: 700 }}>
                      Q{i + 1}
                    </Typography>
                    {item.inputMethod === 'voice' && (
                      <Chip label="🎤 Voice" size="small" sx={{ fontSize: '0.6rem', bgcolor: '#EEF2FF', color: '#6366F1' }} />
                    )}
                    {ev.questionInsights?.[i]?.score !== undefined && (
                      <Chip label={`Score: ${ev.questionInsights[i].score}`} size="small"
                        sx={{ fontSize: '0.6rem', bgcolor: '#F0FDF4', color: '#166534', fontWeight: 700 }} />
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ color: '#374151', fontWeight: 600, mb: 1 }}>{item.question}</Typography>
                  <Box sx={{ pl: 1.5, borderLeft: '3px solid #CBD5E1' }}>
                    <Typography variant="body2" sx={{ color: item.answer ? '#475569' : '#94A3B8', lineHeight: 1.7, fontStyle: item.answer ? 'normal' : 'italic' }}>
                      {item.answer || 'No answer provided'}
                    </Typography>
                  </Box>
                  {ev.questionInsights?.[i]?.insight && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: '#EEF2FF', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: '#4F46E5', fontStyle: 'italic' }}>
                        💡 {ev.questionInsights[i].insight}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default AssessmentResultsPage
