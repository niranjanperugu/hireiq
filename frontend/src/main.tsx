import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import App from './App'
import store from '@store/index'
import './index.css'

// Sidebar/AppBar stays dark — content area is light
const SIDEBAR = '#0B0F1A'
const ORANGE  = '#6366F1'
const ORANGE_L = '#818CF8'
const ORANGE_D = '#4338CA'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: ORANGE,
      light: ORANGE_L,
      dark: ORANGE_D,
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#2563EB',
      light: '#3B82F6',
      dark: '#1D4ED8',
      contrastText: '#FFFFFF'
    },
    success: { main: '#22C55E', light: '#4ADE80', dark: '#16A34A' },
    error:   { main: '#EF4444', light: '#F87171', dark: '#DC2626' },
    warning: { main: '#F59E0B', light: '#FCD34D', dark: '#D97706' },
    info:    { main: '#2563EB', light: '#60A5FA', dark: '#1D4ED8' },
    background: {
      default: '#EEF0FF',
      paper:   '#FFFFFF'
    },
    text: {
      primary:   '#1E293B',
      secondary: '#64748B'
    },
    divider: '#E2E8F0',
    action: {
      hover:    'rgba(99,102,241, 0.06)',
      selected: 'rgba(99,102,241, 0.12)',
      disabled: 'rgba(0,0,0,0.26)',
      focus:    'rgba(99,102,241, 0.10)'
    }
  },
  typography: {
    fontFamily: '"Poppins", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem',  fontWeight: 700, letterSpacing: '-0.5px' },
    h2: { fontSize: '2rem',    fontWeight: 700, letterSpacing: '-0.5px' },
    h3: { fontSize: '1.5rem',  fontWeight: 600 },
    h4: { fontSize: '1.25rem', fontWeight: 600 },
    h5: { fontSize: '1rem',    fontWeight: 600 },
    h6: { fontSize: '0.875rem',fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    body1:  { fontWeight: 400 },
    body2:  { fontWeight: 400 },
    button: { fontWeight: 600, textTransform: 'none' as const },
    caption:{ fontWeight: 400 }
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#EEF0FF' }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '8px 20px'
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_D} 100%)`,
          boxShadow: `0 2px 8px rgba(99,102,241, 0.30)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${ORANGE_L} 0%, ${ORANGE} 100%)`,
            boxShadow: `0 4px 14px rgba(99,102,241, 0.40)`
          }
        },
        outlinedPrimary: {
          borderColor: ORANGE,
          color: ORANGE,
          '&:hover': { borderColor: ORANGE_L, backgroundColor: 'rgba(99,102,241,0.06)' }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          borderRadius: 12
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', backgroundColor: '#FFFFFF' }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#F8FAFC',
            color: '#64748B',
            fontWeight: 700,
            borderBottom: '1px solid #E2E8F0'
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottomColor: '#E2E8F0', color: '#1E293B' }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: '"Poppins", sans-serif', fontWeight: 500 }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: '#E2E8F0' },
            '&:hover fieldset': { borderColor: ORANGE },
            '&.Mui-focused fieldset': { borderColor: ORANGE }
          }
        }
      }
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: '#E2E8F0' },
        bar:  { borderRadius: 4 }
      }
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: '#E2E8F0' } }
    },
    MuiDialog: {
      styleOverrides: {
        paper: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: SIDEBAR, borderRight: '1px solid #1E2D40' }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: SIDEBAR, boxShadow: '0 1px 0 #1E2D40' }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(99,102,241,0.15)',
            color: ORANGE,
            '& .MuiListItemIcon-root': { color: ORANGE },
            '&:hover': { backgroundColor: 'rgba(99,102,241,0.20)' }
          },
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' }
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: ORANGE },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: ORANGE }
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: '#F8FAFC' }
        }
      }
    },
    MuiInputBase: {
      styleOverrides: {
        root: { backgroundColor: '#FFFFFF' }
      }
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
)
