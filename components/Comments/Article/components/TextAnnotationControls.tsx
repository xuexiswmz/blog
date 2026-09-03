import type {
  TextAnnotationColor,
  TextAnnotationLineStyle,
} from "../../Comment/types";

type TextAnnotationControlsProps = {
  selectedColor: TextAnnotationColor;

  /**
   * 新增画线时还没有确定线型，因此允许为空。
   * 编辑已有画线时会传入当前线型。
   */
  selectedLineStyle?: TextAnnotationLineStyle;

  disabled?: boolean;

  onColorSelect: (color: TextAnnotationColor) => void;

  onLineStyleSelect: (lineStyle: TextAnnotationLineStyle) => void;
};

const COLORS: Array<{
  name: TextAnnotationColor;
  label: string;
  value: string;
}> = [
  {
    name: "amber",
    label: "黄色",
    value: "#f59e0b",
  },
  {
    name: "rose",
    label: "红色",
    value: "#f43f5e",
  },
  {
    name: "sky",
    label: "蓝色",
    value: "#0ea5e9",
  },
  {
    name: "emerald",
    label: "绿色",
    value: "#10b981",
  },
  {
    name: "violet",
    label: "紫色",
    value: "#8b5cf6",
  },
];

const LINE_STYLES: Array<{
  name: TextAnnotationLineStyle;
  label: string;
}> = [
  {
    name: "solid",
    label: "直线",
  },
  {
    name: "double",
    label: "双线",
  },
  {
    name: "wavy",
    label: "波浪",
  },
];

export default function TextAnnotationControls({
  selectedColor,
  selectedLineStyle,
  disabled = false,
  onColorSelect,
  onLineStyleSelect,
}: TextAnnotationControlsProps) {
  return (
    <>
      {COLORS.map((color) => (
        <button
          key={color.name}
          type="button"
          aria-label={`选择${color.label}`}
          aria-pressed={selectedColor === color.name}
          title={color.label}
          disabled={disabled}
          onClick={() => {
            onColorSelect(color.name);
          }}
          style={{
            backgroundColor: color.value,
          }}
          className={`
            size-5 shrink-0 rounded-full
            ring-offset-2
            ring-offset-white
            disabled:cursor-not-allowed
            disabled:opacity-50
            dark:ring-offset-[#181818]
            ${
              selectedColor === color.name
                ? "ring-2 ring-slate-700 dark:ring-slate-200"
                : ""
            }
          `}
        />
      ))}

      <span
        className="
          mx-1 h-5 w-px shrink-0
          bg-slate-200
          dark:bg-slate-700
        "
      />

      {LINE_STYLES.map((lineStyle) => (
        <button
          key={lineStyle.name}
          type="button"
          aria-pressed={selectedLineStyle === lineStyle.name}
          disabled={disabled}
          onClick={() => {
            onLineStyleSelect(lineStyle.name);
          }}
          className={`
            shrink-0 rounded-lg
            px-2 py-1.5
            disabled:cursor-not-allowed
            disabled:opacity-50
            ${
              selectedLineStyle === lineStyle.name
                ? `
                  bg-slate-100
                  text-slate-950
                  dark:bg-[#2a2a2a]
                  dark:text-white
                `
                : `
                  hover:bg-slate-100
                  dark:hover:bg-[#242424]
                `
            }
          `}
        >
          {lineStyle.label}
        </button>
      ))}
    </>
  );
}
