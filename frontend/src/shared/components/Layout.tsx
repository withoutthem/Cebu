// src/shared/components/Layout/Layout.tsx
import React from 'react'
import Box from '@mui/material/Box'

interface LayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <Box className={'layout'}>
      {/*<Header/>*/}
      <Box component="main">{children}</Box>
      {/*<Footer/>*/}
    </Box>
  )
}

export default Layout
