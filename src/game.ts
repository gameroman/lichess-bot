import type { Lichess } from "@lichess/api";
import type * as schemas from "@lichess/api/schemas";
import type { BotGameStreamEvent } from "./lib";

// from stockfish import Stockfish

export class Game {
  private client: Lichess;
  private game: schemas.GameEventInfo;
  private gameId: string;

  constructor(client: Lichess, game: schemas.GameEventInfo) {
    this.client = client;
    this.game = game;
    this.gameId = game.gameId;

    // this.stockfish = new Stockfish(process.env.STOCKFISH_PATH)
  }

  public async start() {
    if (this.game.isMyTurn) {
      // this.stockfish.set_fen_position(this.game.fen)
      // move = this.stockfish.get_best_move_time(150)
      // assert move, "Best move not found"
      // this.client.make_bot_move(this.id, move)
    }

    const res = await this.client.botGameStream({ gameId: this.gameId });

    if (res.status === 404) {
      return;
    }

    for await (const event of res.stream) {
      this.handleGameEvent(event);
    }
  }

  private handleGameEvent(event: BotGameStreamEvent) {
    switch (event.type) {
      case "gameState": {
        this.handleGameStateEvent(event);
        return;
      }
    }
  }

  private handleGameStateEvent(gameState: schemas.GameStateEvent) {
    switch (gameState.status) {
      case "started": {
        this.handleGamePosition(gameState);
        return;
      }
    }
  }

  private handleGamePosition(gameState: schemas.GameStateEvent) {
    const moves = gameState.moves.split(/\s+/);
    //
    //         this.stockfish.set_fen_position(this.game.fen)
    //         this.stockfish.make_moves_from_current_position(moves)
    //         move_count = len(moves)
    //         is_white_turn = move_count % 2 == 0
    //         turn = "white" if is_white_turn else "black"
    //         if turn != this.game.color:
    //             return  # Not our turn
    //         time_remaining = (
    //             game_state.wtime if this.game.color == "white" else game_state.btime
    //         )
    //         time_bonus = game_state.winc if this.game.color == "white" else game_state.binc
    //         logger.info(f"Time remaining: {time_remaining}. Time bonus: {time_bonus}")
    //         time_to_think = min(max(0, time_bonus - 100) + time_remaining // 300, 60 * 1000)
    //         move = this.stockfish.get_best_move_time(time_to_think)
    //         assert move, "Best move not found"
    //         logger.info(f"Making move: {move}")
    //         this.client.make_bot_move(this.id, move)
  }
}
