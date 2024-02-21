import { AGE_THRESHOLD } from "@/utils/constants";
import { formatToInternational, toTitleCase } from "@/utils/general";
import { hypeNewPairs, setIndexedTokens } from "@/vars/tokens";
import { teleBot } from "..";
import { cleanUpBotMessage, hardCleanUpBotMessage } from "@/utils/bot";
import { TOKENS_CHANNEL_ID } from "@/utils/env";
import { errorHandler, log } from "@/utils/handlers";
import moment from "moment";
import { PhotonPairData } from "@/types/livePairs";
import { PublicKey } from "@solana/web3.js";
import { solanaConnection } from "@/rpc";
import { trackLpBurn } from "./trackLpBurn";
import { promoText } from "@/vars/promo";
import { InlineKeyboard } from "grammy";

export async function sendAlert(pairs: PhotonPairData[]) {
  try {
    if (!TOKENS_CHANNEL_ID) {
      log("TOKENS_CHANNEL_ID is undefined");
      process.exit(1);
    }

    const newIndexedTokens = [];

    for (const pair of pairs) {
      const {
        created_timestamp,
        tokenAddress,
        cur_liq,
        fdv: marketCap,
      } = pair.attributes;

      newIndexedTokens.push(tokenAddress);
      const age = moment(created_timestamp * 1e3).fromNow();
      const ageMinutes =
        Number(age.replace("minutes ago", "")) ||
        Number(age.replace("a minutes ago", "1")) ||
        Number(age.replace("a few seconds ago", "1"));

      if (hypeNewPairs[tokenAddress]) {
        trackLpBurn(pair);
      } else if (ageMinutes <= AGE_THRESHOLD) {
        const {
          address,
          socials: storedSocials,
          symbol,
          name,
          audit,
        } = pair.attributes;

        // Links
        const tokenLink = `https://solscan.io/token/${tokenAddress}`;
        // const pairLink = `https://solscan.io/account/${address}`;
        const dexScreenerLink = `https://dexscreener.com/solana/${address}`;
        const birdEyeLink = `https://birdeye.so/token/${tokenAddress}?chain=solana`;
        const bonkBotLink = `https://t.me/bonkbot_bot?start=ref_teji6`;
        const magnumLink = `https://t.me/magnum_trade_bot?start=YIUrOaUs`;
        const bananaLink = `https://t.me/BananaGunSolana_bot?start=${tokenAddress}`;
        const unibot = `https://t.me/solana_unibot?start=r-reelchasin`;
        const photonLink = `https://photon-sol.tinyastro.io/@hunnid/${tokenAddress}`;
        const solBotLink = `https://t.me/SolanaTradingBot?start=6VRAlANiH`;

        const now = Math.floor(Date.now() / 1e3);

        const socials = [];
        for (const [social, socialLink] of Object.entries(
          storedSocials || {}
        )) {
          if (socialLink) {
            socials.push(`[${toTitleCase(social)}](${socialLink})`);
          }
        }
        const socialsText = socials.join(" \\| ") || "No links available";

        // Token Info
        const liquidity = cleanUpBotMessage(
          formatToInternational(cur_liq.quote.toFixed(2))
        );
        const liquidityUsd = cleanUpBotMessage(
          formatToInternational(cur_liq.usd)
        );

        const totalSupply = (
          await solanaConnection.getTokenSupply(new PublicKey(tokenAddress))
        ).value.uiAmount;

        // Audit
        const { lp_burned_perc } = audit;
        const isLpStatusOkay = lp_burned_perc === 100;

        // Keyboard
        const keyboard = new InlineKeyboard()
          .url("💳 BONKBot", bonkBotLink)
          .url("🟣 SolBot", solBotLink)
          .row()
          .url("🔫 Magnum", magnumLink)
          .url("🍌 BananaGun", bananaLink)
          .row()
          .url("🦄 Unibot", unibot)
          .url("⚡ Photon", photonLink);

        // Text
        const text = `${hardCleanUpBotMessage(
          name
        )} \\| [${hardCleanUpBotMessage(symbol)}](${tokenLink})
      
🪙 Supply: ${cleanUpBotMessage(formatToInternational(totalSupply || 0))}
💰 MCap: $${cleanUpBotMessage(formatToInternational(marketCap))}
🏦 Lp SOL: ${liquidity} SOL *\\($${liquidityUsd}\\)*

Token Contract: 
\`${tokenAddress}\`

🫧 Socials: ${socialsText}
🔗 Links: [DexScreener](${dexScreenerLink}) \\| [BirdEye](${birdEyeLink}) \\| [SolScan](${tokenLink})
${promoText}`;

        try {
          const message = await teleBot.api.sendMessage(
            TOKENS_CHANNEL_ID,
            text,
            {
              parse_mode: "MarkdownV2",
              // @ts-expect-error Param not found
              disable_web_page_preview: true,
              reply_markup: keyboard,
            }
          );

          hypeNewPairs[tokenAddress] = {
            startTime: now,
            initialMC: marketCap,
            pastBenchmark: 1,
            launchMessage: message.message_id,
            lpStatus: isLpStatusOkay,
          };

          log(`Sent message for ${address} ${name}`);
        } catch (error) {
          log(text);
          errorHandler(error);
        }
      }
    }

    setIndexedTokens(newIndexedTokens);
  } catch (error) {
    errorHandler(error);
  }
}
