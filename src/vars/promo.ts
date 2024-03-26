import { cleanUpBotMessage } from "@/utils/bot";

export let promoText = "";

export function setPromoText(newPromoText: string) {
  promoText = `\n*🎺 _Sponsered Ad_*\n*${cleanUpBotMessage(newPromoText)}*`;
}
