import { Lichess } from "@lichess/api";
import type * as schemas from "@lichess/api/schemas";

import { Game } from "./game";
import type { ApiStreamEvent } from "./lib";

export class Computer {
  private client: Lichess;

  constructor() {
    const token = process.env.LICHESS_TOKEN;
    if (!token) {
      throw new Error("LICHESS_TOKEN is not set");
    }
    this.client = new Lichess({ token });
  }

  public async run() {
    const response = await this.client.apiStreamEvent();
    for await (const event of response.stream) {
      this.handleEvent(event);
    }
  }

  private handleEvent(event: ApiStreamEvent) {
    switch (event.type) {
      case "challenge": {
        this.handleChallengeEvent(event);
        return;
      }
      case "gameStart": {
        this.handleGameStart(event.game);
        return;
      }
    }
  }

  private handleChallengeEvent(event: schemas.ChallengeEvent) {
    const challenge = event.challenge;

    if (event.compat && !event.compat.bot) {
      this.client.challengeDecline({
        challengeId: challenge.id,
        body: { reason: "tooFast" },
      });
      return;
    }

    if (challenge.variant.key !== "standard") {
      this.client.challengeDecline({
        challengeId: challenge.id,
        body: { reason: "standard" },
      });
      return;
    }

    if (challenge.timeControl.type !== "clock") {
      this.client.challengeDecline({
        challengeId: challenge.id,
        body: { reason: "timeControl" },
      });
      return;
    }

    this.client.challengeAccept({ challengeId: challenge.id });
  }

  private handleGameStart(event_game: schemas.GameEventInfo) {
    new Game(this.client, event_game).start();
  }
}
