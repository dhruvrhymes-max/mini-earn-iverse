import { createContext, useContext } from "react";

export type MiniAppContextValue = {
  tenant: any;
  user: any;
  refetchUser: () => void;
  initData: string | null;
  previewTgId: number | null;
};

export const EMPTY_MINI_TENANT = {
  id: "",
  slug: "",
  name: "Mini App",
  token_name: "Token",
  token_symbol: "TKN",
  token_icon_url: null,
  action_verb: "Mine",
  theme: { primary: "#f59e0b", background: "#0a0a0a", accent: "#fbbf24" },
  economics: { token_per_usdt: 10000, min_withdraw_usdt: 0.1, mining_cycle_hours: 4, mining_rate_per_hour: 100 },
  ad_config: { daily_watch_limit: 20 },
  community: { channel_url: "", support_url: "" },
};

export const EMPTY_MINI_USER = {
  id: "",
  telegram_id: 0,
  first_name: "",
  username: "",
  balance: 0,
  usd_balance: 0,
  mining_started_at: null,
  referral_count: 0,
  wallet_polygon: null,
  wallet_bep20: null,
  wallet_ton: null,
  language: "en",
  onboarded: true,
};

export const MiniCtx = createContext<MiniAppContextValue>({
  tenant: EMPTY_MINI_TENANT,
  user: EMPTY_MINI_USER,
  refetchUser: () => {},
  initData: null,
  previewTgId: null,
});

export const useMini = () => {
  const ctx = useContext(MiniCtx);
  return {
    tenant: ctx.tenant ?? EMPTY_MINI_TENANT,
    user: ctx.user ?? EMPTY_MINI_USER,
    refetchUser: ctx.refetchUser ?? (() => {}),
    initData: ctx.initData ?? null,
    previewTgId: ctx.previewTgId ?? null,
  };
};