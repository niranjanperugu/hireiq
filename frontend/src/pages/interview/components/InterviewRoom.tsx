import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Box, Card, CardContent, Typography, TextField, Button,
  LinearProgress, CircularProgress, Chip, Divider
} from '@mui/material'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import SendIcon from '@mui/icons-material/Send'
import TimerIcon from '@mui/icons-material/Timer'
import VoiceInput from './VoiceInput'

interface Props {
  question: string
  questionIndex: number
  totalQuestions: number
  timeLimitMinutes: number
  remainingSeconds?: number
  jobTitle: string
  onSubmitAnswer: (answer: string, method: 'text' | 'voice') => Promise<void>
  onTimeout: () => Promise<void>
}

const fmt = (secs: number) =>
  `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`

const InterviewRoom: React.FC<Props> = ({
  question, questionIndex, totalQuestions, timeLimitMinutes, remainingSeconds,
  jobTitle, onSubmitAnswer, onTimeout,
}) => {
  const [answer, setAnswer]         = useState('')
  const [inputMethod, setMethod]    = useState<'text' | 'voice'>('text')
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft]     = useState(
    remainingSeconds !== undefined ? remainingSeconds : timeLimitMinutes * 60
  )
  const [timedOut, setTimedOut]     = useState(false)
  const onTimeoutRef = useRef(onTimeout)
  useEffect(() => { onTimeoutRef.current = onTimeout }, [onTimeout])

  // Countdown timer
  useEffect(() => {
    if (timedOut) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id)
          setTimedOut(true)
          onTimeoutRef.current()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [timedOut])

  // Reset answer when question changes
  useEffect(() => {
    setAnswer('')
    setMethod('text')
  }, [question])

  const handleVoiceTranscript = useCallback((text: string) => {
    setAnswer(text)
    setMethod('voice')
  }, [])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAnswer(e.target.value)
    setMethod('text')
  }

  const handleSubmit = async () => {
    if (!answer.trim() || submitting || timedOut) return
    setSubmitting(true)
    try {
      await onSubmitAnswer(answer.trim(), inputMethod)
    } finally {
      setSubmitting(false)
    }
  }

  const progress  = ((questionIndex) / totalQuestions) * 100
  const timerColor = timeLeft > 300 ? '#22C55E' : timeLeft > 60 ? '#F59E0B' : '#EF4444'
  const isLast    = questionIndex === totalQuestions - 1

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#F1F5F9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      p: { xs: 1.5, sm: 3 },
    }}>
      {/* Top bar */}
      <Box sx={{
        width: '100%', maxWidth: 720,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        mb: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyIcon sx={{ color: '#6366F1', fontSize: 26 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1 }}>
              HireIQ AI Interview
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>{jobTitle}</Typography>
          </Box>
        </Box>

        {/* Timer */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.5,
          bgcolor: '#fff', borderRadius: 2, px: 1.5, py: 0.5,
          border: `2px solid ${timerColor}`,
          boxShadow: timeLeft <= 60 ? `0 0 8px ${timerColor}44` : 'none',
        }}>
          <TimerIcon sx={{ color: timerColor, fontSize: 18 }} />
          <Typography sx={{ fontWeight: 800, color: timerColor, fontFamily: 'monospace', fontSize: '1.1rem' }}>
            {fmt(timeLeft)}
          </Typography>
        </Box>
      </Box>

      {/* Progress bar */}
      <Box sx={{ width: '100%', maxWidth: 720, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
            Question {questionIndex + 1} of {totalQuestions}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            {totalQuestions - questionIndex - 1} remaining
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 6, borderRadius: 3,
            bgcolor: '#E2E8F0',
            '& .MuiLinearProgress-bar': { bgcolor: '#6366F1', borderRadius: 3 },
          }}
        />
      </Box>

      {/* Main card */}
      <Card sx={{ width: '100%', maxWidth: 720, borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', flex: 1 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>

          {/* AI label */}
          <Chip
            icon={<SmartToyIcon sx={{ fontSize: 14 }} />}
            label="AI Interviewer"
            size="small"
            sx={{ bgcolor: '#EEF2FF', color: '#4F46E5', fontWeight: 600, mb: 2 }}
          />

          {/* Question */}
          <Box sx={{
            p: 2.5, bgcolor: '#F8FAFC', borderRadius: 2,
            borderLeft: '4px solid #6366F1', mb: 3,
          }}>
            <Typography
              variant="h6"
              sx={{ color: '#1E293B', fontWeight: 600, lineHeight: 1.6, fontSize: { xs: '1rem', sm: '1.15rem' } }}
            >
              {submitting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} sx={{ color: '#6366F1' }} />
                  <span style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.95rem' }}>
                    Analysing your answer and generating next question…
                  </span>
                </Box>
              ) : question}
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Answer area */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#475569', fontWeight: 600, mb: 1 }}>
              Your Answer
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              {/* Textarea */}
              <TextField
                multiline
                rows={5}
                fullWidth
                placeholder="Type your answer here, or click the microphone to speak…"
                value={answer}
                onChange={handleTextChange}
                disabled={submitting || timedOut}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontSize: '0.95rem',
                    '&.Mui-focused fieldset': { borderColor: '#6366F1' },
                  },
                }}
              />

              {/* Voice input button */}
              <VoiceInput
                onFinalTranscript={handleVoiceTranscript}
                disabled={submitting || timedOut}
              />
            </Box>

            <Typography variant="caption" sx={{ color: '#94A3B8', mt: 0.5, display: 'block' }}>
              {inputMethod === 'voice' && answer
                ? '🎤 Voice-to-text active — you can edit the text above before submitting'
                : 'Tip: Use the mic button to speak your answer — it converts to text automatically'}
            </Typography>
          </Box>

          {/* Submit */}
          <Button
            variant="contained"
            fullWidth
            size="large"
            endIcon={submitting ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <SendIcon />}
            onClick={handleSubmit}
            disabled={!answer.trim() || submitting || timedOut}
            sx={{
              py: 1.5,
              bgcolor: '#6366F1',
              borderRadius: 2,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': { bgcolor: '#4F46E5' },
              '&:disabled': { bgcolor: '#CBD5E1', color: '#94A3B8' },
            }}
          >
            {submitting
              ? 'Processing…'
              : isLast
              ? 'Submit Final Answer'
              : 'Submit Answer & Next Question'}
          </Button>

          {timedOut && (
            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: '#EF4444', fontWeight: 600 }}>
              Time's up! Your interview is being submitted…
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default InterviewRoom
