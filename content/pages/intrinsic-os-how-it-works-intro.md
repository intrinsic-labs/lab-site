---
title: How IntrinsicOS works
kicker: Lab report · November 2026
dek: Who decides what, how one piece of work moves from a note to a result, and where the founder sits.
description: "How Intrinsic Labs' agents are organized: who decides what, how work moves from a note to a reviewed result, and what the founder still decides himself."
---

Intrinsic Labs is one founder, Asher, working with AI agents on its engineering and administration. [IntrinsicOS](/products/intrinsic-os) is the runtime: the program that starts those agents, limits them and records what they do. [VISR](/products/visr) is the review desk where Asher decides, mostly from his phone. A manager agent, the Superintendent, runs the company day to day alongside him.

## How a piece of work moves

1. **A note.** Asher writes or dictates a note about a project. A drafting agent turns it into a draft *outcome* (a written result with acceptance criteria, usually a few hours to a few days of agent work), a few small tasks for him, or nothing. A strategist agent also pitches up to three outcomes a week per project.
2. **Approval.** The draft reaches him as a card in VISR. He approves it and picks the agent that will own it, sends feedback for a redraft, or rejects it. The Superintendent can open outcomes too, within the same limits, and the record shows who did. Nothing starts before that.
3. **Building.** On projects in the current pilot, one persistent *project owner* agent runs every outcome of its project; other projects still get one owner per outcome. The owner works on its own copy of the code, on its own branch, and hands pieces to Claude or Codex subagents. Each working session lasts at most two hours, and the owner records a *checkpoint* (what changed, what is next, what it is waiting on) at least every 25 minutes.
4. **Verifying.** The owner runs its checks and the work itself as it builds. Before it asks for review, the automated checks must pass on the exact commit it submits.
5. **Review by the other family.** Owners ask a model from the other family to review their code: Claude's work goes to an OpenAI model, and the reverse. They ask once before Asher judges the direction and again on the exact commit that will merge; work that is mainly a design call skips the first, so he sees it first.
6. **Landing.** Each project states which files its owner may merge and which are Asher's. The owner merges its own pull requests where that rule covers every changed file and the checks pass; the rest waits for him.
7. **Reaching Asher.** The result arrives in VISR: a card per outcome with what changed, screenshots and how it was verified; a question in the project's thread; or a summary of what landed since he last looked. He accepts, parks or sends feedback, which the owner takes into another session.

<VisrShots>
<VisrShot file="deck.webp" first alt="A phone screen showing the VISR deck: a card file at card 3 of 8, and beneath it that card's summary, an owner's finished work asking whether to merge and accept it, with a recommendation.">The deck: one card for each thing waiting on Asher.</VisrShot>
<VisrShot file="decision.webp" alt="A phone screen showing a decision opened in VISR: the question, a recommendation with why and a doubt, and buttons to approve, refuse, send feedback or leave it for later.">A decision: the question, a recommendation and its doubt.</VisrShot>
<VisrShot file="thread.webp" alt="A phone screen showing the thread for one outcome: the owner's checkpoints, an emulator pass and then ready for review, each followed by the Superintendent's note on what it did next.">A thread for one outcome: the owner's checkpoints and what the Superintendent did with each.</VisrShot>
</VisrShots>

Screenshots from the [VISR demo](/visr), which runs on sample cards adapted from the company's own work, with client names changed. Nothing in them is live.

## Who does what

The Superintendent works with a separate conversation, a *thread*, for each matter. Under them, a supervisor program called Guilty Spark starts and stops every session without calling a model. One operations bot, Jefferson, handles mail, calendar and money; other agents reach it only through the Superintendent. An earlier set of three chat bots, for administration, finance and IT, is retired.

The agents come from two model families, Anthropic's Claude and OpenAI's Codex, and which model fills which role is a setting. Select a role for its details.
