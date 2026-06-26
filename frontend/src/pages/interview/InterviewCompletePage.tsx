import React from 'react'
import {
  Box, Card, CardContent, Typography, Chip, Divider, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import StarIcon from '@mui/icons-material/Star'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import LockIcon from '@mui/icons-material/Lock'

interface Props {
  jobTitle?: string
  candidateName?: string
  evaluation?: Record<string, any>
}

const RECO_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  STRONG_HIRE: { color: '#166534', bg: '#DCFCE7', label: '🌟 Strong Hire' },
  HIRE:        { color: '#14532D', bg: '#BBF7D0', label: '✅ Hire'        },
  CONSIDER:    { color: '#92400E', bg: '#FEF3C7', label: '🤔 Consider'    },
  REJECT:      { color: '#7F1D1D', bg: '#FEE2E2', label: '❌ Not Suitable' },
}

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const r    = 46
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const col  = score >= 70 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <Box sx={{ position: 'relative', width: 110, height: 110 }}>
      <svg width={110} height={110} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={55} cy={55} r={r} fill="none" stroke="#E2E8F0" strokeWidth={10} />
        <circle cx={55} cy={55} r={r} fill="none" stroke={col} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: col, lineHeight: 1 }}>{score}</Typography>
        <Typography sx={{ fontSize: '0.6rem', color: '#64748B' }}>/ 100</Typography>
      </Box>
    </Box>
  )
}

const InterviewCompletePage: React.FC<Props> = ({ jobTitle, candidateName, evaluation = {} }) => {
  const score   = Number(evaluation.overallScore ?? 0)
  const reco    = (evaluation.recommendation as string) ?? 'CONSIDER'
  const recoStyle = RECO_STYLE[reco] ?? RECO_STYLE.CONSIDER
  const strengths: string[] = evaluation.strengths ?? []
  const gaps: string[]      = evaluation.gaps ?? []
  const summary: string     = evaluation.summary ?? ''

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#F1F5F9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: { xs: 2, sm: 3 },
    }}>
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
          <SmartToyIcon sx={{ color: '#6366F1', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B' }}>HireIQ AI Interview</Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#64748B' }}>{jobTitle}</Typography>
      </Box>

      <Card sx={{ width: '100%', maxWidth: 560, borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>

          {/* Success header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 56, color: '#22C55E', mb: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B' }}>
              Interview Complete!
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748B', mt: 0.5 }}>
              {candidateName ? `Thank you, ${candidateName}!` : 'Thank you for completing the interview!'}
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Score + recommendation */}
          {score > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mb: 1 }}>
                  Overall Score
                </Typography>
                <ScoreRing score={score} />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {evaluation.technicalScore && (
                  <ScorePill label="Technical" value={evaluation.technicalScore} />
                )}
                {evaluation.communicationScore && (
                  <ScorePill label="Communication" value={evaluation.communicationScore} />
                )}
                {evaluation.problemSolvingScore && (
                  <ScorePill label="Problem Solving" value={evaluation.problemSolvingScore} />
                )}
              </Box>
            </Box>
          )}

          {/* Recommendation */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Chip
              label={recoStyle.label}
              sx={{ bgcolor: recoStyle.bg, color: recoStyle.color, fontWeight: 700, fontSize: '0.85rem', px: 1 }}
            />
          </Box>

          {/* Summary */}
          {summary && (
            <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, mb: 3, borderLeft: '4px solid #6366F1' }}>
              <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7, fontStyle: 'italic' }}>
                "{summary}"
              </Typography>
            </Box>
          )}

          {/* Strengths */}
          {strengths.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StarIcon sx={{ fontSize: 16 }} /> Key Strengths
              </Typography>
              <List dense disablePadding>
                {strengths.map((s, i) => (
                  <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <CheckCircleIcon sx={{ fontSize: 14, color: '#22C55E' }} />
                    </ListItemIcon>
                    <ListItemText primary={s} primaryTypographyProps={{ variant: 'body2', color: '#374151' }} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Gaps */}
          {gaps.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#92400E', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <WarningAmberIcon sx={{ fontSize: 16 }} /> Areas to Develop
              </Typography>
              <List dense disablePadding>
                {gaps.map((g, i) => (
                  <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <WarningAmberIcon sx={{ fontSize: 14, color: '#F59E0B' }} />
                    </ListItemIcon>
                    <ListItemText primary={g} primaryTypographyProps={{ variant: 'body2', color: '#374151' }} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />

          {/* Expired notice */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
            <LockIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
            <Typography variant="caption" sx={{ color: '#94A3B8', textAlign: 'center' }}>
              This interview link has expired and cannot be reused. Your results have been sent to the hiring team.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

const ScorePill: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const color = value >= 70 ? '#22C55E' : value >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="caption" sx={{ color: '#64748B', width: 120 }}>{label}</Typography>
      <Box sx={{ flex: 1, height: 6, bgcolor: '#E2E8F0', borderRadius: 3, width: 100 }}>
        <Box sx={{ width: `${value}%`, height: '100%', bgcolor: color, borderRadius: 3 }} />
      </Box>
      <Typography variant="caption" sx={{ color, fontWeight: 700, width: 30 }}>{value}</Typography>
    </Box>
  )
}

export default InterviewCompletePage
