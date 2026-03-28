import { useEffect, useMemo, useState } from "react";

interface F1CarPreviewProps {
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  carNumber: number;
  sponsorAsset?: string | null;
  sponsorPrimaryColor?: string;
  sponsorSecondaryColor?: string;
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

function injectCarNumber(svg: string, carNumber: number) {
  const safeNumber = String(carNumber).replace(/[^0-9]/g, "");
  if (!safeNumber) {
    return svg;
  }

  const numberText = `
  <text
    x="52%"
    y="58%"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="var(--font-heading), sans-serif"
    font-size="42"
    font-weight="700"
    fill="#F9FAFC"
    stroke="#0A0A0A"
    stroke-width="3"
    paint-order="stroke fill"
    letter-spacing="1.2"
  >${safeNumber}</text>`;

  if (svg.includes("</svg>")) {
    return svg.replace("</svg>", `${numberText}\n</svg>`);
  }

  return svg;
}

function stripSvgOuterTag(svg: string) {
  const openTagMatch = svg.match(/<svg[^>]*>/i);
  if (!openTagMatch) {
    return { inner: svg, viewBox: "0 0 100 100" };
  }
  const openTag = openTagMatch[0];
  const viewBoxMatch = openTag.match(/viewBox="([^"]+)"/i);
  const widthMatch = openTag.match(/width="([^"]+)"/i);
  const heightMatch = openTag.match(/height="([^"]+)"/i);

  let viewBox = viewBoxMatch?.[1] ?? "0 0 100 100";
  if (!viewBoxMatch && widthMatch && heightMatch) {
    const width = Number.parseFloat(widthMatch[1]);
    const height = Number.parseFloat(heightMatch[1]);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      viewBox = `0 0 ${width} ${height}`;
    }
  }

  const withoutOpen = svg.replace(/<svg[^>]*>/i, "");
  const inner = withoutOpen.replace(/<\/svg>\s*$/i, "");
  return { inner, viewBox };
}

function recolorSponsorSvg(svg: string, primary: string, secondary: string) {
  const palette = new Set<string>();
  const fillMatches = [...svg.matchAll(/fill="([^"]+)"/gi)];
  const strokeMatches = [...svg.matchAll(/stroke="([^"]+)"/gi)];

  for (const match of [...fillMatches, ...strokeMatches]) {
    const color = match[1].trim();
    const lower = color.toLowerCase();
    if (lower === "none" || lower === "black" || lower === "white" || lower === "currentcolor") {
      continue;
    }
    if (lower.startsWith("url(")) {
      continue;
    }
    palette.add(color);
  }

  const colors = [...palette];
  if (!colors.length) {
    return svg;
  }

  let next = svg;
  const first = colors[0];
  const second = colors[1] ?? colors[0];
  next = applyColorByExistingFills(next, [first], primary);
  next = applyColorByExistingFills(next, [second], secondary);
  return next;
}

function injectSponsor(svg: string, sponsorRawSvg: string | null, sponsorPrimary: string, sponsorSecondary: string) {
  if (!sponsorRawSvg) {
    return svg;
  }

  const recolored = recolorSponsorSvg(sponsorRawSvg, sponsorPrimary, sponsorSecondary);
  const { inner, viewBox } = stripSvgOuterTag(recolored);
  const values = viewBox.split(/\s+/).map((item) => Number.parseFloat(item));
  const vbWidth = Number.isFinite(values[2]) ? values[2] : 100;
  const vbHeight = Number.isFinite(values[3]) ? values[3] : 100;

  // Replace the logo panel region (same dimensions as car logo area).
  const logoX = 163.638;
  const logoY = 58.446;
  const targetWidth = 63.709;
  const targetHeight = 32.342;
  const scale = Math.min(targetWidth / vbWidth, targetHeight / vbHeight);
  const renderedWidth = vbWidth * scale;
  const renderedHeight = vbHeight * scale;
  const x = logoX + (targetWidth - renderedWidth) / 2;
  const y = logoY + (targetHeight - renderedHeight) / 2;

  const sponsorGroup = `
  <rect x="${logoX}" y="${logoY}" width="${targetWidth}" height="${targetHeight}" rx="3" fill="#242424" />
  <g transform="translate(${x} ${y}) scale(${scale})">
    ${inner}
  </g>`;

  if (svg.includes("</svg>")) {
    return svg.replace("</svg>", `${sponsorGroup}\n</svg>`);
  }

  return svg;
}

export function F1CarPreview({
  primaryColor,
  secondaryColor,
  tertiaryColor,
  carNumber,
  sponsorAsset,
  sponsorPrimaryColor = "#F7F8FB",
  sponsorSecondaryColor = "#FF4C4C"
}: F1CarPreviewProps) {
  const [svgSource, setSvgSource] = useState<string | null>(null);
  const [sponsorSource, setSponsorSource] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadSvg() {
      try {
        const response = await fetch("/f1car2.svg", { cache: "no-store" });
        const rawSvg = await response.text();
        if (active) {
          setSvgSource(rawSvg);
        }
      } catch {
        if (active) {
          setSvgSource(null);
        }
      }
    }
    void loadSvg();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadSponsorSvg() {
      if (!sponsorAsset) {
        if (active) {
          setSponsorSource(null);
        }
        return;
      }

      try {
        const response = await fetch(sponsorAsset, { cache: "no-store" });
        const rawSvg = await response.text();
        if (active) {
          setSponsorSource(rawSvg);
        }
      } catch {
        if (active) {
          setSponsorSource(null);
        }
      }
    }

    void loadSponsorSvg();
    return () => {
      active = false;
    };
  }, [sponsorAsset]);

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
      // Fallback for flattened exports without layer names.
      // Keep neutral blacks/greys untouched.
      next = applyColorByExistingFills(next, ["#E60000", "#E63030", "#D50002", "#B80002"], primaryColor);
      next = applyColorByExistingFills(next, ["#BD1212", "#980002"], secondaryColor);
      next = applyColorByExistingFills(next, ["#C9A418", "#FFAA00"], tertiaryColor);
    }

    next = injectSponsor(next, sponsorSource, sponsorPrimaryColor, sponsorSecondaryColor);
    next = injectCarNumber(next, carNumber);
    return next;
  }, [carNumber, primaryColor, secondaryColor, sponsorPrimaryColor, sponsorSecondaryColor, sponsorSource, svgSource, tertiaryColor]);

  return (
    <div className="f1-car-shell" aria-label={`F1 livery preview for car ${carNumber}`}>
      <div className="f1-car-svg-wrap">
        {recoloredSvg ? (
          <div
            className="f1-car-svg"
            role="img"
            aria-label={`F1 livery SVG for car ${carNumber}`}
            dangerouslySetInnerHTML={{ __html: recoloredSvg }}
          />
        ) : (
          <p className="muted small">Loading car SVG preview...</p>
        )}
      </div>
    </div>
  );
}
