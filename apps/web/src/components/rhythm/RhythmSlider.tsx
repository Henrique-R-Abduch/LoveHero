import * as Slider from "@radix-ui/react-slider";

/** Thin, controlled wrapper — all value/throttle logic lives in the parent. */
export function RhythmSlider({
  value,
  disabled,
  onChange,
  onCommit,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  return (
    <div className="rhythm-slider-block">
      <Slider.Root
        className="rhythm-slider-root"
        value={[value]}
        min={0}
        max={1}
        step={0.001}
        disabled={disabled}
        onValueChange={([next]) => onChange(next)}
        onValueCommit={([next]) => onCommit(next)}
      >
        <Slider.Track className="rhythm-slider-track">
          <Slider.Range className="rhythm-slider-range" />
        </Slider.Track>
        <Slider.Thumb className="rhythm-slider-thumb" aria-label="Ritmo" />
      </Slider.Root>
      <div className="rhythm-slider-labels">
        <span>Mais lento</span>
        <span>Mais intenso</span>
      </div>
    </div>
  );
}
