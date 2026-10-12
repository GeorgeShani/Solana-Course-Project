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
Received:    214.31158447265625
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
    - main [ref=e23]:
      - generic [ref=e24]:
        - 'button "Pull the cord: show how Relay works" [ref=e26] [cursor=pointer]'
        - heading "Discover" [level=1] [ref=e31]
        - navigation "Show ideas by" [ref=e32]:
          - link "Everyone" [ref=e33] [cursor=pointer]:
            - /url: /
          - link "Arthur Hayes" [ref=e39] [cursor=pointer]:
            - /url: /?trader=arthur-hayes
          - link "Benjamin Cowen" [ref=e42] [cursor=pointer]:
            - /url: /?trader=benjamin-cowen
          - link "Peter Brandt" [ref=e45] [cursor=pointer]:
            - /url: /?trader=peter-brandt
        - feed "Public trading ideas" [ref=e48]:
          - 'article "Bitcoin: \"The Line in the Sand\" and an $83K thesis, Benjamin Cowen" [ref=e49]':
            - link "Benjamin Cowen" [ref=e50] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - 'heading "Bitcoin: \"The Line in the Sand\" and an $83K thesis" [level=2] [ref=e53]'
            - generic "No later item recorded yet" [ref=e54]:
              - img "No update yet" [ref=e55]
              - generic [ref=e57]: No update yet
            - generic [ref=e58]:
              - generic [ref=e59]: BTC
              - generic [ref=e60]: youtube.com
              - generic "7 Oct 2026, 15:10 UTC" [ref=e61]: 5d
            - group [ref=e65]:
              - generic "What it says" [ref=e66] [cursor=pointer]
            - generic [ref=e69]:
              - button "Watch this idea" [ref=e71] [cursor=pointer]:
                - generic [ref=e74]: Watch
              - link "Open the original" [ref=e75] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=aEd5onhPxUs
                - generic [ref=e79]: Source
              - link "See the timeline" [ref=e80] [cursor=pointer]:
                - /url: /ideas/cowen-btc-83k-line
                - generic [ref=e84]: Story
          - 'article "Crypto market excluding Bitcoin (TOTAL2): a cup-with-handle chart, Peter Brandt" [ref=e85]':
            - link "Peter Brandt" [ref=e86] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - 'heading "Crypto market excluding Bitcoin (TOTAL2): a cup-with-handle chart" [level=2] [ref=e89]'
            - generic "No later item recorded yet" [ref=e90]:
              - img "No update yet" [ref=e91]
              - generic [ref=e93]: No update yet
            - generic [ref=e94]:
              - generic [ref=e95]: TOTAL2
              - generic [ref=e96]: peterlbrandt.com
              - generic "19 Sept 2026, 21:44 UTC" [ref=e97]: 19 Sept
            - group [ref=e101]:
              - generic "What it says" [ref=e102] [cursor=pointer]
            - generic [ref=e105]:
              - button "Watch this idea" [ref=e107] [cursor=pointer]:
                - generic [ref=e110]: Watch
              - link "Open the original" [ref=e111] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/my-focus-is-bitcoin/
                - generic [ref=e115]: Source
              - link "See the timeline" [ref=e116] [cursor=pointer]:
                - /url: /ideas/brandt-total2-cup-handle
                - generic [ref=e120]: Story
          - article "Bitcoin's cycle bottom expected on 4 October 2026, Peter Brandt" [ref=e121]:
            - link "Peter Brandt" [ref=e122] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - heading "Bitcoin's cycle bottom expected on 4 October 2026" [level=2] [ref=e125]
            - generic "Later item · link not established" [ref=e126]:
              - img "Link unconfirmed" [ref=e127]
              - generic [ref=e130]: Link unconfirmed
            - generic [ref=e131]:
              - generic [ref=e132]: BTC
              - generic [ref=e133]: cointelegraph.com
              - generic "20 Jul 2026, 13:30 UTC" [ref=e134]: 20 Jul
            - group [ref=e138]:
              - generic "What it says" [ref=e139] [cursor=pointer]
            - generic [ref=e142]:
              - button "Watch this idea" [ref=e144] [cursor=pointer]:
                - generic [ref=e147]: Watch
              - link "Open the original" [ref=e148] [cursor=pointer]:
                - /url: https://cointelegraph.com/magazine/peter-brandt-says-bitcoins-bear-market-isnt-over-predicts-final-bottom-in-october
                - generic [ref=e152]: Source
              - link "See the timeline" [ref=e153] [cursor=pointer]:
                - /url: /ideas/brandt-btc-bottom-oct-4
                - generic [ref=e157]: Story
          - 'article "AI-driven credit deflation: add risk only after a Fed \"all-clear\", Arthur Hayes" [ref=e158]':
            - link "Arthur Hayes" [ref=e159] [cursor=pointer]:
              - /url: /profiles/arthur-hayes
            - 'heading "AI-driven credit deflation: add risk only after a Fed \"all-clear\"" [level=2] [ref=e162]'
            - generic "Update to this idea" [ref=e163]:
              - img "Author-linked update" [ref=e164]
              - generic [ref=e167]: Author-linked update
            - generic [ref=e168]:
              - generic [ref=e169]: BTC · HYPE · ZEC
              - generic [ref=e170]: cryptohayes.substack.com
              - generic "17 Feb 2026, 23:01 UTC" [ref=e171]: 17 Feb
            - group [ref=e175]:
              - generic "What it says" [ref=e176] [cursor=pointer]
            - generic [ref=e179]:
              - button "Watch this idea" [ref=e181] [cursor=pointer]:
                - generic [ref=e184]: Watch
              - link "Open the original" [ref=e185] [cursor=pointer]:
                - /url: https://cryptohayes.substack.com/p/this-is-fine
                - generic [ref=e189]: Source
              - link "See the timeline" [ref=e190] [cursor=pointer]:
                - /url: /ideas/hayes-ai-credit-deflation
                - generic [ref=e194]: Story
          - article "Factor Update, October 10, 2026, Peter Brandt" [ref=e195]:
            - link "Peter Brandt" [ref=e196] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e199]:
              - generic [ref=e200]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e202]: Unreviewed
            - heading "Factor Update, October 10, 2026" [level=2] [ref=e203]
            - generic [ref=e204]:
              - generic [ref=e205]: peterlbrandt.com
              - generic "10 Oct 2026, 01:53 UTC" [ref=e206]: 2d
            - generic [ref=e210]:
              - button "Watch Peter Brandt" [ref=e212] [cursor=pointer]:
                - generic [ref=e215]: Watch
              - link "Open the original" [ref=e216] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/factor-update-october-10-2026/
                - generic [ref=e220]: Source
          - article "Is It Smart To Completely Ignore This?, Benjamin Cowen" [ref=e221]:
            - link "Benjamin Cowen" [ref=e222] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e225]:
              - generic [ref=e226]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e228]: Unreviewed
            - heading "Is It Smart To Completely Ignore This?" [level=2] [ref=e229]
            - generic [ref=e230]:
              - generic [ref=e231]: youtube.com
              - generic "9 Oct 2026, 20:32 UTC" [ref=e232]: 3d
            - generic [ref=e236]:
              - button "Watch Benjamin Cowen" [ref=e238] [cursor=pointer]:
                - generic [ref=e241]: Watch
              - link "Open the original" [ref=e242] [cursor=pointer]:
                - /url: https://www.youtube.com/shorts/F5REX5QjuxA
                - generic [ref=e246]: Source
          - article "This Is The Line In The Sand, Benjamin Cowen" [ref=e247]:
            - link "Benjamin Cowen" [ref=e248] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e251]:
              - generic [ref=e252]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e254]: Unreviewed
            - heading "This Is The Line In The Sand" [level=2] [ref=e255]
            - generic [ref=e256]:
              - generic [ref=e257]: youtube.com
              - generic "8 Oct 2026, 18:36 UTC" [ref=e258]: 4d
            - generic [ref=e262]:
              - button "Watch Benjamin Cowen" [ref=e264] [cursor=pointer]:
                - generic [ref=e267]: Watch
              - link "Open the original" [ref=e268] [cursor=pointer]:
                - /url: https://www.youtube.com/shorts/QXUycNpja3M
                - generic [ref=e272]: Source
          - 'article "Bitcoin: Q4 2026, Benjamin Cowen" [ref=e273]':
            - link "Benjamin Cowen" [ref=e274] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e277]:
              - generic [ref=e278]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e280]: Unreviewed
            - 'heading "Bitcoin: Q4 2026" [level=2] [ref=e281]'
            - generic [ref=e282]:
              - generic [ref=e283]: youtube.com
              - generic "8 Oct 2026, 16:59 UTC" [ref=e284]: 4d
            - generic [ref=e288]:
              - button "Watch Benjamin Cowen" [ref=e290] [cursor=pointer]:
                - generic [ref=e293]: Watch
              - link "Open the original" [ref=e294] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=se6UlLbDTEo
                - generic [ref=e298]: Source
          - article "NFA Live! Bond Yields Surge, Crypto Stalls, & is AI Overhyped?, Benjamin Cowen" [ref=e299]:
            - link "Benjamin Cowen" [ref=e300] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e303]:
              - generic [ref=e304]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e306]: Unreviewed
            - heading "NFA Live! Bond Yields Surge, Crypto Stalls, & is AI Overhyped?" [level=2] [ref=e307]
            - generic [ref=e308]:
              - generic [ref=e309]: youtube.com
              - generic "8 Oct 2026, 13:40 UTC" [ref=e310]: 4d
            - generic [ref=e314]:
              - button "Watch Benjamin Cowen" [ref=e316] [cursor=pointer]:
                - generic [ref=e319]: Watch
              - link "Open the original" [ref=e320] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=7lBaoC08nEQ
                - generic [ref=e324]: Source
          - article "Bitcoin vs Silver-Comparing Historical Cycles & Returns, Benjamin Cowen" [ref=e325]:
            - link "Benjamin Cowen" [ref=e326] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e329]:
              - generic [ref=e330]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e332]: Unreviewed
            - heading "Bitcoin vs Silver-Comparing Historical Cycles & Returns" [level=2] [ref=e333]
            - generic [ref=e334]:
              - generic [ref=e335]: youtube.com
              - generic "7 Oct 2026, 13:39 UTC" [ref=e336]: 5d
            - generic [ref=e340]:
              - button "Watch Benjamin Cowen" [ref=e342] [cursor=pointer]:
                - generic [ref=e345]: Watch
              - link "Open the original" [ref=e346] [cursor=pointer]:
                - /url: https://www.youtube.com/shorts/tatwV9ZVx0k
                - generic [ref=e350]: Source
          - article "Silver Price Drops-Why It's Happening Now, Benjamin Cowen" [ref=e351]:
            - link "Benjamin Cowen" [ref=e352] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e355]:
              - generic [ref=e356]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e358]: Unreviewed
            - heading "Silver Price Drops-Why It's Happening Now" [level=2] [ref=e359]
            - generic [ref=e360]:
              - generic [ref=e361]: youtube.com
              - generic "6 Oct 2026, 15:36 UTC" [ref=e362]: 6d
            - generic [ref=e366]:
              - button "Watch Benjamin Cowen" [ref=e368] [cursor=pointer]:
                - generic [ref=e371]: Watch
              - link "Open the original" [ref=e372] [cursor=pointer]:
                - /url: https://www.youtube.com/shorts/UGiJaLDut50
                - generic [ref=e376]: Source
          - article "Grain markets – Best is yet to come, Peter Brandt" [ref=e377]:
            - link "Peter Brandt" [ref=e378] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e381]:
              - generic [ref=e382]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e384]: Unreviewed
            - heading "Grain markets – Best is yet to come" [level=2] [ref=e385]
            - generic [ref=e386]:
              - generic [ref=e387]: peterlbrandt.com
              - generic "6 Oct 2026, 15:11 UTC" [ref=e388]: 6d
            - generic [ref=e392]:
              - button "Watch Peter Brandt" [ref=e394] [cursor=pointer]:
                - generic [ref=e397]: Watch
              - link "Open the original" [ref=e398] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/grain-markets-best-is-yet-to-come/
                - generic [ref=e402]: Source
          - article "Explaining the bear trap – an example, Peter Brandt" [ref=e403]:
            - link "Peter Brandt" [ref=e404] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e407]:
              - generic [ref=e408]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e410]: Unreviewed
            - heading "Explaining the bear trap – an example" [level=2] [ref=e411]
            - generic [ref=e412]:
              - generic [ref=e413]: peterlbrandt.com
              - generic "6 Oct 2026, 10:47 UTC" [ref=e414]: 6d
            - generic [ref=e418]:
              - button "Watch Peter Brandt" [ref=e420] [cursor=pointer]:
                - generic [ref=e423]: Watch
              - link "Open the original" [ref=e424] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/explaining-the-bear-trap-an-example/
                - generic [ref=e428]: Source
          - 'article "Silver: Dubious Speculation, Benjamin Cowen" [ref=e429]':
            - link "Benjamin Cowen" [ref=e430] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e433]:
              - generic [ref=e434]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e436]: Unreviewed
            - 'heading "Silver: Dubious Speculation" [level=2] [ref=e437]'
            - generic [ref=e438]:
              - generic [ref=e439]: youtube.com
              - generic "6 Oct 2026, 04:23 UTC" [ref=e440]: 6d
            - generic [ref=e444]:
              - button "Watch Benjamin Cowen" [ref=e446] [cursor=pointer]:
                - generic [ref=e449]: Watch
              - link "Open the original" [ref=e450] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=s4U8s754p9w
                - generic [ref=e454]: Source
          - article "I Do Think That With Where Expectations Are.., Benjamin Cowen" [ref=e455]:
            - link "Benjamin Cowen" [ref=e456] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e459]:
              - generic [ref=e460]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e462]: Unreviewed
            - heading "I Do Think That With Where Expectations Are.." [level=2] [ref=e463]
            - generic [ref=e464]:
              - generic [ref=e465]: youtube.com
              - generic "5 Oct 2026, 15:10 UTC" [ref=e466]: 7d
            - generic [ref=e470]:
              - button "Watch Benjamin Cowen" [ref=e472] [cursor=pointer]:
                - generic [ref=e475]: Watch
              - link "Open the original" [ref=e476] [cursor=pointer]:
                - /url: https://www.youtube.com/shorts/JVtjNu5A8bU
                - generic [ref=e480]: Source
          - article "When Will Interest Rates Drop?, Benjamin Cowen" [ref=e481]:
            - link "Benjamin Cowen" [ref=e482] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e485]:
              - generic [ref=e486]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e488]: Unreviewed
            - heading "When Will Interest Rates Drop?" [level=2] [ref=e489]
            - generic [ref=e490]:
              - generic [ref=e491]: youtube.com
              - generic "5 Oct 2026, 04:17 UTC" [ref=e492]: 7d
            - generic [ref=e496]:
              - button "Watch Benjamin Cowen" [ref=e498] [cursor=pointer]:
                - generic [ref=e501]: Watch
              - link "Open the original" [ref=e502] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=FVcHFIPVI40
                - generic [ref=e506]: Source
          - article "Premium Member Alert, Peter Brandt" [ref=e507]:
            - link "Peter Brandt" [ref=e508] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e511]:
              - generic [ref=e512]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e514]: Unreviewed
            - heading "Premium Member Alert" [level=2] [ref=e515]
            - generic [ref=e516]:
              - generic [ref=e517]: peterlbrandt.com
              - generic "4 Oct 2026, 19:39 UTC" [ref=e518]: 8d
            - generic [ref=e522]:
              - button "Watch Peter Brandt" [ref=e524] [cursor=pointer]:
                - generic [ref=e527]: Watch
              - link "Open the original" [ref=e528] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/premium-member-alert/
                - generic [ref=e532]: Source
          - article "Factor Special Situation Update, Sugar, Oct 4 2026, Peter Brandt" [ref=e533]:
            - link "Peter Brandt" [ref=e534] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e537]:
              - generic [ref=e538]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e540]: Unreviewed
            - heading "Factor Special Situation Update, Sugar, Oct 4 2026" [level=2] [ref=e541]
            - generic [ref=e542]:
              - generic [ref=e543]: peterlbrandt.com
              - generic "4 Oct 2026, 12:16 UTC" [ref=e544]: 8d
            - generic [ref=e548]:
              - button "Watch Peter Brandt" [ref=e550] [cursor=pointer]:
                - generic [ref=e553]: Watch
              - link "Open the original" [ref=e554] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/factor-special-situation-update-sugar-oct-4-2026/
                - generic [ref=e558]: Source
          - article "Factor Update, October 3, 2026, Peter Brandt" [ref=e559]:
            - link "Peter Brandt" [ref=e560] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e563]:
              - generic [ref=e564]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e566]: Unreviewed
            - heading "Factor Update, October 3, 2026" [level=2] [ref=e567]
            - generic [ref=e568]:
              - generic [ref=e569]: peterlbrandt.com
              - generic "3 Oct 2026, 20:51 UTC" [ref=e570]: 9d
            - generic [ref=e574]:
              - button "Watch Peter Brandt" [ref=e576] [cursor=pointer]:
                - generic [ref=e579]: Watch
              - link "Open the original" [ref=e580] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/factor-update-october-3-2026/
                - generic [ref=e584]: Source
          - article "Stock Market at All Time Highs-What's Next, Benjamin Cowen" [ref=e585]:
            - link "Benjamin Cowen" [ref=e586] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e589]:
              - generic [ref=e590]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e592]: Unreviewed
            - heading "Stock Market at All Time Highs-What's Next" [level=2] [ref=e593]
            - generic [ref=e594]:
              - generic [ref=e595]: youtube.com
              - generic "3 Oct 2026, 17:38 UTC" [ref=e596]: 9d
            - generic [ref=e600]:
              - button "Watch Benjamin Cowen" [ref=e602] [cursor=pointer]:
                - generic [ref=e605]: Watch
              - link "Open the original" [ref=e606] [cursor=pointer]:
                - /url: https://www.youtube.com/shorts/6gGqXyRnnRU
                - generic [ref=e610]: Source
          - article "Payrolls Come in Weak, Unemployment Ticks Higher, Benjamin Cowen" [ref=e611]:
            - link "Benjamin Cowen" [ref=e612] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e615]:
              - generic [ref=e616]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e618]: Unreviewed
            - heading "Payrolls Come in Weak, Unemployment Ticks Higher" [level=2] [ref=e619]
            - generic [ref=e620]:
              - generic [ref=e621]: youtube.com
              - generic "2 Oct 2026, 18:25 UTC" [ref=e622]: 10d
            - generic [ref=e626]:
              - button "Watch Benjamin Cowen" [ref=e628] [cursor=pointer]:
                - generic [ref=e631]: Watch
              - link "Open the original" [ref=e632] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=kDJcse482Eo
                - generic [ref=e636]: Source
          - 'article "Bitcoin: The Beauty of Mathematics (Part 73), Benjamin Cowen" [ref=e637]':
            - link "Benjamin Cowen" [ref=e638] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e641]:
              - generic [ref=e642]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e644]: Unreviewed
            - 'heading "Bitcoin: The Beauty of Mathematics (Part 73)" [level=2] [ref=e645]'
            - generic [ref=e646]:
              - generic [ref=e647]: youtube.com
              - generic "2 Oct 2026, 01:49 UTC" [ref=e648]: 10d
            - generic [ref=e652]:
              - button "Watch Benjamin Cowen" [ref=e654] [cursor=pointer]:
                - generic [ref=e657]: Watch
              - link "Open the original" [ref=e658] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=vMz4H9OK_fs
                - generic [ref=e662]: Source
          - article "Gold Price Analysis, Benjamin Cowen" [ref=e663]:
            - link "Benjamin Cowen" [ref=e664] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e667]:
              - generic [ref=e668]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e670]: Unreviewed
            - heading "Gold Price Analysis" [level=2] [ref=e671]
            - generic [ref=e672]:
              - generic [ref=e673]: youtube.com
              - generic "1 Oct 2026, 13:53 UTC" [ref=e674]: 11d
            - generic [ref=e678]:
              - button "Watch Benjamin Cowen" [ref=e680] [cursor=pointer]:
                - generic [ref=e683]: Watch
              - link "Open the original" [ref=e684] [cursor=pointer]:
                - /url: https://www.youtube.com/shorts/lDp-3E66kBI
                - generic [ref=e688]: Source
          - article "NFA Live! Bitcoin in 2026, Benjamin Cowen" [ref=e689]:
            - link "Benjamin Cowen" [ref=e690] [cursor=pointer]:
              - /url: /profiles/benjamin-cowen
            - paragraph [ref=e693]:
              - generic [ref=e694]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e696]: Unreviewed
            - heading "NFA Live! Bitcoin in 2026" [level=2] [ref=e697]
            - generic [ref=e698]:
              - generic [ref=e699]: youtube.com
              - generic "1 Oct 2026, 13:44 UTC" [ref=e700]: 11d
            - generic [ref=e704]:
              - button "Watch Benjamin Cowen" [ref=e706] [cursor=pointer]:
                - generic [ref=e709]: Watch
              - link "Open the original" [ref=e710] [cursor=pointer]:
                - /url: https://www.youtube.com/watch?v=-Mb-s09YdL0
                - generic [ref=e714]: Source
          - article "Factor Member Webinar September 2026, Peter Brandt" [ref=e715]:
            - link "Peter Brandt" [ref=e716] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e719]:
              - generic [ref=e720]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e722]: Unreviewed
            - heading "Factor Member Webinar September 2026" [level=2] [ref=e723]
            - generic [ref=e724]:
              - generic [ref=e725]: peterlbrandt.com
              - generic "30 Sept 2026, 23:59 UTC" [ref=e726]: 11d
            - generic [ref=e730]:
              - button "Watch Peter Brandt" [ref=e732] [cursor=pointer]:
                - generic [ref=e735]: Watch
              - link "Open the original" [ref=e736] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/factor-member-webinar-september-2026/
                - generic [ref=e740]: Source
          - 'article "WEBINAR: September 29, 2026 at 11:00 am Central – Ask Peter, Peter Brandt" [ref=e741]':
            - link "Peter Brandt" [ref=e742] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e745]:
              - generic [ref=e746]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e748]: Unreviewed
            - 'heading "WEBINAR: September 29, 2026 at 11:00 am Central – Ask Peter" [level=2] [ref=e749]'
            - generic [ref=e750]:
              - generic [ref=e751]: peterlbrandt.com
              - generic "29 Sept 2026, 13:33 UTC" [ref=e752]: 13d
            - generic [ref=e756]:
              - button "Watch Peter Brandt" [ref=e758] [cursor=pointer]:
                - generic [ref=e761]: Watch
              - link "Open the original" [ref=e762] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/webinar-december-30-2025-at-800-am-mountain-ask-peter-2/
                - generic [ref=e766]: Source
          - article "Factor Report Update, September 26 2026, Peter Brandt" [ref=e767]:
            - link "Peter Brandt" [ref=e768] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e771]:
              - generic [ref=e772]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e774]: Unreviewed
            - heading "Factor Report Update, September 26 2026" [level=2] [ref=e775]
            - generic [ref=e776]:
              - generic [ref=e777]: peterlbrandt.com
              - generic "26 Sept 2026, 10:39 UTC" [ref=e778]: 26 Sept
            - generic [ref=e782]:
              - button "Watch Peter Brandt" [ref=e784] [cursor=pointer]:
                - generic [ref=e787]: Watch
              - link "Open the original" [ref=e788] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/factor-report-update-september-26-2026/
                - generic [ref=e792]: Source
          - article "Interview with Cointelegraph, Peter Brandt" [ref=e793]:
            - link "Peter Brandt" [ref=e794] [cursor=pointer]:
              - /url: /profiles/peter-brandt
            - paragraph [ref=e797]:
              - generic [ref=e798]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e800]: Unreviewed
            - heading "Interview with Cointelegraph" [level=2] [ref=e801]
            - generic [ref=e802]:
              - generic [ref=e803]: peterlbrandt.com
              - generic "26 Sept 2026, 00:30 UTC" [ref=e804]: 26 Sept
            - generic [ref=e808]:
              - button "Watch Peter Brandt" [ref=e810] [cursor=pointer]:
                - generic [ref=e813]: Watch
              - link "Open the original" [ref=e814] [cursor=pointer]:
                - /url: https://www.peterlbrandt.com/interview-with-cointelegraph/
                - generic [ref=e818]: Source
          - article "Safety First, Arthur Hayes" [ref=e819]:
            - link "Arthur Hayes" [ref=e820] [cursor=pointer]:
              - /url: /profiles/arthur-hayes
            - paragraph [ref=e823]:
              - generic [ref=e824]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e826]: Unreviewed
            - heading "Safety First" [level=2] [ref=e827]
            - generic [ref=e828]:
              - generic [ref=e829]: cryptohayes.substack.com
              - generic "21 Sept 2026, 23:07 UTC" [ref=e830]: 21 Sept
            - generic [ref=e834]:
              - button "Watch Arthur Hayes" [ref=e836] [cursor=pointer]:
                - generic [ref=e839]: Watch
              - link "Open the original" [ref=e840] [cursor=pointer]:
                - /url: https://cryptohayes.substack.com/p/safety-first
                - generic [ref=e844]: Source
          - article "Atención, Arthur Hayes" [ref=e845]:
            - link "Arthur Hayes" [ref=e846] [cursor=pointer]:
              - /url: /profiles/arthur-hayes
            - paragraph [ref=e849]:
              - generic [ref=e850]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e852]: Unreviewed
            - heading "Atención" [level=2] [ref=e853]
            - generic [ref=e854]:
              - generic [ref=e855]: cryptohayes.substack.com
              - generic "2 Sept 2026, 23:01 UTC" [ref=e856]: 2 Sept
            - generic [ref=e860]:
              - button "Watch Arthur Hayes" [ref=e862] [cursor=pointer]:
                - generic [ref=e865]: Watch
              - link "Open the original" [ref=e866] [cursor=pointer]:
                - /url: https://cryptohayes.substack.com/p/atencion
                - generic [ref=e870]: Source
          - article "Same Same But Different, Arthur Hayes" [ref=e871]:
            - link "Arthur Hayes" [ref=e872] [cursor=pointer]:
              - /url: /profiles/arthur-hayes
            - paragraph [ref=e875]:
              - generic [ref=e876]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e878]: Unreviewed
            - heading "Same Same But Different" [level=2] [ref=e879]
            - generic [ref=e880]:
              - generic [ref=e881]: cryptohayes.substack.com
              - generic "24 Aug 2026, 23:01 UTC" [ref=e882]: 24 Aug
            - generic [ref=e886]:
              - button "Watch Arthur Hayes" [ref=e888] [cursor=pointer]:
                - generic [ref=e891]: Watch
              - link "Open the original" [ref=e892] [cursor=pointer]:
                - /url: https://cryptohayes.substack.com/p/same-same-but-different
                - generic [ref=e896]: Source
          - article "The Book of Genesis, Arthur Hayes" [ref=e897]:
            - link "Arthur Hayes" [ref=e898] [cursor=pointer]:
              - /url: /profiles/arthur-hayes
            - paragraph [ref=e901]:
              - generic [ref=e902]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e904]: Unreviewed
            - heading "The Book of Genesis" [level=2] [ref=e905]
            - generic [ref=e906]:
              - generic [ref=e907]: cryptohayes.substack.com
              - generic "19 Aug 2026, 23:01 UTC" [ref=e908]: 19 Aug
            - generic [ref=e912]:
              - button "Watch Arthur Hayes" [ref=e914] [cursor=pointer]:
                - generic [ref=e917]: Watch
              - link "Open the original" [ref=e918] [cursor=pointer]:
                - /url: https://cryptohayes.substack.com/p/the-book-of-genesis
                - generic [ref=e922]: Source
          - article "Yen-quake, Arthur Hayes" [ref=e923]:
            - link "Arthur Hayes" [ref=e924] [cursor=pointer]:
              - /url: /profiles/arthur-hayes
            - paragraph [ref=e927]:
              - generic [ref=e928]: New
              - generic "Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea." [ref=e930]: Unreviewed
            - heading "Yen-quake" [level=2] [ref=e931]
            - generic [ref=e932]:
              - generic [ref=e933]: cryptohayes.substack.com
              - generic "11 Aug 2026, 01:00 UTC" [ref=e934]: 11 Aug
            - generic [ref=e938]:
              - button "Watch Arthur Hayes" [ref=e940] [cursor=pointer]:
                - generic [ref=e943]: Watch
              - link "Open the original" [ref=e944] [cursor=pointer]:
                - /url: https://cryptohayes.substack.com/p/yen-quake
                - generic [ref=e948]: Source
          - article "End" [ref=e949]:
            - generic [ref=e1019]:
              - button "Back to the top" [ref=e1020] [cursor=pointer]
              - link "Updates" [ref=e1023] [cursor=pointer]:
                - /url: /updates
              - link "How Relay works" [ref=e1027] [cursor=pointer]:
                - /url: /about
              - link "Plans published through Relay" [ref=e1030] [cursor=pointer]:
                - /url: /plans
    - navigation "Main" [ref=e1034]:
      - list [ref=e1035]:
        - listitem [ref=e1036]:
          - link "Discover" [ref=e1037] [cursor=pointer]:
            - /url: /
        - listitem [ref=e1042]:
          - link "Updates" [ref=e1043] [cursor=pointer]:
            - /url: /updates
        - listitem [ref=e1048]:
          - link "Watchlist" [ref=e1049] [cursor=pointer]:
            - /url: /watchlist
        - listitem [ref=e1053]:
          - link "Plans" [ref=e1054] [cursor=pointer]:
            - /url: /plans
        - listitem [ref=e1059]:
          - link "Account" [ref=e1060] [cursor=pointer]:
            - /url: /account
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