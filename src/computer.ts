import { Lichess } from "@lichess/api";
import type * as schemas from "@lichess/api/schemas";

import { Game } from "./game";
import type { ApiStreamEvent } from "./types";

const MAX_CONCURRENT_GAMES = 5;

export class Computer {
  readonly #client: Lichess;
  #activeGames = 0;

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
      await this.#handleEvent(event);
    }
  }

  async #handleEvent(event: ApiStreamEvent) {
    switch (event.type) {
      case "challenge": {
        await this.#handleChallengeEvent(event);
        return;
      }
      case "gameStart": {
        void this.#handleGameStart(event.game);
        return;
      }
    }
  }

  async #handleChallengeEvent(event: schemas.ChallengeEvent) {
    const challenge = event.challenge;

    if (this.#activeGames >= MAX_CONCURRENT_GAMES) {
      await this.#client.challengeDecline({
        challengeId: challenge.id,
        body: { reason: "later" },
      });
      return;
    }

    if (event.compat && !event.compat.bot) {
      await this.#client.challengeDecline({
        challengeId: challenge.id,
        body: { reason: "tooFast" },
      });
      return;
    }

    if (challenge.variant.key !== "standard") {
      await this.#client.challengeDecline({
        challengeId: challenge.id,
        body: { reason: "standard" },
      });
      return;
    }

    if (challenge.timeControl.type !== "clock") {
      await this.#client.challengeDecline({
        challengeId: challenge.id,
        body: { reason: "timeControl" },
      });
      return;
    }

    await this.#client.challengeAccept({ challengeId: challenge.id });
  }

  async #handleGameStart(gameEvent: schemas.GameEventInfo) {
    this.#activeGames++;
    const game = await Game.start(this.#client, gameEvent, () => {
      this.#activeGames--;
    });
    void game.run();
  }
}
