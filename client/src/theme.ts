import { alpha, createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#38f2c9"
    },
    secondary: {
      main: "#58a6ff"
    },
    background: {
      default: "#07131c",
      paper: "#102131"
    },
    success: {
      main: "#8bf35a"
    },
    warning: {
      main: "#ffd166"
    },
    text: {
      primary: "#f5fbff",
      secondary: alpha("#f5fbff", 0.74)
    }
  },
  shape: {
    borderRadius: 18
  },
  typography: {
    fontFamily: '"Space Grotesk", "Trebuchet MS", sans-serif',
    h1: {
      fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
      fontWeight: 600,
      letterSpacing: "0.08em"
    },
    h2: {
      fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
      fontWeight: 600,
      letterSpacing: "0.06em"
    },
    h3: {
      fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
      fontWeight: 600,
      letterSpacing: "0.04em"
    },
    button: {
      fontWeight: 700,
      textTransform: "none"
    }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none"
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          paddingInline: 18,
          paddingBlock: 12
        },
        containedPrimary: {
          boxShadow: `0 12px 30px ${alpha("#38f2c9", 0.24)}`
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999
        }
      }
    }
  }
});
