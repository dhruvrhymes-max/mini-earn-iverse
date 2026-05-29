import { createContext, useContext } from "react";

export type MiniAppContextValue = {
  tenant: any;
  user: any;
  refetchUser: () => void;
};

export const MiniCtx = createContext<MiniAppContextValue>({
  tenant: null,
  user: null,
  refetchUser: () => {},
});

export const useMini = () => useContext(MiniCtx);