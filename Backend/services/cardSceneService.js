const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const SCENE_PROMPTS = {
  STAGE_HERO:
    "A live concert stage scene from beside the attendee, with stage lights, performer energy, speakers, haze, and the crowd visible in the distance. Keep it grounded in a real event venue.",
  CROWD_CELEBRATION:
    "An energetic concert crowd inside a live venue, hands raised, stage lights moving across the audience, visible performer focal point, and strong live-event atmosphere.",
  NEON_POSTER:
    "A stylized concert poster inspired scene with dramatic lighting, crowd silhouettes, bold color treatment, and a premium promotional-art feel while still clearly reading as a real event venue.",
  BACKSTAGE_PASS:
    "A backstage VIP corridor or lounge connected to a live music event, with equipment cases, curtains, pass lanyards, warm practical lights, and an exclusive venue atmosphere.",
  FESTIVAL_HOLO:
    "An outdoor music festival at night with colorful lighting rigs, LED screens, crowd energy, atmospheric glow, and a realistic event-ground environment.",
};

const FALLBACK_SCENE_STYLES = {
  STAGE_HERO: {
    background: "linear-gradient(160deg, #221638, #b42f6b 62%, #f0a202)",
    accent: "#ffd166",
    glow: "rgba(255, 209, 102, 0.45)",
  },
  CROWD_CELEBRATION: {
    background: "linear-gradient(160deg, #0c1b33, #1f6f8b 58%, #f7b801)",
    accent: "#ffef9f",
    glow: "rgba(247, 184, 1, 0.42)",
  },
  NEON_POSTER: {
    background: "linear-gradient(160deg, #140f2d, #413c69 56%, #ff4d8d)",
    accent: "#8ef6ff",
    glow: "rgba(142, 246, 255, 0.4)",
  },
  BACKSTAGE_PASS: {
    background: "linear-gradient(160deg, #161616, #373737 60%, #8a6d3b)",
    accent: "#f6d365",
    glow: "rgba(246, 211, 101, 0.28)",
  },
  FESTIVAL_HOLO: {
    background: "linear-gradient(160deg, #041c32, #115173 56%, #18a0fb)",
    accent: "#a7f3ff",
    glow: "rgba(24, 160, 251, 0.35)",
  },
};

const NEGATIVE_PROMPT = [
  "unrelated location",
  "outer space",
  "underwater",
  "medieval castle",
  "fantasy world",
  "jungle",
  "text",
  "watermark",
  "logo",
  "frame",
  "ui overlay",
  "blurry face",
  "low quality",
].join(", ");

const COMFY_TIMEOUT_MS = 25000;

function sanitizeStylePrompt(value) {
  if (!value || typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function buildScenePrompt({ event, scene, stylePrompt }) {
  const baseScenePrompt =
    SCENE_PROMPTS[scene] || SCENE_PROMPTS.STAGE_HERO;
  const safeStylePrompt = sanitizeStylePrompt(stylePrompt);

  const positivePrompt = [
    "Create a portrait 4:5 event scene background for a collectible experience card.",
    `Event name: ${event.title || "Live Event"}.`,
    `Venue context: ${event.location || "event venue"}.`,
    baseScenePrompt,
    safeStylePrompt
      ? `Visual style only: ${safeStylePrompt}. Keep the venue realistic and event-related.`
      : "Visual style: premium cinematic live-event photography.",
    "Leave some cleaner space in the center and upper-middle for later card text overlay.",
    "No text, no watermark, no logo.",
  ].join(" ");

  return {
    positivePrompt,
    negativePrompt: NEGATIVE_PROMPT,
    stylePrompt: safeStylePrompt,
  };
}

function getUploadsDir() {
  return path.join(__dirname, "..", "uploads", "experience-cards");
}

async function writeGeneratedAsset(buffer, extension) {
  const outDir = getUploadsDir();
  await fs.mkdir(outDir, { recursive: true });
  const fileName = `scene-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${extension}`;
  const absolutePath = path.join(outDir, fileName);
  await fs.writeFile(absolutePath, buffer);
  return `/uploads/experience-cards/${fileName}`;
}

function buildFallbackSvg({ scene, event }) {
  const palette =
    FALLBACK_SCENE_STYLES[scene] || FALLBACK_SCENE_STYLES.STAGE_HERO;
  const safeTitle = String(event.title || "Live Event").replace(/[<>&"]/g, "");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette.background.match(/#(?:[0-9a-fA-F]{3}){1,2}/)?.[0] || "#221638"}" />
          <stop offset="100%" stop-color="${palette.accent}" />
        </linearGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="28" /></filter>
      </defs>
      <rect width="1080" height="1350" fill="url(#bg)" />
      <circle cx="840" cy="220" r="210" fill="${palette.glow}" filter="url(#blur)" />
      <circle cx="250" cy="980" r="240" fill="${palette.glow}" filter="url(#blur)" />
      <path d="M0 970 C160 780, 340 820, 510 940 S900 1150,1080 980 L1080 1350 L0 1350 Z" fill="rgba(8,14,27,0.45)" />
      <path d="M0 860 C180 700, 360 760, 540 850 S900 1040,1080 900" stroke="rgba(255,255,255,0.14)" stroke-width="10" fill="none" />
      <path d="M0 760 C190 620, 420 680, 600 780 S920 900,1080 760" stroke="rgba(255,255,255,0.08)" stroke-width="7" fill="none" />
      <rect x="120" y="138" width="840" height="300" rx="28" fill="rgba(255,255,255,0.06)" />
      <rect x="120" y="138" width="840" height="300" rx="28" stroke="rgba(255,255,255,0.12)" fill="none" />
      <g opacity="0.9">
        <circle cx="220" cy="1080" r="28" fill="rgba(255,255,255,0.18)" />
        <circle cx="320" cy="1045" r="22" fill="rgba(255,255,255,0.13)" />
        <circle cx="410" cy="1105" r="18" fill="rgba(255,255,255,0.12)" />
        <circle cx="495" cy="1070" r="24" fill="rgba(255,255,255,0.16)" />
        <circle cx="590" cy="1110" r="20" fill="rgba(255,255,255,0.11)" />
        <circle cx="680" cy="1055" r="26" fill="rgba(255,255,255,0.15)" />
        <circle cx="780" cy="1090" r="21" fill="rgba(255,255,255,0.12)" />
        <circle cx="870" cy="1040" r="27" fill="rgba(255,255,255,0.18)" />
      </g>
      <rect x="160" y="180" width="220" height="18" rx="9" fill="rgba(255,255,255,0.18)" />
      <rect x="160" y="222" width="360" height="18" rx="9" fill="rgba(255,255,255,0.12)" />
      <rect x="160" y="264" width="280" height="18" rx="9" fill="rgba(255,255,255,0.12)" />
      <rect x="160" y="322" width="640" height="14" rx="7" fill="rgba(255,255,255,0.08)" />
      <desc>${safeTitle}</desc>
    </svg>
  `.trim();
}

async function buildFallbackAsset({ scene, event, stylePrompt, positivePrompt }) {
  const venueReferenceImages = Array.isArray(event.venueReferenceImages)
    ? event.venueReferenceImages.filter(Boolean)
    : [];
  const venueReferenceImage = venueReferenceImages.length
    ? venueReferenceImages[Math.floor(Math.random() * venueReferenceImages.length)]
    : "";

  if (venueReferenceImage) {
    return {
      imageUrl: venueReferenceImage,
      source: "event-reference",
      prompt: positivePrompt,
      warning:
        "Created using the organizer's event place reference photo. Local AI generation is available later on stronger hardware.",
    };
  }

  const svg = buildFallbackSvg({ scene, event, stylePrompt });
  const imageUrl = await writeGeneratedAsset(Buffer.from(svg, "utf8"), "svg");
  return {
    imageUrl,
    source: "fallback-theme",
    prompt: positivePrompt,
    warning:
      "Created with built-in themed scene art. Local AI generation is available later if you move this feature to stronger hardware.",
  };
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), COMFY_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function buildDefaultWorkflow({ positivePrompt, negativePrompt, width, height }) {
  const checkpoint = process.env.COMFYUI_CHECKPOINT || "sd_xl_base_1.0.safetensors";

  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        seed: Math.floor(Math.random() * 10 ** 14),
        steps: Number(process.env.COMFYUI_STEPS || 18),
        cfg: Number(process.env.COMFYUI_CFG || 6.5),
        sampler_name: process.env.COMFYUI_SAMPLER || "euler",
        scheduler: process.env.COMFYUI_SCHEDULER || "normal",
        denoise: 1,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: checkpoint,
      },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: {
        width,
        height,
        batch_size: 1,
      },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: positivePrompt,
        clip: ["4", 1],
      },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: negativePrompt,
        clip: ["4", 1],
      },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["3", 0],
        vae: ["4", 2],
      },
    },
    "9": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: "eventify-experience-card",
        images: ["8", 0],
      },
    },
  };
}

async function generateViaComfyUI(promptPayload) {
  const baseUrl = process.env.COMFYUI_BASE_URL || "http://127.0.0.1:8188";
  const workflow = buildDefaultWorkflow({
    positivePrompt: promptPayload.positivePrompt,
    negativePrompt: promptPayload.negativePrompt,
    width: 1080,
    height: 1350,
  });

  const submitResponse = await fetchWithTimeout(`${baseUrl}/prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: "eventify-mvp",
      prompt: workflow,
    }),
  });
  const submitData = await submitResponse.json();

  if (!submitResponse.ok || !submitData.prompt_id) {
    throw new Error(submitData.error || "Failed to queue ComfyUI prompt.");
  }

  const promptId = submitData.prompt_id;
  const startedAt = Date.now();

  while (Date.now() - startedAt < COMFY_TIMEOUT_MS) {
    await wait(1200);
    const historyResponse = await fetchWithTimeout(`${baseUrl}/history/${promptId}`);
    const historyData = await historyResponse.json();

    const run = historyData[promptId];
    const images = run?.outputs?.["9"]?.images || [];
    if (!images.length) {
      continue;
    }

    const image = images[0];
    const imageUrl =
      `${baseUrl}/view?filename=${encodeURIComponent(image.filename)}` +
      `&subfolder=${encodeURIComponent(image.subfolder || "")}` +
      `&type=${encodeURIComponent(image.type || "output")}`;

    const imageResponse = await fetchWithTimeout(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("ComfyUI generated an image but it could not be downloaded.");
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const storedImageUrl = await writeGeneratedAsset(Buffer.from(arrayBuffer), "png");

    return {
      imageUrl: storedImageUrl,
      source: "comfyui",
      prompt: promptPayload.positivePrompt,
    };
  }

  throw new Error("ComfyUI image generation timed out.");
}

async function generateCardScene({ event, scene, stylePrompt }) {
  const promptPayload = buildScenePrompt({ event, scene, stylePrompt });

  if (String(process.env.COMFYUI_ENABLED || "true").toLowerCase() === "false") {
    return buildFallbackAsset({
      scene,
      event,
      stylePrompt: promptPayload.stylePrompt,
      positivePrompt: promptPayload.positivePrompt,
    });
  }

  try {
    return await generateViaComfyUI(promptPayload);
  } catch (error) {
    console.error("ComfyUI Scene Generation Error:", error.message);
    return buildFallbackAsset({
      scene,
      event,
      stylePrompt: promptPayload.stylePrompt,
      positivePrompt: promptPayload.positivePrompt,
    });
  }
}

module.exports = {
  buildScenePrompt,
  generateCardScene,
};
