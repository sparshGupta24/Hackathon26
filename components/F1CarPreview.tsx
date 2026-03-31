import { useEffect, useMemo, useRef, useState } from "react";
import type { LiveryHexBuckets } from "@/lib/carSvgs";
import { recolorRasterByOccurrence } from "@/lib/rasterLivery";

/** % positions inside the livery graphic (top-down view); no px — scales with card size. */
const SVG_NUMBER_UPPER = { left: "50%", top: "44%" } as const;
const SVG_NUMBER_MAIN = { left: "50%", top: "57%" } as const;

const RASTER_NUMBER = {
  leftPct: 50,
  topUpperPct: 44,
  topMainPct: 57
} as const;

interface F1CarPreviewProps {
  templatePath: string;
  hexBuckets: LiveryHexBuckets;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  carNumber: number;
}

function applyColorToNamedLayers(svg: string, prefix: string, color: string) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tagRegex = new RegExp(
    `<([^\\s>]+)([^>]*(?:id|data-name|inkscape:label|sodipodi:insensitive)="(?:#${escaped}|${escaped})[^"]*"[^>]*)>`,
    "gi"
  );

  let matchCount = 0;
  const next = svg.replace(tagRegex, (fullTag, tagName, attributes) => {
    matchCount += 1;
    const withoutFill = attributes.replace(/\sfill="[^"]*"/gi, "");
    const withoutStroke = withoutFill.replace(/\sstroke="[^"]*"/gi, "");
    return `<${tagName}${withoutStroke} fill="${color}" stroke="${color}">`;
  });

  return {
    svg: next,
    matchCount
  };
}

function applyColorByExistingFills(svg: string, colors: string[], target: string) {
  let next = svg;
  for (const color of colors) {
    const escaped = color.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const fillRegex = new RegExp(`fill="${escaped}"`, "gi");
    const strokeRegex = new RegExp(`stroke="${escaped}"`, "gi");
    next = next.replace(fillRegex, `fill="${target}"`);
    next = next.replace(strokeRegex, `stroke="${target}"`);
  }
  return next;
}

function isPngMagic(buffer: ArrayBuffer): boolean {
  const u8 = new Uint8Array(buffer);
  return u8.length >= 8 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47;
}

export function F1CarPreview({
  templatePath,
  hexBuckets,
  primaryColor,
  secondaryColor,
  tertiaryColor,
  carNumber
}: F1CarPreviewProps) {
  const [svgSource, setSvgSource] = useState<string | null>(null);
  const [rasterUrl, setRasterUrl] = useState<string | null>(null);
  const rasterUrlRef = useRef<string | null>(null);
  const [processedRasterUrl, setProcessedRasterUrl] = useState<string | null>(null);
  const processedRasterRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const prevUrl = rasterUrlRef.current;
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
      rasterUrlRef.current = null;
    }

    async function loadTemplate() {
      try {
        const response = await fetch(templatePath, { cache: "no-store" });
        const buf = await response.arrayBuffer();
        if (!active) {
          return;
        }
        if (isPngMagic(buf)) {
          const blob = new Blob([buf], { type: "image/png" });
          const url = URL.createObjectURL(blob);
          rasterUrlRef.current = url;
          setRasterUrl(url);
          setSvgSource(null);
        } else {
          const rawSvg = new TextDecoder().decode(buf);
          setSvgSource(rawSvg);
          setRasterUrl(null);
        }
      } catch {
        if (active) {
          setSvgSource(null);
          setRasterUrl(null);
        }
      }
    }

    void loadTemplate();
    return () => {
      active = false;
    };
  }, [templatePath]);

  useEffect(() => {
    return () => {
      const u = rasterUrlRef.current;
      if (u) {
        URL.revokeObjectURL(u);
        rasterUrlRef.current = null;
      }
      const p = processedRasterRef.current;
      if (p) {
        URL.revokeObjectURL(p);
        processedRasterRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!rasterUrl) {
      if (processedRasterRef.current) {
        URL.revokeObjectURL(processedRasterRef.current);
        processedRasterRef.current = null;
      }
      queueMicrotask(() => {
        setProcessedRasterUrl(null);
      });
      return;
    }

    let cancelled = false;

    void (async () => {
      const url = await recolorRasterByOccurrence(
        rasterUrl,
        primaryColor,
        secondaryColor,
        tertiaryColor
      );
      if (cancelled) {
        if (url) {
          URL.revokeObjectURL(url);
        }
        return;
      }
      if (processedRasterRef.current) {
        URL.revokeObjectURL(processedRasterRef.current);
      }
      processedRasterRef.current = url;
      setProcessedRasterUrl(url);
    })();

    return () => {
      cancelled = true;
      if (processedRasterRef.current) {
        URL.revokeObjectURL(processedRasterRef.current);
        processedRasterRef.current = null;
      }
      queueMicrotask(() => {
        setProcessedRasterUrl(null);
      });
    };
  }, [rasterUrl, primaryColor, secondaryColor, tertiaryColor]);

  const recoloredSvg = useMemo(() => {
    if (!svgSource) {
      return null;
    }

    let next = svgSource;
    let namedLayerMatches = 0;
    for (const prefix of ["primary", "primarycomp"]) {
      const result = applyColorToNamedLayers(next, prefix, primaryColor);
      next = result.svg;
      namedLayerMatches += result.matchCount;
    }
    for (const prefix of ["secondary", "secondarycomp"]) {
      const result = applyColorToNamedLayers(next, prefix, secondaryColor);
      next = result.svg;
      namedLayerMatches += result.matchCount;
    }
    for (const prefix of ["tertiary", "tertiarycomp"]) {
      const result = applyColorToNamedLayers(next, prefix, tertiaryColor);
      next = result.svg;
      namedLayerMatches += result.matchCount;
    }

    if (namedLayerMatches === 0) {
      next = applyColorByExistingFills(next, hexBuckets.primary, primaryColor);
      next = applyColorByExistingFills(next, hexBuckets.secondary, secondaryColor);
      next = applyColorByExistingFills(next, hexBuckets.tertiary, tertiaryColor);
    }

    return next;
  }, [hexBuckets, primaryColor, secondaryColor, svgSource, tertiaryColor]);

  const safeNumber = String(carNumber).replace(/[^0-9]/g, "");

  return (
    <div className="f1-car-shell" aria-label={`F1 livery preview for car ${carNumber}`}>
      <div className="f1-car-svg-wrap">
        {recoloredSvg ? (
          <div className="f1-car-svg-stack">
            <div
              className="f1-car-svg"
              role="img"
              aria-label={`F1 livery for car ${carNumber}`}
              dangerouslySetInnerHTML={{ __html: recoloredSvg }}
            />
            {safeNumber ? (
              <>
                <div
                  className="f1-car-number-overlay f1-car-number-overlay--upper"
                  style={{ left: SVG_NUMBER_UPPER.left, top: SVG_NUMBER_UPPER.top }}
                  aria-hidden
                >
                  {safeNumber}
                </div>
                <div
                  className="f1-car-number-overlay"
                  style={{ left: SVG_NUMBER_MAIN.left, top: SVG_NUMBER_MAIN.top }}
                >
                  {safeNumber}
                </div>
              </>
            ) : null}
          </div>
        ) : rasterUrl ? (
          <div className="f1-car-raster-wrap">
            <img src={processedRasterUrl ?? rasterUrl} className="f1-car-raster" alt="" />
            {!processedRasterUrl ? (
              <div
                className="f1-car-raster-wash"
                aria-hidden
                style={{
                  background: `linear-gradient(105deg, ${primaryColor}40 0%, transparent 42%, ${secondaryColor}35 55%, ${tertiaryColor}30 100%)`
                }}
              />
            ) : null}
            {safeNumber ? (
              <>
                <div
                  className="f1-car-raster-number f1-car-raster-number--upper"
                  style={{
                    left: `${RASTER_NUMBER.leftPct}%`,
                    top: `${RASTER_NUMBER.topUpperPct}%`
                  }}
                  aria-hidden
                >
                  {safeNumber}
                </div>
                <div
                  className="f1-car-raster-number"
                  style={{
                    left: `${RASTER_NUMBER.leftPct}%`,
                    top: `${RASTER_NUMBER.topMainPct}%`
                  }}
                >
                  {safeNumber}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <p className="muted small">Loading car preview…</p>
        )}
      </div>
    </div>
  );
}
