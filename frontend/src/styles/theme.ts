// src/styles/theme.ts
import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  // 1. 색상, 타이포그래피 등 디자인 토큰 정의
  palette: {
    primary: {
      main: '#1976d2',
      contrastText: '#fff',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    button: {
      textTransform: 'none',
    },
  },

  // 2. 컴포넌트 기본 동작 및 스타일 오버라이드
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
          margin: '0px',
          padding: '0px',
        },
        p: {
          margin: '0px',
          padding: '0px',
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        // 모든 버튼에 대한 추가적인 스타일 정의
        root: {},
      },
    },
  },
})

export default theme
