import { chromium } from "playwright";
const b = await chromium.launch();
for (const [w,h,n] of [[711,604,"short"],[390,640,"ms"]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto("http://localhost:5173/");
  await p.waitForTimeout(2500); await p.getByRole("button",{name:"Explore ideas"}).click(); await p.waitForTimeout(1500);
  await p.keyboard.press("j"); await p.waitForTimeout(1500);
  await p.screenshot({ path: `C:/Users/HP/AppData/Local/Temp/claude/C--Users-HP-Desktop-Solana-Course-Project/d866690b-c4e6-4b79-82d5-f5ec856d7f12/scratchpad/shots/${n}.png` });
}
await b.close();
