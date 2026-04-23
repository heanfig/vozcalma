import { useEffect, useState } from "react";
import CopyButton from "./CopyButton";
import { formatCOP, formatUSD, formatDate, formatNumber } from "../../lib/format";

interface Cost {
  id: string;
  llm_model: string | null;
  llm_generation_id: string | null;
  llm_prompt_tokens: number | null;
  llm_completion_tokens: number | null;
  llm_total_tokens: number | null;
  llm_cost_usd: number | null;
  tts_chars: number | null;
  tts_cost_usd: number | null;
  total_cost_usd: number | null;
  duration_ms: number | null;
  source: "llm" | "pregen" | null;
  created_at: string;
}

interface PlayLink {
  token: string;
  audio_url: string;
  expires_at: string;
  source: string | null;
  created_at: string;
}

interface Artifact {
  script_text: string | null;
  plan_json: Record<string, unknown> | null;
  audio_status: "pending" | "ready" | "failed" | null;
  audio_error: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface SessionData {
  session: Record<string, unknown>;
  costs: Cost[];
  play_links: PlayLink[];
  coupon_redemptions: Array<{
    id: string;
    coupon_code: string;
    redeemed_at: string;
    discount_cents_applied: number;
  }>;
  artifact: Artifact | null;
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export default function SessionDetail({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/sessions/${sessionId}`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error || "Error");
          return;
        }
        setData(body);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (error)
    return (
      <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-4 text-sm text-rose-700 dark:text-rose-300">
        {error}
      </div>
    );
  if (!data) return <div className="text-slate-500">Cargando…</div>;

  const s = data.session as Record<string, unknown>;
  const intake = (s.intake_json as Record<string, unknown>) || {};
  const totalCost = data.costs.reduce(
    (acc, c) => acc + Number(c.total_cost_usd || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Sesión
            </div>
            <code className="text-sm text-slate-700 dark:text-slate-200 font-mono">
              {sessionId}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                s.type === "deep"
                  ? "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"
                  : "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300"
              }`}
            >
              {String(s.type)}
            </span>
            {s.is_paid ? (
              <span className="rounded-full px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                Pagado
              </span>
            ) : (
              <span className="rounded-full px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Sin pagar
              </span>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 text-sm">
          <Field label="Nombre" value={(intake.nombre as string) || "—"} />
          <Field label="Email" value={(intake.email as string) || "—"} />
          <Field label="Creada" value={formatDate(s.created_at as string)} />
          <Field
            label="Pagada"
            value={s.paid_at ? formatDate(s.paid_at as string) : "—"}
          />
          <Field
            label="Monto"
            value={formatCOP((s.amount_cents as number) || 0)}
          />
          <Field
            label="Cupón"
            value={(s.coupon_code as string) || "—"}
          />
          <Field
            label="UTM"
            value={
              s.utm_source
                ? `${s.utm_source}${s.utm_campaign ? " · " + s.utm_campaign : ""}`
                : "—"
            }
          />
          <Field
            label="Ref. pago"
            value={(s.payment_reference as string) || "—"}
          />
          <Field
            label="Tx ID"
            value={(s.payment_transaction_id as string) || "—"}
          />
        </dl>
      </div>

      <Section title="Audio y links compartibles">
        {data.play_links.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay links todavía — la meditación aún no fue generada.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.play_links.map((pl) => {
              const playUrl = `${getBaseUrl()}/p/${pl.token}`;
              return (
                <li
                  key={pl.token}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono truncate">{playUrl}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {pl.source || "—"} · expira{" "}
                      {formatDate(pl.expires_at)}
                    </div>
                  </div>
                  <CopyButton value={playUrl} />
                  <a
                    href={playUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      open_in_new
                    </span>
                    Abrir
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title={`Costos (${formatUSD(totalCost)} total)`}>
        {data.costs.length === 0 ? (
          <p className="text-sm text-slate-500">Sin costos registrados.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Fuente</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Modelo</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase">Tokens</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase">LLM USD</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase">TTS chars</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase">TTS USD</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase">Total</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase">ms</th>
                </tr>
              </thead>
              <tbody>
                {data.costs.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-3 py-2">{c.source || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {c.llm_model || "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatNumber(c.llm_total_tokens)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {c.llm_cost_usd != null
                        ? formatUSD(c.llm_cost_usd)
                        : <span className="text-amber-500">calc…</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatNumber(c.tts_chars)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatUSD(c.tts_cost_usd)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {formatUSD(c.total_cost_usd)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {c.duration_ms ? formatNumber(c.duration_ms) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {data.coupon_redemptions.length > 0 && (
        <Section title="Cupón">
          <ul className="space-y-2">
            {data.coupon_redemptions.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-sm"
              >
                <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {r.coupon_code}
                </code>
                <span className="text-slate-500">
                  {formatDate(r.redeemed_at)} — descuento{" "}
                  {formatCOP(r.discount_cents_applied)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Intake JSON">
        <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto">
          {JSON.stringify(intake, null, 2)}
        </pre>
      </Section>

      {data.artifact?.script_text && (
        <Section title="Script generado (LLM)">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 -mt-2">
            <span>
              {data.artifact.script_text.length.toLocaleString()} caracteres
              {data.artifact.updated_at
                ? ` · actualizado ${formatDate(data.artifact.updated_at)}`
                : ""}
            </span>
            <CopyButton value={data.artifact.script_text} />
          </div>
          <pre className="text-sm whitespace-pre-wrap bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg p-4 max-h-[32rem] overflow-y-auto border border-slate-200 dark:border-slate-800">
            {data.artifact.script_text}
          </pre>
        </Section>
      )}

      {data.artifact?.plan_json && (
        <Section title="Plan JSON">
          <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
            {JSON.stringify(data.artifact.plan_json, null, 2)}
          </pre>
        </Section>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-slate-900 dark:text-slate-100 break-all">
        {value}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {title}
      </h3>
      {children}
    </section>
  );
}
