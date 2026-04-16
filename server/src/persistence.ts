import { Pool } from "pg";

export interface ScoreDelta {
  name: string;
  points: number;
}

export class Persistence {
  private readonly pool: Pool | null;

  constructor(databaseUrl: string) {
    this.pool = databaseUrl
      ? new Pool({
          connectionString: databaseUrl
        })
      : null;
  }

  get enabled(): boolean {
    return Boolean(this.pool);
  }

  async initialize(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.query("SELECT 1");
  }

  async recordRoundScores(deltas: ScoreDelta[]): Promise<void> {
    if (!this.pool || deltas.length === 0) {
      return;
    }

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      for (const entry of deltas) {
        await client.query(
          `
            INSERT INTO players (name, total_score)
            VALUES ($1, $2)
            ON CONFLICT (name)
            DO UPDATE SET total_score = players.total_score + EXCLUDED.total_score
          `,
          [entry.name, entry.points]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Failed to persist round scores", error);
    } finally {
      client.release();
    }
  }

  async recordGameHistory(roomId: string, winner: string | null): Promise<void> {
    if (!this.pool) {
      return;
    }

    try {
      await this.pool.query(
        `
          INSERT INTO game_history (room_id, winner)
          VALUES ($1, $2)
        `,
        [roomId, winner]
      );
    } catch (error) {
      console.error("Failed to persist game history", error);
    }
  }

  async close(): Promise<void> {
    await this.pool?.end();
  }
}
