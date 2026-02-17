import { Lichess } from "@lichess/api";
import type * as schemas from "@lichess/api/schemas";

import { Game } from "./game";
import type { ApiStreamEvent } from "./types";

export class Computer {
  readonly #client: Lichess;

  constructor() {
    const token = process.env.LICHESS_BOT_TOKEN;
    if (!token) {
      throw new Error("LICHESS_BOT_TOKEN is not set");
    }
    this.#client = new Lichess({ token });
  }

  public async run() {
    const response = await this.#client.apiStreamEvent();
    for await (const event of response.stream) {
      this.#handleEvent(event);
    }
  }

  #handleEvent(event: ApiStreamEvent) {
    switch (event.type) {
      case "challenge": {
        this.#handleChallengeEvent(event);
        return;
      }
      case "gameStart": {
        this.#handleGameStart(event.game);
        return;
      }
    }
  }

  #handleChallengeEvent(event: schemas.ChallengeEvent) {
    const challenge = event.challenge;

    if (event.compat && !event.compat.bot) {
      this.#client.challengeDecline({
        challengeId: challenge.id,
        body: { reason: "tooFast" },
      });
      return;
    }

    if (challenge.variant.key !== "standard") {
      this.#client.challengeDecline({
        challengeId: challenge.id,
        body: { reason: "standard" },
      });
      return;
    }

    if (challenge.timeControl.type !== "clock") {
      this.#client.challengeDecline({
        challengeId: challenge.id,
        body: { reason: "timeControl" },
      });
      return;
    }

    this.#client.challengeAccept({ challengeId: challenge.id });
  }

  #handleGameStart(event_game: schemas.GameEventInfo) {
    new Game(this.#client, event_game).start();
  }
}
