import { VerificationEntry } from "./verification-entry";

class Database {
  private static instance: Database;
  private entries: VerificationEntry[] = [];

  private constructor() {
    console.log("Database instance created");
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async addEntry(entry: VerificationEntry): Promise<void> {
    this.entries.push(entry);
  }

  public getEntry(email: string): VerificationEntry | undefined {
    return this.entries.findLast((entry) => entry.email === email);
  }

  public clearDB(): void {
    this.entries = [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private writeFS() {
    return Promise.resolve();
  }
}

export const database = Database.getInstance();
