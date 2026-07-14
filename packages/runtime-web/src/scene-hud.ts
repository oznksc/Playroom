import type { TextBinding } from "./scene-types.js";

export function refreshSceneHud(
  textBindings: TextBinding[],
  coinsCollected: number,
  totalCoins: number,
): void {
  for (const binding of textBindings) {
    let text = binding.baseTemplate;
    if (!/coins?\s*:/i.test(text) && !text.includes("{coins}")) continue;
    text = text
      .replace(/\{coins\}/gi, String(coinsCollected))
      .replace(/Coins:\s*\d+/i, `Coins: ${coinsCollected}`)
      .replace(/coins:\s*\d+/i, `Coins: ${coinsCollected}`);
    if (totalCoins > 0 && !/\/\d+/.test(text) && /Coins:\s*\d+/i.test(text)) {
      text = text.replace(/Coins:\s*(\d+)/i, `Coins: ${coinsCollected}/${totalCoins}`);
    }
    binding.textObject.setText(text);
  }
}
