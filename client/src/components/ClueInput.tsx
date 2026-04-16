import { useEffect, useState } from "react";
import { Alert, Autocomplete, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { CLUE_MAX_LENGTH } from "@shared/constants";
import { COUNTRIES, type Country } from "@shared/countries";

interface ClueInputProps {
  roundNumber: number;
  disabled: boolean;
  onSubmit: (clue: string, countryCode: string) => Promise<string | null>;
}

const ClueInput = ({ roundNumber, disabled, onSubmit }: ClueInputProps) => {
  const [clue, setClue] = useState("");
  const [country, setCountry] = useState<Country | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setClue("");
    setCountry(null);
    setError(null);
    setSubmitting(false);
  }, [roundNumber]);

  const handleSubmit = async () => {
    if (!clue.trim()) {
      setError("Add a short clue before starting the round.");
      return;
    }

    if (!country) {
      setError("Pick the country your clue points to.");
      return;
    }

    setSubmitting(true);
    const responseError = await onSubmit(clue.trim(), country.code);
    setSubmitting(false);

    if (responseError) {
      setError(responseError);
      return;
    }

    setError(null);
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Your turn to host
        </Typography>
        <Typography color="text.secondary">
          Write one short clue and choose the country it refers to. Everyone else will guess from four options.
        </Typography>
      </Box>

      <TextField
        label="Short clue"
        placeholder="Example: Desert skyscrapers and huge malls"
        value={clue}
        disabled={disabled || submitting}
        inputProps={{ maxLength: CLUE_MAX_LENGTH }}
        helperText={`${clue.length}/${CLUE_MAX_LENGTH}`}
        onChange={(event) => setClue(event.target.value)}
      />

      <Autocomplete
        options={COUNTRIES}
        value={country}
        disabled={disabled || submitting}
        getOptionLabel={(option) => `${option.flag} ${option.name}`}
        onChange={(_event, nextCountry) => setCountry(nextCountry)}
        renderInput={(params) => <TextField {...params} label="Country" placeholder="Search countries" />}
      />

      <Button variant="contained" size="large" disabled={disabled || submitting} onClick={handleSubmit}>
        {submitting ? "Locking clue..." : "Start Guessing"}
      </Button>

      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
};

export default ClueInput;
