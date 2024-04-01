import { cleanUpBotMessage, hardCleanUpBotMessage } from "@/utils/bot";
import { BURN_CHANNEL_ID } from "@/utils/env";
import { teleBot } from "..";
import { hypeNewPairs } from "@/vars/tokens";
import { errorHandler, log } from "@/utils/handlers";
import { PhotonPairData } from "@/types/livePairs";
import { formatToInternational, toTitleCase } from "@/utils/general";
import { promoText } from "@/vars/promo";
import { InlineKeyboard } from "grammy";

export async function trackLpBurn(pair: PhotonPairData) {
  try {
    if (!BURN_CHANNEL_ID) {
      log("BURN_CHANNEL_ID is undefined");
      process.exit(1);
    }

    const {
      address,
      tokenAddress,
      symbol,
      audit,
      socials: storedSocials,
      cur_liq,
      fdv: mcap,
    } = pair.attributes;
    const { lp_burned_perc, top_holders_perc } = audit;
    const { lpStatus, initialMC, ...rest } = hypeNewPairs[tokenAddress];
    const isLpStatusOkay = lp_burned_perc === 100;

    if (!lpStatus && isLpStatusOkay) {
      hypeNewPairs[tokenAddress] = {
        lpStatus: true,
        initialMC,
        ...rest,
      };

      // Links
      const tokenLink = `https://solscan.io/token/${tokenAddress}`;
      const dexScreenerLink = `https://dexscreener.com/solana/${address}`;
      const birdEyeLink = `https://birdeye.so/token/${tokenAddress}?chain=solana`;

      let socialsText = "📱 *Socials*";
      const socials = Object.entries(storedSocials || {});
      if (socials.length) {
        for (const [social, socialLink] of socials) {
          if (socialLink) {
            socialsText += `\n       *├─* [${toTitleCase(
              social
            )}](${socialLink})`;
          }
        }
      } else {
        socialsText += `\n       *├─* No Links Available`;
      }

      const bonkBotLink = `https://t.me/bonkbot_bot?start=ref_teji6_ca_${tokenAddress}`;
      const unibot = `https://t.me/paris_trojanbot?start=r-reelchasin-${tokenAddress}`;

      const change = (mcap / initialMC).toFixed(2);
      const keyboard = new InlineKeyboard()
        .url("🐶 Bonk Bot", bonkBotLink)
        .url("🦄 Unibot", unibot);

      const text = `🔥 *New Liquidity Burn for ${hardCleanUpBotMessage(
        symbol
      )}\\!* 🔥
      
${socialsText}

🏠 *Address:* \`${tokenAddress}\`

💧 *Liquidity*: $${cleanUpBotMessage(
        formatToInternational(Number(cur_liq.usd))
      )}

📊 *MarketCap*
       *├─ Launch:* $${cleanUpBotMessage(formatToInternational(initialMC))}
       *├─ Now:* $${cleanUpBotMessage(
         formatToInternational(mcap)
       )} \\(x${cleanUpBotMessage(change)}\\)

💰 *Holders*
       *├─ LP:* ${cleanUpBotMessage(100 - lp_burned_perc)}%
       *├─ Top10:* ${cleanUpBotMessage(top_holders_perc)}%

🔗 Links: [DexScreener](${dexScreenerLink}) \\| [BirdEye](${birdEyeLink}) \\| [SolScan](${tokenLink})
${promoText}`;

      teleBot.api
        .sendMessage(BURN_CHANNEL_ID, text, {
          parse_mode: "MarkdownV2",
          // @ts-expect-error Param not found
          disable_web_page_preview: true,
          reply_markup: keyboard,
        })
        .then(() => log(`Sent message for ${address}`))
        .catch((e) => {
          log(text);
          errorHandler(e);
        });
    }
  } catch (error) {
    errorHandler(error);
  }
}
