import type { Lichess } from "@lichess/api";
import type * as schemas from "@lichess/api/schemas";
import { Stockfish } from "@stockfish/bun";

import type { BotGameStreamEvent } from "./types";

export class Game {
  #client: Lichess;
  #game: schemas.GameEventInfo;
  #gameId: string;
  #stockfish!: Stockfish;

  constructor(client: Lichess, game: schemas.GameEventInfo) {
    this.#client = client;
    this.#game = game;
    this.#gameId = game.gameId;
  }

  public async start() {
    this.#stockfish = await Stockfish.start({ path: process.env.STOCKFISH_PATH });

    if (this.#game.isMyTurn) {
      this.#stockfish.set_fen_position(this.#game.fen!);
      const move = (await this.#stockfish.get_best_move_time(150))!;
      await this.#client.botGameMove({ gameId: this.#gameId, move });
    }

    const res = await this.#client.botGameStream({ gameId: this.#gameId });

    if (res.status === 404) {
      return;
    }

    for await (const event of res.stream) {
      this.#handleGameEvent(event);
    }
  }

  #handleGameEvent(event: BotGameStreamEvent) {
    switch (event.type) {
      case "gameState": {
        this.#handleGameStateEvent(event);
        return;
      }
    }
  }

  #handleGameStateEvent(gameState: schemas.GameStateEvent) {
    switch (gameState.status) {
      case "started": {
        this.#handleGamePosition(gameState);
        return;
      }
    }
  }

  async #handleGamePosition(gameState: schemas.GameStateEvent) {
    const moves = gameState.moves.split(/\s+/);

    await this.#stockfish.set_fen_position(this.#game.fen!);
    await this.#stockfish.make_moves_from_current_position(moves);

    const isWhiteTurn = moves.length % 2 === 0;
    const turn = isWhiteTurn ? "white" : "black";

    if (turn !== this.#game.color) {
      return; // Not our turn
    }

    const time_remaining = this.#game.color === "white" ? gameState.wtime : gameState.btime;

    const time_bonus = this.#game.color === "white" ? gameState.winc : gameState.binc;

    const time_to_think = Math.min(Math.max(0, time_bonus - 100) + time_remaining / 300, 60 * 1000);

    const move = (await this.#stockfish.get_best_move_time(time_to_think))!;

    this.#client.botGameMove({ gameId: this.#gameId, move });
  }
}
