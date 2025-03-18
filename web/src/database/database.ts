import { readFileSync, writeFile } from "fs";
import { VerificationEntry } from "./verification-entry";

const dbFilePath = process.env.DB_FILE_PATH || "db.json";

class Database {
  private static instance: Database;
  private entries: VerificationEntry[] = [];

  private constructor() {
    console.log("Database instance created");
    this.fetchFromFS();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async addEntry(entry: VerificationEntry): Promise<void> {
    this.entries.push(entry);
    await this.writeFS();
  }

  public getEntry(email: string): VerificationEntry | undefined {
    return this.entries.findLast((entry) => entry.email === email);
  }

  public clearDB(): void {
    this.entries = [];
    this.writeFS();
  }

  private fetchFromFS() {
    try {
      const data = readFileSync(dbFilePath, "utf-8");
      this.entries = JSON.parse(data);
    } catch (error) {
      console.log(error);
      this.clearDB();
    }
  }

  private writeFS() {
    return new Promise((resolve) => {
      const data = JSON.stringify(this.entries);
      writeFile(dbFilePath, data, resolve);
    });
  }
}

export const database = Database.getInstance();
