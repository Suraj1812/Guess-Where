import { useDeferredValue } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import type { Country } from "@shared/countries";

interface GuessOptionsProps {
  options: Country[];
  selectedCode: string | null;
  disabled: boolean;
  onSelect: (countryCode: string) => void;
}

const GuessOptions = ({ options, selectedCode, disabled, onSelect }: GuessOptionsProps) => {
  const deferredSelection = useDeferredValue(selectedCode);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 2
      }}
    >
      {options.map((country) => {
        const isSelected = deferredSelection === country.code;

        return (
          <Button
            key={country.code}
            className="option-card"
            variant={isSelected ? "contained" : "outlined"}
            color={isSelected ? "primary" : "inherit"}
            disabled={disabled}
            onClick={() => onSelect(country.code)}
            sx={{
              display: "flex",
              minHeight: 116,
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 2,
              px: 2.4,
              py: 2.2,
              borderColor: isSelected ? "primary.main" : "rgba(255,255,255,0.14)"
            }}
          >
            <Typography component="span" sx={{ fontSize: "2rem" }}>
              {country.flag}
            </Typography>
            <Stack alignItems="flex-start" spacing={0.5}>
              <Typography component="span" variant="h6">
                {country.name}
              </Typography>
              <Typography component="span" variant="body2" color="text.secondary">
                Tap to lock your guess
              </Typography>
            </Stack>
          </Button>
        );
      })}
    </Box>
  );
};

export default GuessOptions;
