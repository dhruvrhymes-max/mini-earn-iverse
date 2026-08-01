export type AdFieldDef = { name: string; label: string; kind?: "text" | "textarea"; placeholder?: string };
export type AdKindDef = { id: string; label: string; hint: string; fields: AdFieldDef[] };

export const AD_KINDS: AdKindDef[] = [
  { id: "monetag", label: "Monetag (rewarded)", hint: "Paste your Monetag zone ID.", fields: [{ name: "zone_id", label: "Zone ID", placeholder: "1234567" }] },
  { id: "adsgram", label: "Adsgram", hint: "Paste your Adsgram block ID.", fields: [{ name: "block_id", label: "Block ID", placeholder: "int-1234" }] },
  { id: "onclicka", label: "Onclicka", hint: "Paste your Onclicka spot/zone ID.", fields: [{ name: "zone_id", label: "Zone / Spot ID", placeholder: "123456" }] },
  { id: "direct_link", label: "Direct link (smart link)", hint: "User opens the link and is rewarded after the wait time.", fields: [
    { name: "url", label: "Direct link URL", placeholder: "https://…" },
    { name: "wait_seconds", label: "Reward after (seconds)", placeholder: "5" },
  ] },
  { id: "ao_code", label: "AO code / HTML snippet", hint: "Paste the network's raw code. Scripts inside run automatically.", fields: [
    { name: "code", label: "Ad code (HTML / JS)", kind: "textarea", placeholder: "<script src='…'></script>" },
    { name: "show_function", label: "Show function name (optional)", placeholder: "show_1234567" },
    { name: "selector", label: "CSS selector to mount into (optional)", placeholder: "#ad-container" },
    { name: "css", label: "Custom CSS (optional)", kind: "textarea", placeholder: ".ad-slot-mount iframe { width:100%; }" },
    { name: "wait_seconds", label: "Reward after (seconds)", placeholder: "3" },
  ] },
  { id: "custom", label: "Custom script URL", hint: "External SDK URL plus optional zone and CSS.", fields: [
    { name: "script_url", label: "Script URL", placeholder: "//cdn.network.com/sdk.js" },
    { name: "zone_id", label: "Zone ID (optional)" },
    { name: "show_function", label: "Show function name (optional)" },
    { name: "css", label: "Custom CSS (optional)", kind: "textarea" },
  ] },
];

export const EMPTY_AD_PROVIDER = {
  id: null as string | null,
  kind: "monetag",
  label: "",
  config: {} as Record<string, string>,
  reward_tokens: 100,
  daily_cap: 20,
  active: true,
  sort_order: 0,
};
