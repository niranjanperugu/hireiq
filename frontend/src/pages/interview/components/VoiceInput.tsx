import React, { useRef, useState } from 'react'
import { Box, IconButton, Tooltip, Typography, keyframes } from '@mui/material'
import MicIcon from '@mui/icons-material/Mic'
import StopIcon from '@mui/icons-material/Stop'
import MicOffIcon from '@mui/icons-material/MicOff'

const pulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  70%  { box-shadow: 0 0 0 14px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
`

interface Props {
  onFinalTranscript: (text: string) => void
  disabled?: boolean
}

const isSupported =
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

const VoiceInput: React.FC<Props> = ({ onFinalTranscript, disabled }) => {
  const [recording, setRecording] = useState(false)
  const [interim, setInterim] = useState('')
  const recognitionRef = useRef<any>(null)
  const accumulatedRef = useRef('')   // accumulates final chunks within one session

  const start = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const rec = new SR()
    rec.continuous      = true
    rec.interimResults  = true
    rec.lang            = 'en-US'
    accumulatedRef.current = ''

    rec.onresult = (e: any) => {
      let interimChunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          accumulatedRef.current += (accumulatedRef.current ? ' ' : '') + text.trim()
          onFinalTranscript(accumulatedRef.current)
        } else {
          interimChunk += text
        }
      }
      setInterim(interimChunk)
    }

    rec.onend  = () => { setRecording(false); setInterim('') }
    rec.onerror = (e: any) => {
      console.error('SpeechRecognition error:', e.error)
      setRecording(false); setInterim('')
    }

    rec.start()
    recognitionRef.current = rec
    setRecording(true)
  }

  const stop = () => {
    recognitionRef.current?.stop()
    setRecording(false)
    setInterim('')
  }

  if (!isSupported) {
    return (
      <Tooltip title="Voice input requires Chrome or Edge. Use the text field instead.">
        <span>
          <IconButton disabled sx={{ width: 52, height: 52 }}>
            <MicOffIcon sx={{ color: '#94A3B8' }} />
          </IconButton>
        </span>
      </Tooltip>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title={recording ? 'Stop recording' : 'Click to speak your answer'}>
        <IconButton
          onClick={recording ? stop : start}
          disabled={disabled}
          sx={{
            width: 56, height: 56,
            bgcolor: recording ? '#EF4444' : '#6366F1',
            color: '#fff',
            '&:hover': { bgcolor: recording ? '#DC2626' : '#4F46E5' },
            '&:disabled': { bgcolor: '#CBD5E1', color: '#94A3B8' },
            animation: recording ? `${pulse} 1.4s infinite` : 'none',
            transition: 'background-color 0.2s',
          }}
        >
          {recording ? <StopIcon /> : <MicIcon />}
        </IconButton>
      </Tooltip>

      <Typography variant="caption" sx={{ color: recording ? '#EF4444' : '#94A3B8', minHeight: 18, textAlign: 'center' }}>
        {recording
          ? interim ? `"${interim.slice(0, 60)}${interim.length > 60 ? '…' : ''}"` : 'Listening…'
          : 'Click to speak'}
      </Typography>
    </Box>
  )
}

export default VoiceInput
