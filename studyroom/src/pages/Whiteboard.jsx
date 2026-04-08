import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "studyroom-whiteboard";
const COLORS = [
  "#3e1e68",
  "#e45a92",
  "#ff6b6b",
  "#ff9f1c",
  "#2ec4b6",
  "#3a86ff",
  "#111111",
];

function loadBoardData() {
  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  if (!storedValue) {
    return { legacyImage: null, actions: [] };
  }

  try {
    const parsed = JSON.parse(storedValue);
    return {
      legacyImage: parsed.legacyImage ?? null,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    };
  } catch {
    return {
      legacyImage: storedValue.startsWith("data:image/") ? storedValue : null,
      actions: [],
    };
  }
}

export default function Whiteboard() {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const toolbarRef = useRef(null);
  const textInputRef = useRef(null);
  const actionsRef = useRef([]);
  const currentStrokeRef = useRef(null);
  const legacyImageRef = useRef(null);
  const legacyImageElementRef = useRef(null);
  const [tool, setTool] = useState("brush");
  const [color, setColor] = useState(COLORS[0]);
  const [textDraft, setTextDraft] = useState("");
  const [textPosition, setTextPosition] = useState(null);
  const [textActionCount, setTextActionCount] = useState(0);

  useEffect(() => {
    if (tool === "text" && textPosition && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [tool, textPosition]);

  function syncUiState() {
    setTextActionCount(
      actionsRef.current.filter((action) => action.type === "text").length
    );
  }

  function persistBoard() {
    const payload = {
      version: 1,
      legacyImage: legacyImageRef.current,
      actions: actionsRef.current,
    };

    if (!payload.legacyImage && payload.actions.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function drawStrokeAction(context, action) {
    if (!action.points?.length) return;

    context.save();
    context.globalCompositeOperation =
      action.tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = action.color;
    context.fillStyle = action.color;
    context.lineWidth = action.lineWidth;

    if (action.points.length === 1) {
      const point = action.points[0];
      context.beginPath();
      context.arc(point.x, point.y, action.lineWidth / 2, 0, Math.PI * 2);
      if (action.tool === "eraser") {
        context.fill();
      } else {
        context.fill();
      }
      context.closePath();
      context.restore();
      return;
    }

    context.beginPath();
    context.moveTo(action.points[0].x, action.points[0].y);
    action.points.slice(1).forEach((point) => {
      context.lineTo(point.x, point.y);
    });
    context.stroke();
    context.closePath();
    context.restore();
  }

  function drawTextAction(context, action) {
    context.save();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = action.color;
    context.font = '28px "Coming Soon", cursive';
    context.textBaseline = "top";

    action.lines.forEach((line, index) => {
      context.fillText(line, action.x, action.y + index * 32);
    });

    context.restore();
  }

  function renderCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;

    context.clearRect(0, 0, canvas.width, canvas.height);

    const legacyImage = legacyImageElementRef.current;
    if (legacyImage?.complete && legacyImage.naturalWidth > 0) {
      context.drawImage(legacyImage, 0, 0, cssWidth, cssHeight);
    }

    actionsRef.current.forEach((action) => {
      if (action.type === "stroke") {
        drawStrokeAction(context, action);
      }

      if (action.type === "text") {
        drawTextAction(context, action);
      }
    });
  }

  useEffect(() => {
    const initialBoard = loadBoardData();
    actionsRef.current = initialBoard.actions;
    legacyImageRef.current = initialBoard.legacyImage;

    if (initialBoard.legacyImage) {
      const image = new Image();
      image.onload = renderCanvas;
      image.src = initialBoard.legacyImage;
      legacyImageElementRef.current = image;
    }

    syncUiState();

    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const toolbar = toolbarRef.current;
    if (!canvas || !wrapper || !toolbar) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    function resizeCanvas() {
      const wrapperRect = wrapper.getBoundingClientRect();
      const toolbarRect = toolbar.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const wrapperStyles = window.getComputedStyle(wrapper);
      const paddingX =
        parseFloat(wrapperStyles.paddingLeft) + parseFloat(wrapperStyles.paddingRight);
      const paddingBottom = parseFloat(wrapperStyles.paddingBottom);
      const cssWidth = Math.max(1, Math.floor(wrapper.clientWidth - paddingX));
      const availableHeight =
        window.innerHeight -
        wrapperRect.top -
        toolbarRect.height -
        paddingBottom -
        24;
      const cssHeight = Math.max(320, Math.floor(availableHeight));

      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.lineJoin = "round";
      context.lineCap = "round";

      renderCanvas();
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(wrapper);
    observer.observe(toolbar);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      observer.disconnect();
    };
  }, []);

  function getPos(event) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in event && event.touches[0]) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event) {
    if ("touches" in event) {
      event.preventDefault();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const { x, y } = getPos(event);

    if (tool === "text") {
      setTextPosition({ x, y });
      setTextDraft("");
      return;
    }

    const nextStroke = {
      type: "stroke",
      tool,
      color,
      lineWidth: tool === "eraser" ? 18 : 4,
      points: [{ x, y }],
    };

    currentStrokeRef.current = nextStroke;
    drawStrokeAction(context, nextStroke);
  }

  function draw(event) {
    if (!currentStrokeRef.current) return;

    if ("touches" in event) {
      event.preventDefault();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const { x, y } = getPos(event);
    const stroke = currentStrokeRef.current;
    stroke.points.push({ x, y });

    const lastPoint = stroke.points[stroke.points.length - 2];
    context.save();
    context.globalCompositeOperation =
      stroke.tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.lineWidth;
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(x, y);
    context.stroke();
    context.closePath();
    context.restore();
  }

  function stopDrawing() {
    if (!currentStrokeRef.current) return;

    actionsRef.current = [...actionsRef.current, currentStrokeRef.current];
    currentStrokeRef.current = null;
    syncUiState();
    persistBoard();
  }

  function commitText() {
    if (!textPosition) {
      setTextPosition(null);
      setTextDraft("");
      return;
    }

    const trimmedText = textDraft.trim();
    if (!trimmedText) {
      setTextPosition(null);
      setTextDraft("");
      return;
    }

    const nextTextAction = {
      type: "text",
      color,
      x: textPosition.x,
      y: textPosition.y,
      lines: trimmedText.split("\n"),
    };

    actionsRef.current = [...actionsRef.current, nextTextAction];
    setTextPosition(null);
    setTextDraft("");
    syncUiState();
    renderCanvas();
    persistBoard();
  }

  function cancelText() {
    setTextPosition(null);
    setTextDraft("");
  }

  function undoLastText() {
    cancelText();

    const lastTextIndex = [...actionsRef.current]
      .map((action, index) => ({ action, index }))
      .reverse()
      .find(({ action }) => action.type === "text")?.index;

    if (lastTextIndex === undefined) return;

    actionsRef.current = actionsRef.current.filter(
      (_, index) => index !== lastTextIndex
    );
    syncUiState();
    renderCanvas();
    persistBoard();
  }

  function clearBoard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    currentStrokeRef.current = null;
    actionsRef.current = [];
    legacyImageRef.current = null;
    legacyImageElementRef.current = null;
    setTextPosition(null);
    setTextDraft("");
    context.clearRect(0, 0, canvas.width, canvas.height);
    syncUiState();
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const textBoxWidth = 320;
  const canvasWidth = canvasRef.current?.clientWidth ?? 0;
  const maxTextLeft =
    canvasWidth > 0 ? Math.max(12, canvasWidth - textBoxWidth - 12) : textPosition?.x ?? 12;

  return (
    <div
      ref={wrapperRef}
      className="box-border flex min-h-[calc(100vh-88px)] w-full flex-col overflow-hidden bg-[#fff0f3] p-4"
    >
      <div
        ref={toolbarRef}
        className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-[#3e1e68]/20 bg-white/90 p-3 shadow-sm"
      >
        <span className="text-sm font-semibold text-[#3e1e68]">Tool:</span>
        <button
          type="button"
          onClick={() => setTool("brush")}
          className={`rounded-md px-3 py-1 text-sm ${
            tool === "brush"
              ? "bg-[#3e1e68] text-white"
              : "bg-[#f3d5df] text-[#7a2f54]"
          }`}
        >
          Brush
        </button>
        <button
          type="button"
          onClick={() => setTool("eraser")}
          className={`rounded-md px-3 py-1 text-sm ${
            tool === "eraser"
              ? "bg-[#3e1e68] text-white"
              : "bg-[#f3d5df] text-[#7a2f54]"
          }`}
        >
          Eraser
        </button>
        <button
          type="button"
          onClick={() => {
            setTool("text");
            setTextPosition(null);
            setTextDraft("");
          }}
          className={`rounded-md px-3 py-1 text-sm ${
            tool === "text"
              ? "bg-[#3e1e68] text-white"
              : "bg-[#f3d5df] text-[#7a2f54]"
          }`}
        >
          Text
        </button>
        {tool === "text" ? (
          <span className="text-xs text-[#7a5aa6]">
            click anywhere on canvas to add text 
          </span>
        ) : null}

        <span className="ml-2 text-sm font-semibold text-[#3e1e68]">Colors:</span>
        <div className="flex items-center gap-2">
          {COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => {
                setColor(swatch);
                if (tool !== "text") {
                  setTool("brush");
                }
              }}
              className={`h-6 w-6 rounded-full border-2 ${
                color === swatch && tool !== "eraser"
                  ? "border-[#111111]"
                  : "border-white"
              }`}
              style={{ backgroundColor: swatch }}
              aria-label={`Color ${swatch}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={undoLastText}
          disabled={textActionCount === 0}
          className="rounded-md bg-[#fff0f3] px-3 py-1.5 text-sm text-[#8f5576] shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Undo Text
        </button>
        <button
          type="button"
          onClick={clearBoard}
          className="rounded-md bg-[#e45a92] px-3 py-1.5 text-sm text-white hover:bg-[#ffacac]"
        >
          Clear
        </button>
      </div>

      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          className="block min-h-[320px] w-full flex-1 rounded-xl border border-[#3e1e68]/20 bg-white shadow-sm touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {tool === "text" && textPosition ? (
          <div
            className="absolute z-10 w-[min(320px,calc(100%-24px))] rounded-2xl border-2 border-dashed border-[#e45a92] bg-white/95 p-3 shadow-lg"
            style={{
              left: Math.max(12, Math.min(textPosition.x, maxTextLeft)),
              top: Math.max(12, textPosition.y),
            }}
          >
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-[#a076c9]">
              <span>text box</span>
              <span>ctrl enter = done</span>
            </div>
            <textarea
              ref={textInputRef}
              value={textDraft}
              onChange={(event) => setTextDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  cancelText();
                }

                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  commitText();
                }
              }}
              placeholder="start typing here..."
              className="min-h-[140px] w-full resize-none border-0 bg-transparent p-1 text-[28px] leading-8 text-[#3e1e68] outline-none placeholder:text-[#b895d4]"
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelText}
                className="rounded-full bg-[#fff0f3] px-3 py-1.5 text-sm text-[#8f5576]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitText}
                className="rounded-full bg-[#e45a92] px-3 py-1.5 text-sm text-white"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
