"use client";

import { useState, useRef, useEffect } from "react";
import type { Campaign } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";

async function readDims(file: File): Promise<{ width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const dims = { width: bmp.width, height: bmp.height };
  bmp.close();
  return dims;
}

export function BindingSvg({
  style, frame, strap, accent, logoUrl,
}: {
  style: "step_on" | "strap";
  frame: string;
  strap: string;
  accent: string;
  logoUrl?: string | null;
}) {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-auto max-w-[240px] mx-auto filter drop-shadow-md">
      {/* Baseplate Chassis */}
      <path
        d="M 32 135 L 175 135 C 180 135 183 131 180 126 L 170 115 L 145 115 L 140 122 L 70 122 L 65 115 L 35 115 C 30 115 28 120 30 125 Z"
        fill={frame}
      />
      {/* Heelcup Rising Up */}
      <path
        d="M 32 130 C 26 120 25 100 28 80 C 31 62 42 50 55 45 L 62 55 C 52 59 44 68 41 82 C 39 96 40 115 45 125 Z"
        fill={frame}
        opacity="0.95"
      />
      {/* Highback */}
      <path
        d="M 40 50 C 37 32 45 15 58 12 C 68 10 74 18 73 35 C 72 48 68 65 65 80 L 52 75 C 54 62 57 52 56 42 Z"
        fill={frame}
      />
      {/* Mounting Disc Center */}
      <circle cx="105" cy="126" r="14" fill={accent} opacity="0.3" />
      <circle cx="105" cy="126" r="8" fill={accent} opacity="0.7" />

      {style === "strap" ? (
        <>
          {/* Ankle Strap Main Pad */}
          <path
            d="M 48 92 C 55 72 75 58 100 58 C 114 58 122 66 122 75 C 122 84 108 92 85 96 C 68 98 55 98 48 92 Z"
            fill={strap}
            stroke={accent}
            strokeWidth="1.5"
          />
          {/* Ankle Buckle / Ratchet */}
          <rect x="110" y="66" width="16" height="10" rx="2" fill={accent} />
          <path d="M 118 64 L 118 60 L 126 60 L 126 64 Z" fill={accent} />

          {/* Toe Cap Strap */}
          <path
            d="M 142 120 C 142 108 152 100 166 100 C 176 100 182 106 182 116 C 182 124 172 128 156 128 Z"
            fill={strap}
            stroke={accent}
            strokeWidth="1.2"
          />
          {/* Toe Buckle */}
          <rect x="168" y="104" width="12" height="8" rx="1.5" fill={accent} />
        </>
      ) : (
        <>
          {/* Step-On Cleats & Heel Lever */}
          {/* Heel Release Lever */}
          <path d="M 28 85 L 18 80 L 20 74 L 30 79 Z" fill={accent} />
          {/* Side Cleats / Locking Mechanism */}
          <rect x="145" y="122" width="18" height="7" rx="1.5" fill={accent} />
          <rect x="62" y="122" width="14" height="7" rx="1.5" fill={accent} />
          {/* Low profile Step-On heel bridge */}
          <path d="M 38 100 C 45 92 58 92 65 100 L 62 108 C 56 102 46 102 41 108 Z" fill={frame} opacity="0.8" />
        </>
      )}

      {/* Logo Composited on Highback */}
      {logoUrl ? (
        <image
          href={logoUrl}
          x="44"
          y="20"
          width="26"
          height="26"
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none"
        />
      ) : (
        <rect x="47" y="24" width="20" height="20" rx="3" fill="#ffffff" opacity="0.15" stroke="#ffffff" strokeDasharray="2 2" />
      )}
    </svg>
  );
}

export function BootSvg({
  shell, trim, laces, sole, logoUrl,
}: {
  shell: string;
  trim: string;
  laces: string;
  sole: string;
  logoUrl?: string | null;
}) {
  return (
    <svg viewBox="0 0 180 180" className="w-full h-auto max-w-[240px] mx-auto filter drop-shadow-md">
      {/* Sole & Tread */}
      <path
        d="M 24 148 L 152 148 C 158 148 163 144 161 138 L 156 130 L 140 130 L 138 136 L 68 136 L 65 130 L 26 130 C 22 130 20 136 22 142 Z"
        fill={sole}
      />
      {/* Tread Lugs */}
      <path d="M 32 148 L 32 153 M 44 148 L 44 153 M 56 148 L 56 153 M 120 148 L 120 153 M 132 148 L 132 153 M 144 148 L 144 153" stroke={sole} strokeWidth="3" strokeLinecap="round" />

      {/* Main Shell (Shaft & Forefoot) */}
      <path
        d="M 45 32 C 45 28 50 25 56 25 L 94 25 C 100 25 104 28 103 34 L 98 68 C 98 75 106 88 120 98 L 148 116 C 156 122 158 128 152 132 L 28 132 C 24 128 26 112 30 92 L 42 36 Z"
        fill={shell}
      />

      {/* Heel Counter / Trim Overlay */}
      <path
        d="M 28 132 C 26 115 32 98 38 90 L 46 95 C 40 102 36 116 38 132 Z"
        fill={trim}
      />

      {/* Top Collar / Cuff Trim */}
      <path
        d="M 44 32 L 56 22 L 96 22 L 104 32 L 94 36 L 52 36 Z"
        fill={trim}
      />

      {/* Front Tongue & Laces */}
      {/* Tongue Underlay */}
      <path d="M 92 36 L 101 36 L 126 95 L 140 115 L 128 120 L 98 75 Z" fill={trim} opacity="0.6" />
      {/* Criss-Cross Laces */}
      <path
        d="M 88 42 L 102 46 M 86 52 L 105 57 M 88 64 L 110 70 M 92 78 L 118 84 M 98 90 L 128 98 M 106 102 L 138 112"
        stroke={laces}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Logo Composited on Outer Shaft */}
      {logoUrl ? (
        <image
          href={logoUrl}
          x="52"
          y="48"
          width="28"
          height="28"
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none"
        />
      ) : (
        <rect x="52" y="48" width="28" height="28" rx="4" fill="#ffffff" opacity="0.15" stroke="#ffffff" strokeDasharray="2 2" />
      )}
    </svg>
  );
}

export function GearCustomizer({
  campaign, disabled, sponsorId, existingLogoUrl,
}: {
  campaign?: Campaign;
  disabled?: boolean;
  sponsorId?: string;
  existingLogoUrl?: string | null;
}) {
  // Bindings state
  const [bStyle, setBStyle] = useState<"step_on" | "strap">(campaign?.binding_style === "step_on" ? "step_on" : "strap");
  const [bFrame, setBFrame] = useState(campaign?.binding_frame ?? "#1c1d21");
  const [bStrap, setBStrap] = useState(campaign?.binding_strap ?? "#282a36");
  const [bAccent, setBAccent] = useState(campaign?.binding_accent ?? "#e2e8f0");

  // Boots state
  const [btShell, setBtShell] = useState(campaign?.boot_shell ?? "#18191c");
  const [btTrim, setBtTrim] = useState(campaign?.boot_trim ?? "#3b4252");
  const [btLaces, setBtLaces] = useState(campaign?.boot_laces ?? "#eceff4");
  const [btSole, setBtSole] = useState(campaign?.boot_sole ?? "#111215");

  // Shared Logo Upload state
  const [logoUrl, setLogoUrl] = useState<string | null>(existingLogoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingLogoUrl && !logoUrl) setLogoUrl(existingLogoUrl);
  }, [existingLogoUrl, logoUrl]);

  async function handleLogoUpload(file: File) {
    setUploadMsg(null);
    if (file.type !== "image/png") {
      setUploadMsg({ tone: "bad", text: "Logo must be a transparent PNG file." });
      return;
    }
    if (file.size > 262144) {
      setUploadMsg({ tone: "bad", text: `File is ${Math.round(file.size / 1024)} KB. Limit is 256 KB.` });
      return;
    }
    let dims;
    try {
      dims = await readDims(file);
    } catch {
      setUploadMsg({ tone: "bad", text: "Couldn't read image file. Please re-export as PNG." });
      return;
    }
    if (dims.width !== 512 || dims.height !== 512) {
      setUploadMsg({ tone: "bad", text: `Needs to be exactly 512×512px. Yours is ${dims.width}×${dims.height}px.` });
      return;
    }

    // Instantly show local preview
    const localUrl = URL.createObjectURL(file);
    setLogoUrl(localUrl);

    if (!campaign?.id || !sponsorId) return;

    setUploading(true);
    const supabase = createClient();
    const path = `${sponsorId}/${campaign.id}/gear-logo-${crypto.randomUUID().slice(0, 8)}.png`;
    const { error: upErr } = await supabase.storage.from("sponsor-uploads").upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setUploading(false);
      setUploadMsg({ tone: "bad", text: `Upload failed: ${upErr.message}` });
      return;
    }

    // Upsert creative for both binding_logo and boot_logo
    const { error: dbErr } = await supabase.from("creatives").upsert([
      { campaign_id: campaign.id, sponsor_id: sponsorId, slot_id: "binding_logo", upload_path: path, status: "pending", live_path: null, public_url: null, sha256: null },
      { campaign_id: campaign.id, sponsor_id: sponsorId, slot_id: "boot_logo", upload_path: path, status: "pending", live_path: null, public_url: null, sha256: null },
    ], { onConflict: "campaign_id,slot_id" });

    setUploading(false);
    if (dbErr) {
      setUploadMsg({ tone: "bad", text: dbErr.message });
      return;
    }

    track("art_uploaded", { slot_id: "binding_logo", slot_kind: "binding", result: "ok" });
    track("art_uploaded", { slot_id: "boot_logo", slot_kind: "boot", result: "ok" });
    setUploadMsg({ tone: "ok", text: "Logo uploaded for both bindings and boots. It will be reviewed with your campaign." });
  }

  return (
    <div className="md:col-span-2 border-t border-line pt-6 mt-2 grid gap-6">
      <div>
        <p className="font-semibold text-ink text-lg">Your bindings and boots in the Gear Room <span className="font-normal text-muted text-sm">optional</span></p>
        <p className="hint mt-1">
          Pick custom colors for your bindings and boots and upload your brand logo. Players unlock them in the Gear Room and ride them every run.
          Sponsor listing is $200 each for 30 days in the shop.
        </p>
      </div>

      {/* Shared Logo Upload Box */}
      <div className="rounded-lg border border-line bg-surface-2 p-5 grid md:grid-cols-3 gap-5 items-center">
        <div className="md:col-span-2">
          <p className="font-semibold text-sm">Gear Logo (Shared by Bindings & Boots)</p>
          <p className="text-xs text-muted mt-1">
            Upload a transparent PNG, exactly <strong>512×512px</strong>, up to <strong>256 KB</strong>.
            This single logo sits on the binding highback and the outer boot shaft.
          </p>
          {uploadMsg && (
            <p className={`text-xs mt-2 font-medium ${uploadMsg.tone === "ok" ? "text-ok" : "text-bad"}`}>
              {uploadMsg.tone === "ok" ? "✓ " : "✕ "}{uploadMsg.text}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoUpload(file);
            }}
          />
          <button
            type="button"
            className="btn btn-secondary w-full sm:w-auto"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading logo…" : logoUrl ? "Change gear logo" : "Upload 512×512 PNG"}
          </button>
          <p className="text-xs text-muted">Required: 512×512px transparent PNG</p>
        </div>
      </div>

      {/* Side-by-Side Customizer: Bindings and Boots */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bindings Customizer */}
        <fieldset className="card p-5 border border-line flex flex-col justify-between gap-4">
          <legend className="sr-only">Bindings configuration</legend>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold">Sponsored Bindings</h4>
              <span className="text-xs text-muted font-mono">$200 / 30 days</span>
            </div>

            {/* Live Binding SVG Preview */}
            <div className="rounded-lg bg-surface-2 border border-line p-4 mb-4 flex items-center justify-center min-h-[160px]">
              <BindingSvg style={bStyle} frame={bFrame} strap={bStrap} accent={bAccent} logoUrl={logoUrl} />
            </div>

            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="binding_name">Binding name</label>
                <input
                  id="binding_name"
                  name="binding_name"
                  className="input"
                  maxLength={32}
                  defaultValue={campaign?.binding_name ?? ""}
                  disabled={disabled}
                  placeholder="Apex Pro"
                />
                <p className="hint">Up to 32 characters.</p>
              </div>

              <div>
                <label className="label" htmlFor="binding_tagline">Binding description</label>
                <input
                  id="binding_tagline"
                  name="binding_tagline"
                  className="input"
                  maxLength={90}
                  defaultValue={campaign?.binding_tagline ?? ""}
                  disabled={disabled}
                  placeholder="Instant response on every rail."
                />
                <p className="hint">Up to 90 characters.</p>
              </div>

              <div>
                <label className="label" htmlFor="binding_style">Binding style</label>
                <select
                  id="binding_style"
                  name="binding_style"
                  className="select"
                  value={bStyle}
                  disabled={disabled}
                  onChange={(e) => setBStyle(e.target.value as "step_on" | "strap")}
                >
                  <option value="strap">Strap (Classic two-strap)</option>
                  <option value="step_on">Step-on (Low heel loop, quick cleat)</option>
                </select>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line">
                <div>
                  <label className="label text-xs" htmlFor="binding_frame">Frame</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      id="binding_frame"
                      name="binding_frame"
                      type="color"
                      value={bFrame}
                      disabled={disabled}
                      onChange={(e) => setBFrame(e.target.value)}
                      className="w-8 h-8 rounded border border-line cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      className="input text-xs px-1.5 py-1 uppercase font-mono w-full min-w-0"
                      maxLength={7}
                      value={bFrame}
                      disabled={disabled}
                      onChange={(e) => setBFrame(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label text-xs" htmlFor="binding_strap">Straps</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      id="binding_strap"
                      name="binding_strap"
                      type="color"
                      value={bStrap}
                      disabled={disabled}
                      onChange={(e) => setBStrap(e.target.value)}
                      className="w-8 h-8 rounded border border-line cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      className="input text-xs px-1.5 py-1 uppercase font-mono w-full min-w-0"
                      maxLength={7}
                      value={bStrap}
                      disabled={disabled}
                      onChange={(e) => setBStrap(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label text-xs" htmlFor="binding_accent">Accent</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      id="binding_accent"
                      name="binding_accent"
                      type="color"
                      value={bAccent}
                      disabled={disabled}
                      onChange={(e) => setBAccent(e.target.value)}
                      className="w-8 h-8 rounded border border-line cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      className="input text-xs px-1.5 py-1 uppercase font-mono w-full min-w-0"
                      maxLength={7}
                      value={bAccent}
                      disabled={disabled}
                      onChange={(e) => setBAccent(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Boots Customizer */}
        <fieldset className="card p-5 border border-line flex flex-col justify-between gap-4">
          <legend className="sr-only">Boots configuration</legend>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold">Sponsored Boots</h4>
              <span className="text-xs text-muted font-mono">$200 / 30 days</span>
            </div>

            {/* Live Boot SVG Preview */}
            <div className="rounded-lg bg-surface-2 border border-line p-4 mb-4 flex items-center justify-center min-h-[160px]">
              <BootSvg shell={btShell} trim={btTrim} laces={btLaces} sole={btSole} logoUrl={logoUrl} />
            </div>

            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="boot_name">Boot name</label>
                <input
                  id="boot_name"
                  name="boot_name"
                  className="input"
                  maxLength={32}
                  defaultValue={campaign?.boot_name ?? ""}
                  disabled={disabled}
                  placeholder="Cloud Walker"
                />
                <p className="hint">Up to 32 characters.</p>
              </div>

              <div>
                <label className="label" htmlFor="boot_tagline">Boot description</label>
                <input
                  id="boot_tagline"
                  name="boot_tagline"
                  className="input"
                  maxLength={90}
                  defaultValue={campaign?.boot_tagline ?? ""}
                  disabled={disabled}
                  placeholder="Locked heel. All-day flex."
                />
                <p className="hint">Up to 90 characters.</p>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-line">
                <div>
                  <label className="label text-xs" htmlFor="boot_shell">Shell</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      id="boot_shell"
                      name="boot_shell"
                      type="color"
                      value={btShell}
                      disabled={disabled}
                      onChange={(e) => setBtShell(e.target.value)}
                      className="w-7 h-7 rounded border border-line cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      className="input text-xs px-1 py-1 uppercase font-mono w-full min-w-0"
                      maxLength={7}
                      value={btShell}
                      disabled={disabled}
                      onChange={(e) => setBtShell(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label text-xs" htmlFor="boot_trim">Trim</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      id="boot_trim"
                      name="boot_trim"
                      type="color"
                      value={btTrim}
                      disabled={disabled}
                      onChange={(e) => setBtTrim(e.target.value)}
                      className="w-7 h-7 rounded border border-line cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      className="input text-xs px-1 py-1 uppercase font-mono w-full min-w-0"
                      maxLength={7}
                      value={btTrim}
                      disabled={disabled}
                      onChange={(e) => setBtTrim(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label text-xs" htmlFor="boot_laces">Laces</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      id="boot_laces"
                      name="boot_laces"
                      type="color"
                      value={btLaces}
                      disabled={disabled}
                      onChange={(e) => setBtLaces(e.target.value)}
                      className="w-7 h-7 rounded border border-line cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      className="input text-xs px-1 py-1 uppercase font-mono w-full min-w-0"
                      maxLength={7}
                      value={btLaces}
                      disabled={disabled}
                      onChange={(e) => setBtLaces(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label text-xs" htmlFor="boot_sole">Sole</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      id="boot_sole"
                      name="boot_sole"
                      type="color"
                      value={btSole}
                      disabled={disabled}
                      onChange={(e) => setBtSole(e.target.value)}
                      className="w-7 h-7 rounded border border-line cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      className="input text-xs px-1 py-1 uppercase font-mono w-full min-w-0"
                      maxLength={7}
                      value={btSole}
                      disabled={disabled}
                      onChange={(e) => setBtSole(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
