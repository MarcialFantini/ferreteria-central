import { useEffect, useState } from 'react';
import { readLS, writeLS } from '../lib/storage';

export interface TourStep {
  /** Clave del target (id en el DOM). Si no hay target, el popover se centra. */
  target?: string;
  title: string;
  body: string;
  /** Posición preferida del popover respecto al target. */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface GuidedTourProps {
  storageKey: string;
  steps: TourStep[];
}

/**
 * Tour guiado con 4-5 pasos, overlay oscuro, popover con navegación.
 * Persiste el "ya visto" en localStorage (storageKey).
 * Si el target no existe en el DOM al activarse, lo muestra centrado.
 */
export default function GuidedTour({ storageKey, steps }: GuidedTourProps) {
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    // Solo mostrar en cliente, después del primer paint
    const seen = readLS<boolean>(storageKey, false);
    if (!seen) {
      const t = setTimeout(() => setActive(true), 600);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  const close = (markSeen: boolean) => {
    setActive(false);
    if (markSeen) writeLS(storageKey, true);
  };

  if (!active) return null;

  const step = steps[stepIdx];
  if (!step) return null;

  const targetEl = step.target ? document.getElementById(step.target) : null;
  const placement = step.placement ?? (targetEl ? 'bottom' : 'center');

  return (
    <div
      className="fixed inset-0 z-[60] no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="absolute inset-0 bg-black/70 anim-fade-up" aria-hidden="true" />
      <TourPopover
        target={targetEl}
        placement={placement}
        title={step.title}
        body={step.body}
        stepNumber={stepIdx + 1}
        totalSteps={steps.length}
        onPrev={stepIdx > 0 ? () => setStepIdx(stepIdx - 1) : null}
        onNext={stepIdx < steps.length - 1 ? () => setStepIdx(stepIdx + 1) : null}
        onSkip={() => close(true)}
        onFinish={() => close(true)}
      />
    </div>
  );
}

interface PopoverProps {
  target: HTMLElement | null;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  title: string;
  body: string;
  stepNumber: number;
  totalSteps: number;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onSkip: () => void;
  onFinish: () => void;
}

function TourPopover({
  target,
  placement,
  title,
  body,
  stepNumber,
  totalSteps,
  onPrev,
  onNext,
  onSkip,
  onFinish,
}: PopoverProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!target) {
      setTargetRect(null);
      return;
    }
    const update = () => setTargetRect(target.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [target]);

  // Calcular posición
  let style: React.CSSProperties = {
    position: 'fixed',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
  };

  if (target && targetRect) {
    const PAD = 12;
    const popoverW = 360;
    const popoverH = 200;
    if (placement === 'bottom') {
      style = {
        position: 'fixed',
        left: Math.max(PAD, Math.min(window.innerWidth - popoverW - PAD, targetRect.left + targetRect.width / 2 - popoverW / 2)),
        top: targetRect.bottom + 16,
      };
    } else if (placement === 'top') {
      style = {
        position: 'fixed',
        left: Math.max(PAD, Math.min(window.innerWidth - popoverW - PAD, targetRect.left + targetRect.width / 2 - popoverW / 2)),
        top: targetRect.top - 16 - popoverH,
      };
    } else if (placement === 'right') {
      style = {
        position: 'fixed',
        left: targetRect.right + 16,
        top: Math.max(PAD, targetRect.top + targetRect.height / 2 - popoverH / 2),
      };
    } else if (placement === 'left') {
      style = {
        position: 'fixed',
        left: targetRect.left - 16 - popoverW,
        top: Math.max(PAD, targetRect.top + targetRect.height / 2 - popoverH / 2),
      };
    }
  }

  return (
    <>
      {/* Highlight ring around target */}
      {target && targetRect && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[61] rounded-lg ring-2 ring-dash-accent"
          style={{
            left: targetRect.left - 6,
            top: targetRect.top - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.15)',
          }}
        />
      )}
      <div
        style={style}
        className="z-[62] w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-dash-line bg-dash-panel p-4 shadow-2xl anim-fade-up"
      >
        <div className="mb-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-dash-ink-3">
          <span>Tour — paso {stepNumber}/{totalSteps}</span>
          <button
            type="button"
            onClick={onSkip}
            className="rounded p-0.5 text-dash-ink-3 hover:bg-dash-panel-2 hover:text-dash-ink-2"
            aria-label="Saltar tour"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <h3 id="tour-title" className="text-[15px] font-semibold tracking-tight text-dash-ink">{title}</h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-dash-ink-2">{body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-[11px] font-medium text-dash-ink-3 hover:text-dash-ink-2"
          >
            Saltar
          </button>
          <div className="flex items-center gap-1.5">
            {onPrev && (
              <button
                type="button"
                onClick={onPrev}
                className="rounded-md border border-dash-line bg-dash-panel px-2.5 py-1 text-[11px] font-medium text-dash-ink-2 hover:bg-dash-panel-2 hover:text-dash-ink"
              >
                ? Atrás
              </button>
            )}
            {onNext ? (
              <button
                type="button"
                onClick={onNext}
                className="rounded-md bg-dash-accent px-3 py-1 text-[11px] font-semibold text-white hover:bg-dash-accent/90"
              >
                Siguiente ?
              </button>
            ) : (
              <button
                type="button"
                onClick={onFinish}
                className="rounded-md bg-dash-success px-3 py-1 text-[11px] font-semibold text-white hover:bg-dash-success/90"
              >
                Empezar
              </button>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-dash-surface">
          <div
            className="h-full bg-dash-accent transition-all duration-300"
            style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </>
  );
}
