import { alpha, createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#2563eb"
    },
    secondary: {
      main: "#334155"
    },
    background: {
      default: "#0f172a",
      paper: "#111827"
    },
    success: {
      main: "#16a34a"
    },
    warning: {
      main: "#f59e0b"
    },
    error: {
      main: "#ef4444"
    },
    text: {
      primary: "#e5e7eb",
      secondary: "#94a3b8"
    }
  },
  shape: {
    borderRadius: 16
  },
  typography: {
    fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: "2.1rem",
      letterSpacing: "-0.03em",
      lineHeight: 1.1
    },
    h2: {
      fontWeight: 700,
      fontSize: "1.5rem",
      letterSpacing: "-0.02em",
      lineHeight: 1.15
    },
    h3: {
      fontWeight: 600,
      fontSize: "1rem",
      letterSpacing: "-0.01em",
      lineHeight: 1.25
    },
    body1: {
      lineHeight: 1.5
    },
    body2: {
      lineHeight: 1.45
    },
    button: {
      fontWeight: 600,
      fontSize: "0.95rem",
      textTransform: "none"
    }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${alpha("#cbd5e1", 0.12)}`,
          boxShadow: "0 12px 28px rgba(2, 6, 23, 0.24)"
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 52,
          borderRadius: 16,
          paddingInline: 16,
          boxShadow: "none",
          transition: "background-color 160ms ease, border-color 160ms ease, transform 160ms ease"
        },
        containedPrimary: {
          backgroundColor: "#2563eb",
          "&:hover": {
            backgroundColor: "#1d4ed8",
            boxShadow: "none"
          }
        },
        outlined: {
          borderColor: alpha("#cbd5e1", 0.24),
          "&:hover": {
            borderColor: alpha("#cbd5e1", 0.36),
            backgroundColor: alpha("#1e293b", 0.5)
          }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: 52,
          borderRadius: 16,
          backgroundColor: alpha("#0f172a", 0.78),
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#cbd5e1", 0.16)
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#cbd5e1", 0.26)
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#2563eb",
            borderWidth: 1
          }
        },
        input: {
          paddingBlock: 14
        }
      }
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          minHeight: 20,
          marginLeft: 0,
          marginRight: 0
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 30,
          backgroundColor: alpha("#1e293b", 0.9)
        },
        outlined: {
          borderColor: alpha("#cbd5e1", 0.16)
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18
        }
      }
    }
  }
});
