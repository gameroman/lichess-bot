import type { Lichess } from "@lichess/api";
import type * as schemas from "@lichess/api/schemas";
import { Stockfish } from "@stockfish/bun";

import type { BotGameStreamEvent } from "./types";

export class Game {
  #client: Lichess;
  #game: schemas.GameEventInfo;
  #gameId: string;
  #myColor?: schemas.GameColor;
  #stockfish: Stockfish;
  #onEnd?: () => void;

  constructor(
    client: Lichess,
    game: schemas.GameEventInfo,
    stockfish: Stockfish,
    onEnd?: () => void,
  ) {
    this.#stockfish = stockfish;
    this.#client = client;
    this.#game = game;
    this.#myColor = game.color;
    this.#gameId = game.gameId;
    this.#onEnd = onEnd;
  }

  public static async start(
    client: Lichess,
    gameEvent: schemas.GameEventInfo,
    onEnd?: () => void,
  ) {
    const stockfish = await Stockfish.start({
      path: process.env.STOCKFISH_PATH,
    });

    return new Game(client, gameEvent, stockfish, onEnd);
  }

  async run() {
    try {
      if (this.#game.isMyTurn) {
        await this.#stockfish.set_fen_position(this.#game.fen!);
        const move = (await this.#stockfish.get_best_move_time(150))!;
        await this.#client.botGameMove({ gameId: this.#gameId, move });
      }

      const res = await this.#client.botGameStream({ gameId: this.#gameId });

      if (res.status === 404) {
        return;
      }

      for await (const event of res.stream) {
        void this.#handleGameEvent(event);
      }
    } finally {
      this.#onEnd?.();
    }
  }

  async #handleGameEvent(event: BotGameStreamEvent) {
    switch (event.type) {
      case "gameState": {
        await this.#handleGameStateEvent(event);
        return;
      }
    }
  }

  async #handleGameStateEvent(gameState: schemas.GameStateEvent) {
    switch (gameState.status) {
      case "started": {
        await this.#handleGamePosition(gameState);
        return;
      }
    }
  }

  async #handleGamePosition(state: schemas.GameStateEvent) {
    const moves = state.moves.split(/\s+/);

    await this.#stockfish.set_fen_position(this.#game.fen!);
    await this.#stockfish.make_moves_from_current_position(moves);

    const isWhiteTurn = moves.length % 2 === 0;
    const turn = isWhiteTurn ? "white" : "black";

    if (turn !== this.#myColor) {
      return;
    }

    const timeRemaining = isWhiteTurn ? state.wtime : state.btime;

    const timeBonus = isWhiteTurn ? state.winc : state.binc;

    const time_to_think = Math.min(
      Math.max(0, timeBonus - 100) + timeRemaining / 300,
      60 * 1000,
    );

    const move = (await this.#stockfish.get_best_move_time(time_to_think))!;

    await this.#client.botGameMove({ gameId: this.#gameId, move });
  }
}
