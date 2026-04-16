import { Button, Chip, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { DRAWING_COLORS, DRAWING_SIZES } from "@shared/constants";
import type { DrawingTool } from "@shared/types";

interface ToolBarProps {
  tool: DrawingTool;
  color: string;
  size: number;
  disabled: boolean;
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onUndo: () => void;
  onClear: () => void;
}

const ToolBar = ({
  tool,
  color,
  size,
  disabled,
  onToolChange,
  onColorChange,
  onSizeChange,
  onUndo,
  onClear
}: ToolBarProps) => (
  <Stack className="tool-grid">
    <div className="tool-row">
      <ToggleButtonGroup
        value={tool}
        exclusive
        size="small"
        onChange={(_event, nextTool: DrawingTool | null) => {
          if (nextTool) {
            onToolChange(nextTool);
          }
        }}
      >
        <ToggleButton value="pencil" disabled={disabled}>
          Pencil
        </ToggleButton>
        <ToggleButton value="eraser" disabled={disabled}>
          Eraser
        </ToggleButton>
      </ToggleButtonGroup>

      <Button variant="outlined" disabled={disabled} onClick={onUndo}>
        Undo
      </Button>
      <Button variant="outlined" disabled={disabled} onClick={onClear}>
        Clear
      </Button>
    </div>

    <div className="tool-row">
      {DRAWING_COLORS.map((swatch) => (
        <button
          key={swatch}
          type="button"
          className={`color-swatch ${swatch === color ? "color-swatch--active" : ""}`}
          style={{ backgroundColor: swatch }}
          disabled={disabled}
          aria-label={`Choose ${swatch}`}
          onClick={() => onColorChange(swatch)}
        />
      ))}
    </div>

    <div className="tool-row">
      {DRAWING_SIZES.map((brushSize) => (
        <Chip
          key={brushSize}
          label={`${brushSize}px`}
          color={brushSize === size ? "secondary" : "default"}
          variant={brushSize === size ? "filled" : "outlined"}
          onClick={disabled ? undefined : () => onSizeChange(brushSize)}
        />
      ))}
      <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
        {tool === "eraser" ? "White strokes only" : `Brush: ${size}px`}
      </Typography>
    </div>
  </Stack>
);

export default ToolBar;
