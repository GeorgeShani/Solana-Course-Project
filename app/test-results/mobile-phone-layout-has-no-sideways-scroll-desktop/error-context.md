# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile.spec.ts >> phone layout >> / has no sideways scroll
- Location: e2e\mobile.spec.ts:41:5

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 1
Received:    665.852783203125
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main"
  - generic [ref=e3]:
    - banner [ref=e4]:
      - link "Relay, go to Discover" [ref=e5] [cursor=pointer]:
        - /url: /
        - generic [ref=e14]: RELAY
      - navigation "Main" [ref=e23]:
        - list [ref=e24]:
          - listitem [ref=e25]:
            - link "Discover" [ref=e26] [cursor=pointer]:
              - /url: /
          - listitem [ref=e27]:
            - link "Updates" [ref=e28] [cursor=pointer]:
              - /url: /updates
          - listitem [ref=e29]:
            - link "Watchlist" [ref=e30] [cursor=pointer]:
              - /url: /watchlist
          - listitem [ref=e31]:
            - link "Plans" [ref=e32] [cursor=pointer]:
              - /url: /plans
      - link "Account" [ref=e34] [cursor=pointer]:
        - /url: /account
    - main [ref=e38]:
      - generic [ref=e39]:
        - 'button "Pull the cord: show how Relay works" [ref=e41] [cursor=pointer]'
        - heading "Discover" [level=1] [ref=e46]
        - navigation "Show ideas by" [ref=e47]:
          - link "Everyone" [ref=e48] [cursor=pointer]:
            - /url: /
          - link "Arthur Hayes" [ref=e54] [cursor=pointer]:
            - /url: /?trader=arthur-hayes
          - link "Benjamin Cowen" [ref=e57] [cursor=pointer]:
            - /url: /?trader=benjamin-cowen
          - link "Peter Brandt" [ref=e60] [cursor=pointer]:
            - /url: /?trader=peter-brandt
        - feed "Public trading ideas" [ref=e63]:
          - 'article "Bitcoin: \"The Line in the Sand\" and an $83K thesis, Benjamin Cowen" [ref=e64]':
            - link "Benjamin Cowen" [ref=e65] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - 'heading "Bitcoin: \"The Line in the Sand\" and an $83K thesis" [level=2] [ref=e68]'
            - generic "No later item recorded yet" [ref=e69]:
              - img "No update yet" [ref=e70]
              - generic [ref=e72]: No update yet
            - generic [ref=e73]:
              - generic [ref=e74]: BTC
              - generic [ref=e75]: youtube.com
              - generic "7 Oct 2026, 15:10 UTC" [ref=e76]: 5d
            - group [ref=e80]:
              - generic "What it says" [ref=e81] [cursor=pointer]
            - generic [ref=e84]:
              - button "Watch this idea" [ref=e86] [cursor=pointer]:
                - generic [ref=e89]: Watch
              - link "Open the original" [ref=e90] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=aEd5onhPxUs
                - generic [ref=e94]: Source
              - link "See the timeline" [ref=e95] [cursor=pointer]:
                - /url: /ideas/cowen-btc-83k-line
                - generic [ref=e99]: Story
          - 'article "Crypto market excluding Bitcoin (TOTAL2): a cup-with-handle chart, Peter Brandt" [ref=e100]':
            - link "Peter Brandt" [ref=e101] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - 'heading "Crypto market excluding Bitcoin (TOTAL2): a cup-with-handle chart" [level=2] [ref=e104]'
            - generic "No later item recorded yet" [ref=e105]:
              - img "No update yet" [ref=e106]
              - generic [ref=e108]: No update yet
            - generic [ref=e109]:
              - generic [ref=e110]: TOTAL2
              - generic [ref=e111]: peterlbrandt.com
              - generic "19 Sept 2026, 21:44 UTC" [ref=e112]: 19 Sept
            - group [ref=e116]:
              - generic "What it says" [ref=e117] [cursor=pointer]
            - generic [ref=e120]:
              - button "Watch this idea" [ref=e122] [cursor=pointer]:
                - generic [ref=e125]: Watch
              - link "Open the original" [ref=e126] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/my-focus-is-bitcoin/
                - generic [ref=e130]: Source
              - link "See the timeline" [ref=e131] [cursor=pointer]:
                - /url: /ideas/brandt-total2-cup-handle
                - generic [ref=e135]: Story
          - article "Bitcoin's cycle bottom expected on 4 October 2026, Peter Brandt" [ref=e136]:
            - link "Peter Brandt" [ref=e137] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - heading "Bitcoin's cycle bottom expected on 4 October 2026" [level=2] [ref=e140]
            - generic "Later item · link not established" [ref=e141]:
              - img "Link unconfirmed" [ref=e142]
              - generic [ref=e145]: Link unconfirmed
            - generic [ref=e146]:
              - generic [ref=e147]: BTC
              - generic [ref=e148]: cointelegraph.com
              - generic "20 Jul 2026, 13:30 UTC" [ref=e149]: 20 Jul
            - group [ref=e153]:
              - generic "What it says" [ref=e154] [cursor=pointer]
            - generic [ref=e157]:
              - button "Watch this idea" [ref=e159] [cursor=pointer]:
                - generic [ref=e162]: Watch
              - link "Open the original" [ref=e163] [cursor=pointer]:
                - /url: https://cointelegraph.com/magazine/peter-brandt-says-bitcoins-bear-market-isnt-over-predicts-final-bottom-in-october
                - generic [ref=e167]: Source
              - link "See the timeline" [ref=e168] [cursor=pointer]:
                - /url: /ideas/brandt-btc-bottom-oct-4
                - generic [ref=e172]: Story
          - 'article "AI-driven credit deflation: add risk only after a Fed \"all-clear\", Arthur Hayes" [ref=e173]':
            - link "Arthur Hayes" [ref=e174] [cursor=pointer]:
              - /url: /profiles/arthur-hayes
            - 'heading "AI-driven credit deflation: add risk only after a Fed \"all-clear\"" [level=2] [ref=e177]'
            - generic "Update to this idea" [ref=e178]:
              - img "Author-linked update" [ref=e179]
              - generic [ref=e182]: Author-linked update
            - generic [ref=e183]:
              - generic [ref=e184]: BTC · HYPE · ZEC
              - generic [ref=e185]: cryptohayes.substack.com
              - generic "17 Feb 2026, 23:01 UTC" [ref=e186]: 17 Feb
            - group [ref=e190]:
              - generic "What it says" [ref=e191] [cursor=pointer]
            - generic [ref=e194]:
              - button "Watch this idea" [ref=e196] [cursor=pointer]:
                - generic [ref=e199]: Watch
              - link "Open the original" [ref=e200] [cursor=pointer]:
                - /url: https://cryptohayes.substack.com/p/this-is-fine
                - generic [ref=e204]: Source
              - link "See the timeline" [ref=e205] [cursor=pointer]:
                - /url: /ideas/hayes-ai-credit-deflation
                - generic [ref=e209]: Story
          - article "Factor Update, October 10, 2026, Peter Brandt" [ref=e210]:
            - link "Peter Brandt" [ref=e211] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e214]:
              - generic [ref=e215]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e217]: Unreviewed
            - heading "Factor Update, October 10, 2026" [level=2] [ref=e218]
            - generic [ref=e219]:
              - generic [ref=e220]: peterlbrandt.com
              - generic "10 Oct 2026, 01:53 UTC" [ref=e221]: 2d
            - generic [ref=e225]:
              - button "Watch Peter Brandt" [ref=e227] [cursor=pointer]:
                - generic [ref=e230]: Watch
              - link "Open the original" [ref=e231] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/factor-update-october-10-2026/
                - generic [ref=e235]: Source
          - article "Is It Smart To Completely Ignore This?, Benjamin Cowen" [ref=e236]:
            - link "Benjamin Cowen" [ref=e237] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e240]:
              - generic [ref=e241]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e243]: Unreviewed
            - heading "Is It Smart To Completely Ignore This?" [level=2] [ref=e244]
            - generic [ref=e245]:
              - generic [ref=e246]: youtube.com
              - generic "9 Oct 2026, 20:32 UTC" [ref=e247]: 3d
            - generic [ref=e251]:
              - button "Watch Benjamin Cowen" [ref=e253] [cursor=pointer]:
                - generic [ref=e256]: Watch
              - link "Open the original" [ref=e257] [cursor=pointer]:
                - /url: https://www.youtube.com/shorts/F5REX5QjuxA
                - generic [ref=e261]: Source
          - article "This Is The Line In The Sand, Benjamin Cowen" [ref=e262]:
            - link "Benjamin Cowen" [ref=e263] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e266]:
              - generic [ref=e267]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e269]: Unreviewed
            - heading "This Is The Line In The Sand" [level=2] [ref=e270]
            - generic [ref=e271]:
              - generic [ref=e272]: youtube.com
              - generic "8 Oct 2026, 18:36 UTC" [ref=e273]: 4d
            - generic [ref=e277]:
              - button "Watch Benjamin Cowen" [ref=e279] [cursor=pointer]:
                - generic [ref=e282]: Watch
              - link "Open the original" [ref=e283] [cursor=pointer]:
                - /url: https://www.youtube.com/shorts/QXUycNpja3M
                - generic [ref=e287]: Source
          - 'article "Bitcoin: Q4 2026, Benjamin Cowen" [ref=e288]':
            - link "Benjamin Cowen" [ref=e289] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e292]:
              - generic [ref=e293]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e295]: Unreviewed
            - 'heading "Bitcoin: Q4 2026" [level=2] [ref=e296]'
            - generic [ref=e297]:
              - generic [ref=e298]: youtube.com
              - generic "8 Oct 2026, 16:59 UTC" [ref=e299]: 4d
            - generic [ref=e303]:
              - button "Watch Benjamin Cowen" [ref=e305] [cursor=pointer]:
                - generic [ref=e308]: Watch
              - link "Open the original" [ref=e309] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=se6UlLbDTEo
                - generic [ref=e313]: Source
          - article "NFA Live! Bond Yields Surge, Crypto Stalls, & is AI Overhyped?, Benjamin Cowen" [ref=e314]:
            - link "Benjamin Cowen" [ref=e315] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e318]:
              - generic [ref=e319]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e321]: Unreviewed
            - heading "NFA Live! Bond Yields Surge, Crypto Stalls, & is AI Overhyped?" [level=2] [ref=e322]
            - generic [ref=e323]:
              - generic [ref=e324]: youtube.com
              - generic "8 Oct 2026, 13:40 UTC" [ref=e325]: 4d
            - generic [ref=e329]:
              - button "Watch Benjamin Cowen" [ref=e331] [cursor=pointer]:
                - generic [ref=e334]: Watch
              - link "Open the original" [ref=e335] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=7lBaoC08nEQ
                - generic [ref=e339]: Source
          - article "Bitcoin vs Silver-Comparing Historical Cycles & Returns, Benjamin Cowen" [ref=e340]:
            - link "Benjamin Cowen" [ref=e341] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e344]:
              - generic [ref=e345]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e347]: Unreviewed
            - heading "Bitcoin vs Silver-Comparing Historical Cycles & Returns" [level=2] [ref=e348]
            - generic [ref=e349]:
              - generic [ref=e350]: youtube.com
              - generic "7 Oct 2026, 13:39 UTC" [ref=e351]: 5d
            - generic [ref=e355]:
              - button "Watch Benjamin Cowen" [ref=e357] [cursor=pointer]:
                - generic [ref=e360]: Watch
              - link "Open the original" [ref=e361] [cursor=pointer]:
                - /url: https://www.youtube.com/shorts/tatwV9ZVx0k
                - generic [ref=e365]: Source
          - article "Silver Price Drops-Why It's Happening Now, Benjamin Cowen" [ref=e366]:
            - link "Benjamin Cowen" [ref=e367] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e370]:
              - generic [ref=e371]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e373]: Unreviewed
            - heading "Silver Price Drops-Why It's Happening Now" [level=2] [ref=e374]
            - generic [ref=e375]:
              - generic [ref=e376]: youtube.com
              - generic "6 Oct 2026, 15:36 UTC" [ref=e377]: 6d
            - generic [ref=e381]:
              - button "Watch Benjamin Cowen" [ref=e383] [cursor=pointer]:
                - generic [ref=e386]: Watch
              - link "Open the original" [ref=e387] [cursor=pointer]:
                - /url: https://www.youtube.com/shorts/UGiJaLDut50
                - generic [ref=e391]: Source
          - article "Grain markets – Best is yet to come, Peter Brandt" [ref=e392]:
            - link "Peter Brandt" [ref=e393] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e396]:
              - generic [ref=e397]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e399]: Unreviewed
            - heading "Grain markets – Best is yet to come" [level=2] [ref=e400]
            - generic [ref=e401]:
              - generic [ref=e402]: peterlbrandt.com
              - generic "6 Oct 2026, 15:11 UTC" [ref=e403]: 6d
            - generic [ref=e407]:
              - button "Watch Peter Brandt" [ref=e409] [cursor=pointer]:
                - generic [ref=e412]: Watch
              - link "Open the original" [ref=e413] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/grain-markets-best-is-yet-to-come/
                - generic [ref=e417]: Source
          - article "Explaining the bear trap – an example, Peter Brandt" [ref=e418]:
            - link "Peter Brandt" [ref=e419] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e422]:
              - generic [ref=e423]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e425]: Unreviewed
            - heading "Explaining the bear trap – an example" [level=2] [ref=e426]
            - generic [ref=e427]:
              - generic [ref=e428]: peterlbrandt.com
              - generic "6 Oct 2026, 10:47 UTC" [ref=e429]: 6d
            - generic [ref=e433]:
              - button "Watch Peter Brandt" [ref=e435] [cursor=pointer]:
                - generic [ref=e438]: Watch
              - link "Open the original" [ref=e439] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/explaining-the-bear-trap-an-example/
                - generic [ref=e443]: Source
          - 'article "Silver: Dubious Speculation, Benjamin Cowen" [ref=e444]':
            - link "Benjamin Cowen" [ref=e445] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e448]:
              - generic [ref=e449]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e451]: Unreviewed
            - 'heading "Silver: Dubious Speculation" [level=2] [ref=e452]'
            - generic [ref=e453]:
              - generic [ref=e454]: youtube.com
              - generic "6 Oct 2026, 04:23 UTC" [ref=e455]: 6d
            - generic [ref=e459]:
              - button "Watch Benjamin Cowen" [ref=e461] [cursor=pointer]:
                - generic [ref=e464]: Watch
              - link "Open the original" [ref=e465] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=s4U8s754p9w
                - generic [ref=e469]: Source
          - article "I Do Think That With Where Expectations Are.., Benjamin Cowen" [ref=e470]:
            - link "Benjamin Cowen" [ref=e471] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e474]:
              - generic [ref=e475]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e477]: Unreviewed
            - heading "I Do Think That With Where Expectations Are.." [level=2] [ref=e478]
            - generic [ref=e479]:
              - generic [ref=e480]: youtube.com
              - generic "5 Oct 2026, 15:10 UTC" [ref=e481]: 7d
            - generic [ref=e485]:
              - button "Watch Benjamin Cowen" [ref=e487] [cursor=pointer]:
                - generic [ref=e490]: Watch
              - link "Open the original" [ref=e491] [cursor=pointer]:
                - /url: https://www.youtube.com/shorts/JVtjNu5A8bU
                - generic [ref=e495]: Source
          - article "When Will Interest Rates Drop?, Benjamin Cowen" [ref=e496]:
            - link "Benjamin Cowen" [ref=e497] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e500]:
              - generic [ref=e501]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e503]: Unreviewed
            - heading "When Will Interest Rates Drop?" [level=2] [ref=e504]
            - generic [ref=e505]:
              - generic [ref=e506]: youtube.com
              - generic "5 Oct 2026, 04:17 UTC" [ref=e507]: 7d
            - generic [ref=e511]:
              - button "Watch Benjamin Cowen" [ref=e513] [cursor=pointer]:
                - generic [ref=e516]: Watch
              - link "Open the original" [ref=e517] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=FVcHFIPVI40
                - generic [ref=e521]: Source
          - article "Premium Member Alert, Peter Brandt" [ref=e522]:
            - link "Peter Brandt" [ref=e523] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e526]:
              - generic [ref=e527]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e529]: Unreviewed
            - heading "Premium Member Alert" [level=2] [ref=e530]
            - generic [ref=e531]:
              - generic [ref=e532]: peterlbrandt.com
              - generic "4 Oct 2026, 19:39 UTC" [ref=e533]: 8d
            - generic [ref=e537]:
              - button "Watch Peter Brandt" [ref=e539] [cursor=pointer]:
                - generic [ref=e542]: Watch
              - link "Open the original" [ref=e543] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/premium-member-alert/
                - generic [ref=e547]: Source
          - article "Factor Special Situation Update, Sugar, Oct 4 2026, Peter Brandt" [ref=e548]:
            - link "Peter Brandt" [ref=e549] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e552]:
              - generic [ref=e553]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e555]: Unreviewed
            - heading "Factor Special Situation Update, Sugar, Oct 4 2026" [level=2] [ref=e556]
            - generic [ref=e557]:
              - generic [ref=e558]: peterlbrandt.com
              - generic "4 Oct 2026, 12:16 UTC" [ref=e559]: 8d
            - generic [ref=e563]:
              - button "Watch Peter Brandt" [ref=e565] [cursor=pointer]:
                - generic [ref=e568]: Watch
              - link "Open the original" [ref=e569] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/factor-special-situation-update-sugar-oct-4-2026/
                - generic [ref=e573]: Source
          - article "Factor Update, October 3, 2026, Peter Brandt" [ref=e574]:
            - link "Peter Brandt" [ref=e575] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e578]:
              - generic [ref=e579]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e581]: Unreviewed
            - heading "Factor Update, October 3, 2026" [level=2] [ref=e582]
            - generic [ref=e583]:
              - generic [ref=e584]: peterlbrandt.com
              - generic "3 Oct 2026, 20:51 UTC" [ref=e585]: 9d
            - generic [ref=e589]:
              - button "Watch Peter Brandt" [ref=e591] [cursor=pointer]:
                - generic [ref=e594]: Watch
              - link "Open the original" [ref=e595] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/factor-update-october-3-2026/
                - generic [ref=e599]: Source
          - article "Stock Market at All Time Highs-What's Next, Benjamin Cowen" [ref=e600]:
            - link "Benjamin Cowen" [ref=e601] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e604]:
              - generic [ref=e605]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e607]: Unreviewed
            - heading "Stock Market at All Time Highs-What's Next" [level=2] [ref=e608]
            - generic [ref=e609]:
              - generic [ref=e610]: youtube.com
              - generic "3 Oct 2026, 17:38 UTC" [ref=e611]: 9d
            - generic [ref=e615]:
              - button "Watch Benjamin Cowen" [ref=e617] [cursor=pointer]:
                - generic [ref=e620]: Watch
              - link "Open the original" [ref=e621] [cursor=pointer]:
                - /url: https://www.youtube.com/shorts/6gGqXyRnnRU
                - generic [ref=e625]: Source
          - article "Payrolls Come in Weak, Unemployment Ticks Higher, Benjamin Cowen" [ref=e626]:
            - link "Benjamin Cowen" [ref=e627] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e630]:
              - generic [ref=e631]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e633]: Unreviewed
            - heading "Payrolls Come in Weak, Unemployment Ticks Higher" [level=2] [ref=e634]
            - generic [ref=e635]:
              - generic [ref=e636]: youtube.com
              - generic "2 Oct 2026, 18:25 UTC" [ref=e637]: 10d
            - generic [ref=e641]:
              - button "Watch Benjamin Cowen" [ref=e643] [cursor=pointer]:
                - generic [ref=e646]: Watch
              - link "Open the original" [ref=e647] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=kDJcse482Eo
                - generic [ref=e651]: Source
          - 'article "Bitcoin: The Beauty of Mathematics (Part 73), Benjamin Cowen" [ref=e652]':
            - link "Benjamin Cowen" [ref=e653] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e656]:
              - generic [ref=e657]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e659]: Unreviewed
            - 'heading "Bitcoin: The Beauty of Mathematics (Part 73)" [level=2] [ref=e660]'
            - generic [ref=e661]:
              - generic [ref=e662]: youtube.com
              - generic "2 Oct 2026, 01:49 UTC" [ref=e663]: 10d
            - generic [ref=e667]:
              - button "Watch Benjamin Cowen" [ref=e669] [cursor=pointer]:
                - generic [ref=e672]: Watch
              - link "Open the original" [ref=e673] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=vMz4H9OK_fs
                - generic [ref=e677]: Source
          - article "Gold Price Analysis, Benjamin Cowen" [ref=e678]:
            - link "Benjamin Cowen" [ref=e679] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e682]:
              - generic [ref=e683]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e685]: Unreviewed
            - heading "Gold Price Analysis" [level=2] [ref=e686]
            - generic [ref=e687]:
              - generic [ref=e688]: youtube.com
              - generic "1 Oct 2026, 13:53 UTC" [ref=e689]: 11d
            - generic [ref=e693]:
              - button "Watch Benjamin Cowen" [ref=e695] [cursor=pointer]:
                - generic [ref=e698]: Watch
              - link "Open the original" [ref=e699] [cursor=pointer]:
                - /url: https://www.youtube.com/shorts/lDp-3E66kBI
                - generic [ref=e703]: Source
          - article "NFA Live! Bitcoin in 2026, Benjamin Cowen" [ref=e704]:
            - link "Benjamin Cowen" [ref=e705] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e708]:
              - generic [ref=e709]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e711]: Unreviewed
            - heading "NFA Live! Bitcoin in 2026" [level=2] [ref=e712]
            - generic [ref=e713]:
              - generic [ref=e714]: youtube.com
              - generic "1 Oct 2026, 13:44 UTC" [ref=e715]: 11d
            - generic [ref=e719]:
              - button "Watch Benjamin Cowen" [ref=e721] [cursor=pointer]:
                - generic [ref=e724]: Watch
              - link "Open the original" [ref=e725] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=-Mb-s09YdL0
                - generic [ref=e729]: Source
          - article "Factor Member Webinar September 2026, Peter Brandt" [ref=e730]:
            - link "Peter Brandt" [ref=e731] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e734]:
              - generic [ref=e735]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e737]: Unreviewed
            - heading "Factor Member Webinar September 2026" [level=2] [ref=e738]
            - generic [ref=e739]:
              - generic [ref=e740]: peterlbrandt.com
              - generic "30 Sept 2026, 23:59 UTC" [ref=e741]: 11d
            - generic [ref=e745]:
              - button "Watch Peter Brandt" [ref=e747] [cursor=pointer]:
                - generic [ref=e750]: Watch
              - link "Open the original" [ref=e751] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/factor-member-webinar-september-2026/
                - generic [ref=e755]: Source
          - 'article "WEBINAR: September 29, 2026 at 11:00 am Central – Ask Peter, Peter Brandt" [ref=e756]':
            - link "Peter Brandt" [ref=e757] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e760]:
              - generic [ref=e761]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e763]: Unreviewed
            - 'heading "WEBINAR: September 29, 2026 at 11:00 am Central – Ask Peter" [level=2] [ref=e764]'
            - generic [ref=e765]:
              - generic [ref=e766]: peterlbrandt.com
              - generic "29 Sept 2026, 13:33 UTC" [ref=e767]: 13d
            - generic [ref=e771]:
              - button "Watch Peter Brandt" [ref=e773] [cursor=pointer]:
                - generic [ref=e776]: Watch
              - link "Open the original" [ref=e777] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/webinar-december-30-2025-at-800-am-mountain-ask-peter-2/
                - generic [ref=e781]: Source
          - article "Factor Report Update, September 26 2026, Peter Brandt" [ref=e782]:
            - link "Peter Brandt" [ref=e783] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e786]:
              - generic [ref=e787]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e789]: Unreviewed
            - heading "Factor Report Update, September 26 2026" [level=2] [ref=e790]
            - generic [ref=e791]:
              - generic [ref=e792]: peterlbrandt.com
              - generic "26 Sept 2026, 10:39 UTC" [ref=e793]: 26 Sept
            - generic [ref=e797]:
              - button "Watch Peter Brandt" [ref=e799] [cursor=pointer]:
                - generic [ref=e802]: Watch
              - link "Open the original" [ref=e803] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/factor-report-update-september-26-2026/
                - generic [ref=e807]: Source
          - article "Interview with Cointelegraph, Peter Brandt" [ref=e808]:
            - link "Peter Brandt" [ref=e809] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e812]:
              - generic [ref=e813]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e815]: Unreviewed
            - heading "Interview with Cointelegraph" [level=2] [ref=e816]
            - generic [ref=e817]:
              - generic [ref=e818]: peterlbrandt.com
              - generic "26 Sept 2026, 00:30 UTC" [ref=e819]: 26 Sept
            - generic [ref=e823]:
              - button "Watch Peter Brandt" [ref=e825] [cursor=pointer]:
                - generic [ref=e828]: Watch
              - link "Open the original" [ref=e829] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/interview-with-cointelegraph/
                - generic [ref=e833]: Source
          - article "Safety First, Arthur Hayes" [ref=e834]:
            - link "Arthur Hayes" [ref=e835] [cursor=pointer]:
              - /url: /profiles/arthur-hayes
            - paragraph [ref=e838]:
              - generic [ref=e839]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e841]: Unreviewed
            - heading "Safety First" [level=2] [ref=e842]
            - generic [ref=e843]:
              - generic [ref=e844]: cryptohayes.substack.com
              - generic "21 Sept 2026, 23:07 UTC" [ref=e845]: 21 Sept
            - generic [ref=e849]:
              - button "Watch Arthur Hayes" [ref=e851] [cursor=pointer]:
                - generic [ref=e854]: Watch
              - link "Open the original" [ref=e855] [cursor=pointer]:
                - /url: https://cryptohayes.substack.com/p/safety-first
                - generic [ref=e859]: Source
          - article "Atención, Arthur Hayes" [ref=e860]:
            - link "Arthur Hayes" [ref=e861] [cursor=pointer]:
              - /url: /profiles/arthur-hayes
            - paragraph [ref=e864]:
              - generic [ref=e865]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e867]: Unreviewed
            - heading "Atención" [level=2] [ref=e868]
            - generic [ref=e869]:
              - generic [ref=e870]: cryptohayes.substack.com
              - generic "2 Sept 2026, 23:01 UTC" [ref=e871]: 2 Sept
            - generic [ref=e875]:
              - button "Watch Arthur Hayes" [ref=e877] [cursor=pointer]:
                - generic [ref=e880]: Watch
              - link "Open the original" [ref=e881] [cursor=pointer]:
                - /url: https://cryptohayes.substack.com/p/atencion
                - generic [ref=e885]: Source
          - article "Same Same But Different, Arthur Hayes" [ref=e886]:
            - link "Arthur Hayes" [ref=e887] [cursor=pointer]:
              - /url: /profiles/arthur-hayes
            - paragraph [ref=e890]:
              - generic [ref=e891]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e893]: Unreviewed
            - heading "Same Same But Different" [level=2] [ref=e894]
            - generic [ref=e895]:
              - generic [ref=e896]: cryptohayes.substack.com
              - generic "24 Aug 2026, 23:01 UTC" [ref=e897]: 24 Aug
            - generic [ref=e901]:
              - button "Watch Arthur Hayes" [ref=e903] [cursor=pointer]:
                - generic [ref=e906]: Watch
              - link "Open the original" [ref=e907] [cursor=pointer]:
                - /url: https://cryptohayes.substack.com/p/same-same-but-different
                - generic [ref=e911]: Source
          - article "The Book of Genesis, Arthur Hayes" [ref=e912]:
            - link "Arthur Hayes" [ref=e913] [cursor=pointer]:
              - /url: /profiles/arthur-hayes
            - paragraph [ref=e916]:
              - generic [ref=e917]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e919]: Unreviewed
            - heading "The Book of Genesis" [level=2] [ref=e920]
            - generic [ref=e921]:
              - generic [ref=e922]: cryptohayes.substack.com
              - generic "19 Aug 2026, 23:01 UTC" [ref=e923]: 19 Aug
            - generic [ref=e927]:
              - button "Watch Arthur Hayes" [ref=e929] [cursor=pointer]:
                - generic [ref=e932]: Watch
              - link "Open the original" [ref=e933] [cursor=pointer]:
                - /url: https://cryptohayes.substack.com/p/the-book-of-genesis
                - generic [ref=e937]: Source
          - article "Yen-quake, Arthur Hayes" [ref=e938]:
            - link "Arthur Hayes" [ref=e939] [cursor=pointer]:
              - /url: /profiles/arthur-hayes
            - paragraph [ref=e942]:
              - generic [ref=e943]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e945]: Unreviewed
            - heading "Yen-quake" [level=2] [ref=e946]
            - generic [ref=e947]:
              - generic [ref=e948]: cryptohayes.substack.com
              - generic "11 Aug 2026, 01:00 UTC" [ref=e949]: 11 Aug
            - generic [ref=e953]:
              - button "Watch Arthur Hayes" [ref=e955] [cursor=pointer]:
                - generic [ref=e958]: Watch
              - link "Open the original" [ref=e959] [cursor=pointer]:
                - /url: https://cryptohayes.substack.com/p/yen-quake
                - generic [ref=e963]: Source
          - article "End" [ref=e964]:
            - generic [ref=e1034]:
              - button "Back to the top" [ref=e1035] [cursor=pointer]
              - link "Updates" [ref=e1038] [cursor=pointer]:
                - /url: /updates
              - link "How Relay works" [ref=e1042] [cursor=pointer]:
                - /url: /about
              - link "Plans published through Relay" [ref=e1045] [cursor=pointer]:
                - /url: /plans
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { returning } from "./helpers";
  3  | 
  4  | test.describe("phone layout", () => {
  5  |   test("the welcome fits with both actions in view", async ({
  6  |     page,
  7  |     isMobile,
  8  |   }) => {
  9  |     test.skip(!isMobile, "phone only");
  10 |     await page.goto("/");
  11 |     const explore = page.getByRole("button", { name: "Explore ideas" });
  12 |     const how = page.getByRole("link", { name: "See how Relay works" });
  13 |     await expect(explore).toBeVisible();
  14 |     await expect(how).toBeVisible();
  15 |     const vp = page.viewportSize();
  16 |     for (const el of [explore, how]) {
  17 |       const box = await el.boundingBox();
  18 |       expect(box).not.toBeNull();
  19 |       expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
  20 |         vp?.height ?? 0,
  21 |       );
  22 |       expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
  23 |         vp?.width ?? 0,
  24 |       );
  25 |       expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  26 |     }
  27 |     // No app navigation behind the curtains.
  28 |     await expect(
  29 |       page.getByRole("navigation", { name: "Main" }).first(),
  30 |     ).toBeHidden();
  31 |   });
  32 | 
  33 |   for (const path of [
  34 |     "/",
  35 |     "/ideas/hayes-ai-credit-deflation",
  36 |     "/profiles/peter-brandt",
  37 |     "/updates",
  38 |     "/watchlist",
  39 |     "/plans",
  40 |   ]) {
  41 |     test(`${path} has no sideways scroll`, async ({ page }) => {
  42 |       await returning(page);
  43 |       await page.goto(path);
  44 |       await page.waitForLoadState("networkidle");
  45 |       const overflow = await page.evaluate(() => {
  46 |         const widest = [
  47 |           ...document.querySelectorAll<HTMLElement>("#main *"),
  48 |         ].reduce((m, e) => Math.max(m, e.getBoundingClientRect().right), 0);
  49 |         return widest - window.innerWidth;
  50 |       });
> 51 |       expect(overflow).toBeLessThanOrEqual(1);
     |                        ^ Error: expect(received).toBeLessThanOrEqual(expected)
  52 |     });
  53 |   }
  54 | 
  55 |   test("touch targets on Discover are at least 44px", async ({
  56 |     page,
  57 |     isMobile,
  58 |   }) => {
  59 |     test.skip(!isMobile, "phone only");
  60 |     await returning(page);
  61 |     await page.goto("/");
  62 |     await expect(
  63 |       page.getByRole("button", { name: /^Watch / }).first(),
  64 |     ).toBeVisible();
  65 |     const small = await page.evaluate(() =>
  66 |       [...document.querySelectorAll<HTMLElement>("#main a, #main button")]
  67 |         .filter((e) => e.offsetParent !== null)
  68 |         .map((e) => ({
  69 |           t: (e.textContent ?? "").trim().slice(0, 30),
  70 |           h: e.getBoundingClientRect().height,
  71 |         }))
  72 |         // inline text links inside paragraphs are exempt
  73 |         .filter((x) => x.h > 0 && x.h < 40 && !x.t.includes(" ")),
  74 |     );
  75 |     expect(small).toEqual([]);
  76 |   });
  77 | 
  78 |   test("the bottom bar offers Discover, Updates, Watchlist, Plans, Account", async ({
  79 |     page,
  80 |     isMobile,
  81 |   }) => {
  82 |     test.skip(!isMobile, "phone only");
  83 |     await returning(page);
  84 |     await page.goto("/");
  85 |     const bar = page.locator("nav.tabbar");
  86 |     for (const n of ["Discover", "Updates", "Watchlist", "Plans", "Account"])
  87 |       await expect(bar.getByRole("link", { name: n })).toBeVisible();
  88 |   });
  89 | });
  90 | 
```