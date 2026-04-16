import { alpha, createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#38bdf8"
    },
    secondary: {
      main: "#f59e0b"
    },
    success: {
      main: "#22c55e"
    },
    error: {
      main: "#fb7185"
    },
    background: {
      default: "#0f172a",
      paper: "#1e293b"
    },
    text: {
      primary: "#e2e8f0",
      secondary: "#94a3b8"
    }
  },
  shape: {
    borderRadius: 18
  },
  typography: {
    fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
    h1: {
      fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
      fontWeight: 700,
      fontSize: "2.2rem",
      letterSpacing: "-0.04em",
      lineHeight: 1
    },
    h2: {
      fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
      fontWeight: 700,
      fontSize: "1.35rem",
      letterSpacing: "-0.03em"
    },
    h3: {
      fontWeight: 700,
      fontSize: "1rem",
      letterSpacing: "-0.02em"
    },
    button: {
      fontWeight: 700,
      textTransform: "none",
      letterSpacing: "-0.01em"
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#0f172a",
          backgroundImage:
            "radial-gradient(circle at top, rgba(56, 189, 248, 0.16), transparent 38%), radial-gradient(circle at bottom right, rgba(245, 158, 11, 0.12), transparent 28%)"
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${alpha("#cbd5e1", 0.1)}`,
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.28)"
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 48,
          borderRadius: 16,
          boxShadow: "none",
          transition: "transform 160ms ease, background-color 160ms ease, border-color 160ms ease"
        },
        containedPrimary: {
          "&:hover": {
            backgroundColor: "#0ea5e9",
            boxShadow: "none",
            transform: "translateY(-1px)"
          }
        },
        outlined: {
          borderColor: alpha("#cbd5e1", 0.18),
          "&:hover": {
            borderColor: alpha("#38bdf8", 0.45),
            backgroundColor: alpha("#38bdf8", 0.08),
            transform: "translateY(-1px)"
          }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: 48,
          borderRadius: 16,
          backgroundColor: alpha("#0f172a", 0.52),
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#cbd5e1", 0.14)
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#38bdf8", 0.28)
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderWidth: 1,
            borderColor: "#38bdf8"
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 32,
          backgroundColor: alpha("#0f172a", 0.55)
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24
        }
      }
    }
  }
});
