import type { Lichess } from "@lichess/api";

type StreamResult<T> = T extends {
  stream: AsyncGenerator<infer Y, unknown, unknown>;
}
  ? Y
  : never;

type StreamReturn<K extends keyof Lichess> = StreamResult<
  Awaited<ReturnType<Lichess[K]>>
>;

type LichessStreamKey = {
  [K in keyof Lichess]: StreamReturn<K> extends never ? never : K;
}[keyof Lichess];

type LichessStreamEvent<K extends LichessStreamKey> = StreamReturn<K>;

export type ApiStreamEvent = LichessStreamEvent<"apiStreamEvent">;
export type BotGameStreamEvent = LichessStreamEvent<"botGameStream">;
