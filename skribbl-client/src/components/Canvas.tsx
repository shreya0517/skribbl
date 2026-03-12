// HTML5 canvas drawing + sync

import { useEffect, useRef, useState } from "react";
import { socket, type Point, type Stroke } from "../socket";

interface CanvasProps {
  roomCode: string;
  canDraw: boolean;
}

export const Canvas: React.FC<CanvasProps> = ({ roomCode, canDraw }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const palette = ["#111827", "#ff7a59", "#ffd166", "#06d6a0", "#118ab2", "#8338ec"];
  const activeColor = tool === "eraser" ? "#FFFFFF" : color;

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.length === 0) return;

    ctx.strokeStyle = stroke[0].color;
    ctx.lineWidth = stroke[0].size;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);

    if (stroke.length === 1) {
      ctx.lineTo(stroke[0].x + 0.01, stroke[0].y + 0.01);
    } else {
      stroke.slice(1).forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
    }

    ctx.stroke();
    ctx.closePath();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const handleStart = ({ point }: { point: Point }) => {
      ctx.strokeStyle = point.color;
      ctx.lineWidth = point.size;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    };

    const handleMove = ({ point }: { point: Point }) => {
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    };

    const handleEnd = () => {
      ctx.closePath();
    };

    const handleCanvasState = ({ strokes }: { strokes: Stroke[] }) => {
      clearCanvas();
      setStrokeCount(strokes.length);
      strokes.forEach((stroke) => drawStroke(ctx, stroke));
    };

    const handleCanvasCleared = () => {
      clearCanvas();
      setStrokeCount(0);
    };

    socket.on("draw_start", handleStart);
    socket.on("draw_move", handleMove);
    socket.on("draw_end", handleEnd);
    socket.on("canvas_state", handleCanvasState);
    socket.on("canvas_cleared", handleCanvasCleared);

    return () => {
      socket.off("draw_start", handleStart);
      socket.off("draw_move", handleMove);
      socket.off("draw_end", handleEnd);
      socket.off("canvas_state", handleCanvasState);
      socket.off("canvas_cleared", handleCanvasCleared);
    };
  }, []);

  const getPoint = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      color: activeColor,
      size
    };
  };

  const startStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    e.preventDefault();
    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getPoint(e);
    ctx.strokeStyle = point.color;
    ctx.lineWidth = point.size;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    setDrawing(true);
    socket.emit("draw_start", { roomCode, point });
  };

  const moveStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || !canDraw || activePointerIdRef.current !== e.pointerId) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    e.preventDefault();
    const point = getPoint(e);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    socket.emit("draw_move", { roomCode, point });
  };

  const endStroke = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e && activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) {
      return;
    }
    if (!drawing) {
      activePointerIdRef.current = null;
      return;
    }
    setDrawing(false);
    canvasRef.current?.getContext("2d")?.closePath();
    if (e && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    activePointerIdRef.current = null;
    setStrokeCount((currentCount) => currentCount + 1);
    socket.emit("draw_end", { roomCode });
  };

  const stopActiveStroke = () => {
    if (!drawing) return;
    setDrawing(false);
    canvasRef.current?.getContext("2d")?.closePath();
    activePointerIdRef.current = null;
  };

  const handleUndoClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canDraw || strokeCount === 0) return;
    stopActiveStroke();
    setStrokeCount((currentCount) => Math.max(0, currentCount - 1));
    socket.emit("draw_undo", { roomCode });
  };

  const handleClearClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canDraw || strokeCount === 0) return;
    stopActiveStroke();
    clearCanvas();
    setStrokeCount(0);
    socket.emit("canvas_clear", { roomCode });
  };

  return (
    <div className="canvas-shell">
      <div className="canvas-toolbar">
        <div className="swatch-row">
          {palette.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className={`swatch ${color === swatch ? "swatch-active" : ""}`}
              style={{ backgroundColor: swatch }}
              onClick={() => {
                setColor(swatch);
                setTool("brush");
              }}
              aria-label={`Select ${swatch} color`}
            />
          ))}
        </div>
        <div className="canvas-controls">
          <label className="range-control">
            <span>{tool === "eraser" ? `Eraser ${size}px` : `Brush ${size}px`}</span>
            <input
              type="range"
              min={1}
              max={20}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </label>
          <label className="picker-control">
            <span>Custom</span>
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setTool("brush");
              }}
            />
          </label>
          <div className="canvas-tool-row">
            <button
              type="button"
              className={`secondary-button canvas-action-button ${tool === "brush" ? "canvas-tool-active" : ""}`}
              onClick={() => setTool("brush")}
            >
              Brush
            </button>
            <button
              type="button"
              className={`secondary-button canvas-action-button ${tool === "eraser" ? "canvas-tool-active" : ""}`}
              onClick={() => setTool("eraser")}
            >
              Eraser
            </button>
          </div>
          {canDraw ? (
            <div className="canvas-action-row">
              <button
                type="button"
                className="secondary-button canvas-action-button"
                onClick={handleUndoClick}
                disabled={strokeCount === 0}
              >
                Undo
              </button>
              <button
                type="button"
                className="secondary-button canvas-action-button"
                onClick={handleClearClick}
                disabled={strokeCount === 0}
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className={`canvas-frame ${canDraw ? "canvas-frame-active" : ""}`}>
        <canvas
          className="drawing-surface"
          ref={canvasRef}
          width={800}
          height={500}
          onPointerDown={startStroke}
          onPointerMove={moveStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
        />
      </div>
      <div className="canvas-note-bar">
        <div className="canvas-note">
          {canDraw
            ? tool === "eraser"
              ? "Eraser is active. Drag to remove parts of the sketch."
              : "Use the palette and brush size to guide the round."
            : "Canvas is locked until it is your turn to draw."}
        </div>
        <div className="canvas-note canvas-note-strong">
          {canDraw ? (tool === "eraser" ? "Eraser active" : "Drawer controls enabled") : "Viewer mode"}
        </div>
      </div>
    </div>
  );
};
