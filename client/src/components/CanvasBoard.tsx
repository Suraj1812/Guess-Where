import { useEffect, useMemo, useRef, useState } from "react";
import { Typography } from "@mui/material";
import type { DrawingTool, StrokePoint, StrokeSnapshot } from "@shared/types";

interface CanvasBoardProps {
  strokes: StrokeSnapshot[];
  liveStrokes: StrokeSnapshot[];
  canDraw: boolean;
  tool: DrawingTool;
  color: string;
  size: number;
  wordMask: string;
  centerMessage: string;
  highlight: boolean;
  onStartStroke: (stroke: {
    strokeId: string;
    point: StrokePoint;
    color: string;
    size: number;
    tool: DrawingTool;
  }) => Promise<string | null>;
  onMoveStroke: (stroke: { strokeId: string; point: StrokePoint }) => Promise<void>;
  onEndStroke: (stroke: { strokeId: string; point?: StrokePoint }) => Promise<void>;
}

const drawStroke = (context: CanvasRenderingContext2D, stroke: StrokeSnapshot) => {
  if (stroke.points.length === 0) {
    return;
  }

  context.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
  context.lineWidth = stroke.size;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (stroke.points.length === 1) {
    const [point] = stroke.points;
    context.beginPath();
    context.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2);
    context.fillStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
    context.fill();
    return;
  }

  context.beginPath();
  context.moveTo(stroke.points[0].x, stroke.points[0].y);

  for (let index = 1; index < stroke.points.length - 1; index += 1) {
    const currentPoint = stroke.points[index];
    const nextPoint = stroke.points[index + 1];
    const midPointX = (currentPoint.x + nextPoint.x) / 2;
    const midPointY = (currentPoint.y + nextPoint.y) / 2;

    context.quadraticCurveTo(currentPoint.x, currentPoint.y, midPointX, midPointY);
  }

  const lastPoint = stroke.points[stroke.points.length - 1];
  context.lineTo(lastPoint.x, lastPoint.y);
  context.stroke();
};

const CanvasBoard = ({
  strokes,
  liveStrokes,
  canDraw,
  tool,
  color,
  size,
  wordMask,
  centerMessage,
  highlight,
  onStartStroke,
  onMoveStroke,
  onEndStroke
}: CanvasBoardProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [localStroke, setLocalStroke] = useState<StrokeSnapshot | null>(null);

  const renderedStrokes = useMemo(
    () => [...strokes, ...liveStrokes, ...(localStroke ? [localStroke] : [])],
    [liveStrokes, localStroke, strokes]
  );

  useEffect(() => {
    const node = containerRef.current;

    if (!node) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height
      });
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || dimensions.width === 0 || dimensions.height === 0) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * ratio;
    canvas.height = dimensions.height * ratio;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, dimensions.width, dimensions.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, dimensions.width, dimensions.height);

    renderedStrokes.forEach((stroke) => {
      drawStroke(context, stroke);
    });
  }, [dimensions, renderedStrokes]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): StrokePoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const handlePointerDown = async (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) {
      return;
    }

    const point = getPoint(event);
    const strokeId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nextStroke: StrokeSnapshot = {
      id: strokeId,
      color,
      size,
      tool,
      points: [point]
    };

    const error = await onStartStroke({
      strokeId,
      point,
      color,
      size,
      tool
    });

    if (error) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setLocalStroke(nextStroke);
  };

  const handlePointerMove = async (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || !localStroke) {
      return;
    }

    const point = getPoint(event);
    setLocalStroke((currentStroke) =>
      currentStroke
        ? {
            ...currentStroke,
            points: [...currentStroke.points, point]
          }
        : currentStroke
    );
    await onMoveStroke({ strokeId: localStroke.id, point });
  };

  const finishLocalStroke = async (point?: StrokePoint) => {
    if (!localStroke) {
      return;
    }

    const strokeId = localStroke.id;
    setLocalStroke(null);
    await onEndStroke({ strokeId, point });
  };

  const handlePointerUp = async (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!localStroke) {
      return;
    }

    await finishLocalStroke(getPoint(event));
  };

  const handlePointerLeave = async () => {
    if (!localStroke) {
      return;
    }

    await finishLocalStroke();
  };

  return (
    <div ref={containerRef} className={`canvas-frame ${highlight ? "guess-flash" : ""}`}>
      <canvas
        ref={canvasRef}
        className={`canvas-surface ${canDraw ? "" : "canvas-surface--locked"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />

      <div className="canvas-overlay">
        <div className="word-mask">{wordMask}</div>
      </div>

      <div className="canvas-center-overlay">
        <Typography
          sx={{
            px: 2,
            py: 1.25,
            borderRadius: 4,
            backgroundColor: "rgba(15, 23, 42, 0.72)",
            color: "#f8fafc",
            fontWeight: 700,
            textAlign: "center"
          }}
        >
          {centerMessage}
        </Typography>
      </div>
    </div>
  );
};

export default CanvasBoard;
