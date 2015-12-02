*Proof of concept / work in progress, has glaring issues*

# infinite-monkey-incremental ![monkey](public/img/monkey.gif)

- Live demo: <https://www.danneu.com/infinite-monkey-incremental/>

A toy project I'm working on to learn [Elm](http://elm-lang.org/).

> The [infinite monkey theorem][theorem] states that a monkey hitting keys at
> random on a typewriter for an infinite amount of time will almost surely type a
> given text, such as the complete works of William Shakespeare.

It's an [incremental game][inc] where you buy monkeys that type random
letters into typewriters. As they accidentally spell words, you win cash
that you can use to upgrade or buy more monkeys.

![screenshot][screenshot]

[theorem]: https://en.wikipedia.org/wiki/Infinite_monkey_theorem
[inc]: https://en.wikipedia.org/wiki/Incremental_game
[screenshot]: https://dl.dropboxusercontent.com/spa/quq37nq1583x0lf/23ikl59z.png

## TODO

- Consider basing speed price on total speed sum instead of on a per-chimp basis.
- Come up with actual, deliberate price growth formulas that scale well.
- Auto-load/-unload state from localStorage.
- Automate cache-busting fingerprinting on index.html and elm.js during deploy step.

## Notes to self

- Always ensure that player can afford a given upgrade inside Game's
`update` function. If not, then enqueuing multiple actions (like spamming
button clicks while the UI hangs) will always result in the player purchasing
upgrades they couldn't otherwise afford which will also result in a negative
cash balance.

## Build

### For development:

Start local server:

    python -m SimpleHTTPServer 5000

Build index.html and elm.js:

    npm run build

Navigate to <http://localhost:5000>.

### For production:

    git checkout --orphan gh-pages
    npm run build
    rm .gitignore
    git add index.html public elm.js
    git commit -m 'Build'
    git push origin
