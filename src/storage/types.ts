import type { GameState } from '../domain/types';

export interface SavedGame {
  schemaVersion: 1;
  savedAt: string;
  state: GameState;
}

// Implementation will validate parsed data before restoring it.
export interface GameStorage {
  load(): SavedGame | null;
  save(game: SavedGame): void;
  clear(): void;
}
