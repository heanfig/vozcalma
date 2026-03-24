/** Plan gratuito: las voces "premade" (biblioteca) no están permitidas por API; hay que usar Voice Design u otra voz propia. */
let cachedNonPremadeVoiceId: string | null = null;

async function resolveVoiceId(apiKey: string): Promise<string> {
  const fromEnv = import.meta.env.ELEVENLABS_VOICE_ID?.trim();
  if (fromEnv) return fromEnv;
  if (cachedNonPremadeVoiceId) return cachedNonPremadeVoiceId;

  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `ElevenLabs list voices ${res.status}: ${errText.slice(0, 400)}`,
    );
  }
  const data = (await res.json()) as {
    voices?: Array<{ voice_id: string; category?: string }>;
  };
  const voices = data.voices ?? [];
  const nonPremade = voices.filter(
    (v) => (v.category ?? "").toLowerCase() !== "premade",
  );
  const picked = nonPremade[0];
  if (!picked) {
    throw new Error(
      "ElevenLabs (plan gratuito): las voces de biblioteca no se pueden usar por API. Creá una voz en Voice Design (elevenlabs.io) y definí ELEVENLABS_VOICE_ID con su ID, o actualizá el plan.",
    );
  }
  cachedNonPremadeVoiceId = picked.voice_id;
  return cachedNonPremadeVoiceId;
}

/** Genera audio MP3 a partir de texto (servidor). */
export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const apiKey = import.meta.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY no configurada");
  }

  const voiceId = await resolveVoiceId(apiKey);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    let extra = "";
    try {
      const j = JSON.parse(errText) as {
        detail?: { message?: string; code?: string };
      };
      if (j.detail?.code === "paid_plan_required") {
        extra =
          " En plan gratuito no podés usar voces de biblioteca por API: creá una voz en Voice Design y poné ELEVENLABS_VOICE_ID, o subí de plan.";
      }
    } catch {
      /* ignore */
    }
    throw new Error(`ElevenLabs ${res.status}: ${errText.slice(0, 500)}${extra}`);
  }

  return res.arrayBuffer();
}
