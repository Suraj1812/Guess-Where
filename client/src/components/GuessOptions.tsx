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
    <Box className="option-list">
      {options.map((country) => {
        const isSelected = deferredSelection === country.code;

        return (
          <Button
            key={country.code}
            className="option-card"
            fullWidth
            variant={isSelected ? "contained" : "outlined"}
            color={isSelected ? "primary" : "secondary"}
            disabled={disabled}
            onClick={() => onSelect(country.code)}
            sx={{
              borderColor: isSelected ? "primary.main" : "rgba(203, 213, 225, 0.16)",
              gap: 2,
              px: 2,
              py: 1.5
            }}
          >
            <Typography component="span" sx={{ fontSize: "2rem" }}>
              {country.flag}
            </Typography>
            <Stack alignItems="flex-start" spacing={0.5}>
              <Typography component="span" variant="body1" sx={{ fontWeight: 600 }}>
                {country.name}
              </Typography>
              <Typography component="span" variant="body2" color="text.secondary">
                Tap to choose
              </Typography>
            </Stack>
          </Button>
        );
      })}
    </Box>
  );
};

export default GuessOptions;
