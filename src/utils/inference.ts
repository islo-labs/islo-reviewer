/**
 * Islo gateway inference support.
 *
 * By default the agent talks to api.anthropic.com and the sandbox's egress
 * gateway injects the tenant's connected Anthropic credential. With
 * `model_provider: islo_inference`, requests go to the Islo inference gateway,
 * which serves non-Anthropic models (Kimi, MiniMax, Qwen, ...) over the
 * Anthropic-compatible wire protocol.
 *
 * No API key is needed: bear-agent's egress proxy recognizes
 * gateway.islo.dev/inference/* requests, strips whatever client credential the
 * agent sent, and authenticates them with the sandbox's own compute-plane
 * identity. Usage bills to the tenant's Islo credits.
 */

/**
 * Accepted `model_provider` values, mapped to their Anthropic-compatible base
 * URL. `islo_inference` matches the value islo-agents' job params use.
 */
const PROVIDER_BASE_URLS: Readonly<Record<string, string>> = {
  islo_inference: "https://gateway.islo.dev/inference/anthropic",
};

/**
 * Models whose upstream rejects the betas Claude Code negotiates by default.
 * Mirrors islo-agents' Claude runtime.
 */
const EXPERIMENTAL_BETAS_DISABLED_MODELS: ReadonlySet<string> = new Set([
  "ship-like/claude-opus-5",
]);

/**
 * Environment overrides for the spawned agent, or `undefined` when no provider
 * is configured (direct Anthropic, the default).
 *
 * Throws on an unrecognized provider so a typo fails loudly instead of
 * silently billing the wrong account.
 */
export function buildProviderEnv(
  model: string,
  modelProvider: string | undefined
): Record<string, string> | undefined {
  if (!modelProvider) {
    if (!model.startsWith("claude-")) {
      console.warn(
        `Warning: model '${model}' does not look like an Anthropic model. ` +
          "Islo gateway models (kimi-*, minimax-*, qwen*, ship-like/*) need model_provider: islo_inference."
      );
    }
    return undefined;
  }

  const baseUrl = PROVIDER_BASE_URLS[modelProvider];
  if (!baseUrl) {
    throw new Error(
      `Unknown model_provider '${modelProvider}'. Supported: ${Object.keys(
        PROVIDER_BASE_URLS
      ).join(", ")}`
    );
  }

  return {
    ANTHROPIC_BASE_URL: baseUrl,
    ...(EXPERIMENTAL_BETAS_DISABLED_MODELS.has(model)
      ? { CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: "1" }
      : {}),
  };
}

/**
 * `env` for the agent SDK's `query()` options: the current environment plus the
 * provider overrides. Returns `undefined` when there is nothing to override, so
 * the SDK keeps its default of inheriting `process.env`.
 */
export function providerQueryEnv(
  model: string,
  modelProvider: string | undefined
): Record<string, string | undefined> | undefined {
  const providerEnv = buildProviderEnv(model, modelProvider);
  if (!providerEnv) return undefined;

  console.log(
    `Routing inference through ${providerEnv.ANTHROPIC_BASE_URL} (model: ${model})`
  );
  return { ...process.env, ...providerEnv };
}
