import { Lichess } from "@lichess/api";

type AsyncIteratorValue<T extends AsyncGenerator> = Exclude<
  Awaited<ReturnType<T["next"]>>["value"],
  void
>;

type LichessStreamReturnType<
  T extends keyof Lichess & `${string}Stream${string}`
> = Awaited<ReturnType<Lichess[T]>> extends {
  stream?: infer U extends AsyncGenerator;
}
  ? AsyncIteratorValue<U>
  : never;

export type ApiStreamEvent = LichessStreamReturnType<"apiStreamEvent">;
export type BotGameStreamEvent = LichessStreamReturnType<"botGameStream">;
