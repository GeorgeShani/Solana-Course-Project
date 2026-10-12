import { chromium, devices } from "@playwright/test";
const OUT = "C:/Users/HP/AppData/Local/Temp/claude/C--Users-HP-Desktop-Solana-Course-Project/d866690b-c4e6-4b79-82d5-f5ec856d7f12/scratchpad/shots";
const b = await chromium.launch();
const sets = [["xl",{viewport:{width:1919,height:920}}],["d",{viewport:{width:1366,height:768}}],["t",{viewport:{width:820,height:1180}}],["m",{...devices["Pixel 7"]}],["s",{viewport:{width:360,height:640},isMobile:true,hasTouch:true}]];
for (const [label, opts] of sets) {
  const ctx = await b.newContext(opts);
  await ctx.addInitScript(() => { localStorage.setItem("relay:welcome:v2","seen"); sessionStorage.setItem("relay:curtain-seen","1"); sessionStorage.setItem("relay:showtime","1"); });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log(label, "pageerror:", e.message.slice(0, 200)));
  await p.goto("http://localhost:5173/"); await p.waitForTimeout(4500);
  await p.screenshot({ path: OUT + "/" + label + "-ticket.png" });
  const fit = await p.evaluate(() => [...document.querySelectorAll(".scr")].slice(0, 5).map((e) => e.scrollHeight - e.clientHeight));
  console.log(label, "overflow:", fit.join(","));
  await p.waitForTimeout(3500);
  await p.locator(".cord").click(); await p.waitForTimeout(6200);
  await p.screenshot({ path: OUT + "/" + label + "-interval.png" });
  await ctx.close();
}
await b.close();
