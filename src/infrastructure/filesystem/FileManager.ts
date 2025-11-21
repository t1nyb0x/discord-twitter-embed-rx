import fs from "node:fs/promises";
import path from "node:path";
import { IFileManager } from "@/adapters/discord/MessageHandler";

/**
 * ファイルシステム操作を担当
 */
export class FileManager implements IFileManager {
  constructor(private readonly baseTmpDir: string) {}

  /**
   * 一時ディレクトリを作成
   * @returns 作成したディレクトリのパス
   */
  async createTempDirectory(): Promise<string> {
    try {
      await fs.mkdir(this.baseTmpDir, { recursive: true });
      console.log(`Temporary directory created: ${this.baseTmpDir}`);
      return this.baseTmpDir;
    } catch (error) {
      console.error(`Failed to create temp directory: ${error}`);
      throw error;
    }
  }

  /**
   * 指定パスにディレクトリを作成
   * @param dirPath ディレクトリパス
   * @returns 作成したディレクトリのパス
   */
  async createDirectory(dirPath: string): Promise<string> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`Directory created: ${dirPath}`);
      return dirPath;
    } catch (error) {
      console.error(`Failed to create directory: ${error}`);
      throw error;
    }
  }

  /**
   * 一時ディレクトリを削除
   * @param dir ディレクトリパス
   */
  async removeTempDirectory(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true });
      console.log(`Temporary directory removed: ${dir}`);
    } catch (error) {
      console.error(`Failed to remove temp directory: ${error}`);
      // ディレクトリ削除の失敗は致命的ではないのでエラーをスローしない
    }
  }

  /**
   * ディレクトリ内のファイル一覧を取得
   * @param dir ディレクトリパス
   * @returns ファイル名の配列
   */
  async listFiles(dir: string): Promise<string[]> {
    try {
      const files = await fs.readdir(dir);
      return files;
    } catch (error) {
      console.error(`Failed to list files in directory: ${error}`);
      return [];
    }
  }

  /**
   * ファイルが存在するか確認
   * @param filePath ファイルパス
   * @returns 存在する場合true
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ファイルのフルパスを取得
   * @param dir ディレクトリパス
   * @param filename ファイル名
   * @returns フルパス
   */
  getFullPath(dir: string, filename: string): string {
    return path.join(dir, filename);
  }
}
