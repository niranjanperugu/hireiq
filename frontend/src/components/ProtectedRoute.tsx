import React from 'react'
import { Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'

interface ProtectedRouteProps {
  isAuthenticated: boolean
  loading?: boolean
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  isAuthenticated,
  loading = false,
  children
}) => {
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
