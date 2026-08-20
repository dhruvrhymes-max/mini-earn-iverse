import { useMini } from "@/lib/miniapp-context";
import type { LanguageCode } from "@/lib/languages";

/**
 * Lightweight key-by-English-string translation layer for the mini app.
 * Missing keys fall back to the English source string, so untranslated
 * copy still renders correctly.
 */
type Dict = Record<string, string>;

const hi: Dict = {
  Home: "होम",
  Tasks: "टास्क",
  Refer: "रेफ़र",
  Profile: "प्रोफ़ाइल",
  Cash: "कैश",
  Admin: "एडमिन",
  "Open admin panel": "एडमिन पैनल खोलें",
  Finance: "फ़ाइनेंस",
  "Bake shop": "शॉप",
  Miners: "माइनर",
  "Withdraw USDT": "USDT निकालें",
  "Convert to USDT": "USDT में बदलें",
  "Withdrawal receipts": "निकासी रसीदें",
  "Transaction history": "लेन-देन इतिहास",
  Deposit: "डिपॉज़िट",
  "Promo code": "प्रोमो कोड",
  "Redeem a promo code": "प्रोमो कोड रिडीम करें",
  "ENTER CODE": "कोड डालें",
  Claim: "क्लेम",
  "Each code can be claimed once per account.": "हर कोड प्रति अकाउंट एक बार ही क्लेम हो सकता है।",
  Community: "कम्युनिटी",
  "Official channel": "आधिकारिक चैनल",
  Support: "सपोर्ट",
  "Not configured": "सेट नहीं है",
  Settings: "सेटिंग्स",
  Language: "भाषा",
  Explorer: "एक्सप्लोरर",
  "Could not redeem that code": "यह कोड रिडीम नहीं हो सका",
  "Couldn't change language": "भाषा नहीं बदली जा सकी",
};

const ru: Dict = {
  Home: "Главная",
  Tasks: "Задания",
  Refer: "Друзья",
  Profile: "Профиль",
  Cash: "Кошелёк",
  Admin: "Админ",
  "Open admin panel": "Открыть админ-панель",
  Finance: "Финансы",
  "Bake shop": "Магазин",
  Miners: "Майнеры",
  "Withdraw USDT": "Вывести USDT",
  "Convert to USDT": "Обменять на USDT",
  "Withdrawal receipts": "Чеки выплат",
  "Transaction history": "История операций",
  Deposit: "Пополнить",
  "Promo code": "Промокод",
  "Redeem a promo code": "Активировать промокод",
  "ENTER CODE": "ВВЕДИТЕ КОД",
  Claim: "Забрать",
  "Each code can be claimed once per account.": "Каждый код можно использовать один раз на аккаунт.",
  Community: "Сообщество",
  "Official channel": "Официальный канал",
  Support: "Поддержка",
  "Not configured": "Не настроено",
  Settings: "Настройки",
  Language: "Язык",
  Explorer: "Исследователь",
  "Could not redeem that code": "Не удалось активировать код",
  "Couldn't change language": "Не удалось сменить язык",
};

const ng: Dict = {
  Home: "Home",
  Tasks: "Tasks",
  Refer: "Invite Padi",
  Profile: "My Profile",
  Cash: "Cash Out",
  Admin: "Admin",
  "Open admin panel": "Open admin panel",
  Finance: "Money",
  "Bake shop": "Market",
  Miners: "Miners",
  "Withdraw USDT": "Cash out USDT",
  "Convert to USDT": "Change to USDT",
  "Withdrawal receipts": "Payout receipts",
  "Transaction history": "Wetin you don do",
  Deposit: "Add money",
  "Promo code": "Promo code",
  "Redeem a promo code": "Use promo code",
  "ENTER CODE": "ENTER CODE",
  Claim: "Collect",
  "Each code can be claimed once per account.": "Each code na one time per account.",
  Community: "Community",
  "Official channel": "Official channel",
  Support: "Support",
  "Not configured": "Never set",
  Settings: "Settings",
  Language: "Language",
  Explorer: "Explorer",
  "Could not redeem that code": "That code no work",
  "Couldn't change language": "We no fit change language",
};

const DICTS: Record<LanguageCode, Dict> = { en: {}, hi, ru, ng };

export function translate(lang: string | null | undefined, key: string): string {
  const d = DICTS[(lang as LanguageCode) ?? "en"] ?? {};
  return d[key] ?? key;
}

/** Returns a `t(key)` function bound to the signed-in member's language. */
export function useT() {
  const { user } = useMini();
  const lang = (user?.language as LanguageCode) || "en";
  return (key: string) => translate(lang, key);
}
