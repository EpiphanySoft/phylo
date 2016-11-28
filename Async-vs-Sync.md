# Asynchronous vs Synchronous

There is considerable discussion regarding "when" or even, "if" it is acceptable to use
synchronous API's when developing for Node.js. As is often the case, it is easier to
ask the inverse question and "back in" to the answer we seek:
 
<blockquote><i>
When is it <b>unacceptable</b> to use synchronous API's?
</i></blockquote>

The reason synchronous API's get a bad rap is because they block the Node.js "event
loop". The event loop is the core dispatcher that allows all the normal, asynchronous
things to get their chance to execute. If some synchronous chunk of code is hogging
the single thread provided by Node, no asynchronously delivered callbacks can be
dispatched.

So the question becomes:

<br><blockquote><i>
What asynchronous callbacks will this synchronous code block?
</i></blockquote>

And that is really The Question here. If you are writing a server, probably the
most important callbacks would be those of the server module!

However, if you are writing a command-line tool, there is really no code running in
the background unless you initiated it. Which means there is really no harm in making
synchronous calls in this case.

But some would put the question on its head and ask instead:

<br><blockquote><i>
If asynchronous code is always OK, why not stick with it in all cases?
</i></blockquote>

If there were no costs associated with purely asynchronous code vs the synchronous
work-a-like, maybe that approach would make sense. Developers experienced with the
complexity of asynchronous code should take heart and some relief with a good quote:

<br><blockquote>
"A foolish consistency is the hobgoblin of little minds,<br>
adored by little statesmen and philosophers and divines"

-- Emerson [Self-Reliance](http://www.emersoncentral.com/selfreliance.htm)
</blockquote>

The upcoming `async` and `await` language features will greatly improve this situation,
but even with them, asynchronous code will be more complex then the synchronous
equivalent.

So, if you are providing a library (like Phylo), then what? Since a library author
cannot know if their library will be used in a server context or a command-line tool,
such libraries (as with Node's own `fs` module) provide both forms.

When using Phylo, it is best to understand your own context and decide if your life
would be simpler, easier and more productive by using synchronous API's.

If your context does not prevent it, they are certainly the way to go!
